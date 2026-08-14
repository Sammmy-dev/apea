import crypto from 'node:crypto';
import type { Request } from 'express';
import { ForbiddenError, HttpError } from '../../middleware/errorHandler';
import { withTenantScope } from '../../middleware/tenantScope';
import { AuthorizedPersonModel } from '../authorizedPerson/authorizedPerson.model';
import { GuardianStudentLinkModel } from '../guardianStudentLink/guardianStudentLink.model';
import {
  generateFallbackCode,
  hashFallbackCode,
  issueQrTokenForLink,
  signQrToken,
} from './qrToken.service';
import { AuthorizationLinkModel, type AuthorizationLinkType } from './authorizationLink.model';

export interface GrantInput {
  studentId: string;
  authorizedPersonId: string;
  type: AuthorizationLinkType;
}

/**
 * QR token: a random payload whose SHA-256 is stored in `qrTokenHash`.
 * The plaintext is returned exactly once to the granting guardian (it is
 * what gets embedded in the authorized person's QR / fallback code later).
 */
function generateQrToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(24).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

/**
 * Guardian grants a pickup authorization (PRD §7.3). The requester must be
 * an active guardian of the student (via an active GuardianStudentLink) and
 * the authorized person must belong to the guardian's organization.
 *
 * Daily grants are pinned to the current calendar day
 * (validFrom = 00:00:00, validUntil = 23:59:59.999).
 */
export async function grantAuthorization(req: Request, input: GrantInput) {
  const guardianId = req.user!.id;

  const studentLink = await GuardianStudentLinkModel.findOne({
    guardianId,
    studentId: input.studentId,
    status: 'active',
  });
  if (!studentLink) {
    throw new ForbiddenError('you are not an active guardian of this student');
  }

  const person = await withTenantScope(AuthorizedPersonModel.findById(input.authorizedPersonId), req);
  if (!person) {
    throw new HttpError(404, 'authorized person not found in this organization');
  }

  const existing = await AuthorizationLinkModel.findOne({
    studentId: input.studentId,
    authorizedPersonId: input.authorizedPersonId,
    grantedByGuardianId: guardianId,
    status: 'active',
  });
  if (existing) {
    throw new HttpError(400, 'an active authorization already exists for this student and person');
  }

  const now = new Date();
  let validFrom = now;
  let validUntil: Date | null = null;

  if (input.type === 'daily') {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    validFrom = startOfDay;
    validUntil = endOfDay;
  }

  const { token, tokenHash } = generateQrToken();
  const fallbackCode = generateFallbackCode();
  const link = await AuthorizationLinkModel.create({
    studentId: input.studentId,
    authorizedPersonId: input.authorizedPersonId,
    grantedByGuardianId: guardianId,
    type: input.type,
    validFrom,
    validUntil,
    status: 'active',
    qrTokenHash: tokenHash,
    fallbackCodeHash: hashFallbackCode(fallbackCode),
  });

  return { link, qrToken: token, fallbackCode };
}

/**
 * Digital ID payload for an authorization (guardian-owner only, matching
 * self-service revoke): a freshly signed QR token — with rolling short
 * expiry for standing links — plus a freshly generated 6-digit fallback
 * code. The code's plaintext is returned once; only its hash is persisted.
 */
export async function getDigitalId(req: Request, linkId: string) {
  const link = await AuthorizationLinkModel.findById(linkId);
  if (!link) {
    return null;
  }
  if (link.grantedByGuardianId.toString() !== req.user!.id.toString()) {
    throw new ForbiddenError('you can only view your own authorizations');
  }

  // A daily link whose day has ended must surface as expired, not active.
  await expireOverdueLinks();

  const fresh = await AuthorizationLinkModel.findById(linkId);
  if (!fresh || fresh.status !== 'active') {
    throw new HttpError(400, `authorization is ${fresh?.status ?? 'not found'}`);
  }

  const payload = issueQrTokenForLink(fresh);
  const qrToken = signQrToken(payload);
  const fallbackCode = generateFallbackCode();

  fresh.fallbackCodeHash = hashFallbackCode(fallbackCode);
  await fresh.save();

  return {
    qrToken,
    fallbackCode,
    expiresAt: new Date(payload.exp),
  };
}

/** Lists the calling guardian's own authorizations (optionally per student). */
export async function listMyAuthorizations(req: Request, filter: { studentId?: string }) {
  // Checked-on-read expiry: flip overdue daily links before returning data.
  await expireOverdueLinks();

  if (filter.studentId) {
    const studentLink = await GuardianStudentLinkModel.findOne({
      guardianId: req.user!.id,
      studentId: filter.studentId,
      status: 'active',
    });
    if (!studentLink) {
      throw new HttpError(404, 'student not found among your children');
    }
  }

  const query: Record<string, unknown> = { grantedByGuardianId: req.user!.id };
  if (filter.studentId) {
    query.studentId = filter.studentId;
  }

  return AuthorizationLinkModel.find(query)
    .sort({ createdAt: -1 })
    .populate('studentId', 'firstName lastName classGrade')
    .populate('authorizedPersonId', 'name phone photoUrl');
}

/**
 * Self-service revocation: only the guardian who granted the link
 * (grantedByGuardianId === req.user.id) may revoke it.
 */
export async function revokeMyAuthorization(req: Request, linkId: string) {
  const link = await AuthorizationLinkModel.findById(linkId);
  if (!link) {
    return null;
  }
  if (link.grantedByGuardianId.toString() !== req.user!.id.toString()) {
    throw new ForbiddenError('you can only revoke authorizations you granted');
  }
  if (link.status === 'revoked') {
    throw new HttpError(400, 'authorization is already revoked');
  }

  link.status = 'revoked';
  link.revokedAt = new Date();
  await link.save();
  return link;
}

/**
 * Flips overdue daily authorizations to `expired`:
 *   type=daily, status=active, validUntil < now  →  status=expired
 * Returns the number of links updated. Called on every guardian read of the
 * links collection (checked-on-read) and on an hourly sweep from server.ts.
 */
export async function expireOverdueLinks(): Promise<number> {
  const result = await AuthorizationLinkModel.updateMany(
    { type: 'daily', status: 'active', validUntil: { $lt: new Date() } },
    { $set: { status: 'expired' } },
  );
  return result.modifiedCount;
}