import type { Request } from 'express';
import type { HydratedDocument } from 'mongoose';
import { withTenantScope } from '../../middleware/tenantScope';
import {
  AuthorizationLinkModel,
  type AuthorizationLink,
} from '../authorizationLink/authorizationLink.model';
import { expireOverdueLinks } from '../authorizationLink/authorizationLink.service';
import {
  hashFallbackCode,
  verifyQrToken,
  type QrTokenPayload,
} from '../authorizationLink/qrToken.service';
import { AuthorizedPersonModel } from '../authorizedPerson/authorizedPerson.model';
import { GuardianModel } from '../guardian/guardian.model';
import {
  GuardianStudentLinkModel,
  type GuardianStudentLink,
} from '../guardianStudentLink/guardianStudentLink.model';
import { StudentModel } from '../student/student.model';

/**
 * Live gate verification (PRD §7.5). Never trusts client-side state: the
 * QR signature and the fallback-code hash are both re-checked server-side,
 * then the underlying link is re-read from the DB so a revocation is
 * effective immediately. Both code paths resolve to a structured result the
 * guard UI can render (side-by-side photo comparison, APPROVED/DENIED).
 *
 * Tenant safety: AuthorizationLink and GuardianStudentLink carry no tenant
 * fields (see tenant scope doc), so the *student* is always re-resolved with
 * withTenantScope against the scanning staff member's school. A token for a
 * student in another school (or another org) resolves to DENIED without
 * leaking any foreign data.
 *
 * Guardian self-pickup: the scanned identity may be a guardian's digital ID
 * (issued from a GuardianStudentLink); that link is checked directly — no
 * AuthorizationLink is involved, matching PRD §7.3 (guardian's own pickup
 * right is only revocable by a school admin).
 */

export interface VerifyResult {
  status: 'APPROVED' | 'DENIED';
  /** Human-readable reason for DENIED results. */
  reason?: string;
  method: 'qr' | 'code';
  student?: { id: string; firstName: string; lastName: string; photoUrl?: string; classGrade?: string };
  pickupPerson?: { id: string; name: string; photoUrl?: string; role: 'authorized_person' | 'guardian' };
  /** Relationship label (GuardianStudentLink only; authorized persons have none). */
  relationship?: string;
  authorization?: { id: string; type: 'standing' | 'daily' | 'guardian_self'; validUntil?: Date };
}

function denied(reason: string, method: VerifyResult['method']): VerifyResult {
  return { status: 'DENIED', reason, method };
}

function approved(
  method: VerifyResult['method'],
  student: NonNullable<VerifyResult['student']>,
  pickupPerson: NonNullable<VerifyResult['pickupPerson']>,
  relationship: string | undefined,
  authorization: NonNullable<VerifyResult['authorization']>,
): VerifyResult {
  return { status: 'APPROVED', method, student, pickupPerson, relationship, authorization };
}

async function resolveStudentInSchool(req: Request, studentId: string) {
  return withTenantScope(StudentModel.findById(studentId), req);
}

/** Shared post-resolution validation for an AuthorizationLink. */
async function verifyAuthorizationLink(
  req: Request,
  link: HydratedDocument<AuthorizationLink>,
  claimed: Pick<QrTokenPayload, 'studentId' | 'authorizedPersonId'>,
  method: VerifyResult['method'],
): Promise<VerifyResult> {
  if (
    String(link.studentId) !== claimed.studentId ||
    String(link.authorizedPersonId) !== claimed.authorizedPersonId
  ) {
    return denied('token does not match the authorization', method);
  }

  const student = await resolveStudentInSchool(req, claimed.studentId);
  if (!student) {
    return denied('student not found in your school', method);
  }
  if (link.status !== 'active') {
    return denied(`authorization is ${link.status}`, method);
  }
  const now = Date.now();
  if (link.validFrom.getTime() > now) {
    return denied('authorization is not yet valid', method);
  }
  if (link.validUntil && link.validUntil.getTime() < now) {
    return denied('authorization has expired', method);
  }

  const person = await withTenantScope(AuthorizedPersonModel.findById(link.authorizedPersonId), req);
  if (!person) {
    return denied('authorized person record not found', method);
  }

  return approved(
    method,
    {
      id: student._id.toString(),
      firstName: student.firstName,
      lastName: student.lastName,
      photoUrl: student.photoUrl,
      classGrade: student.classGrade,
    },
    {
      id: person._id.toString(),
      name: person.name,
      photoUrl: person.photoUrl,
      role: 'authorized_person',
    },
    undefined,
    { id: link._id.toString(), type: link.type, validUntil: link.validUntil ?? undefined },
  );
}

/** Shared validation for a GuardianStudentLink (guardian picking up their own child). */
async function verifyGuardianLink(
  req: Request,
  link: HydratedDocument<GuardianStudentLink>,
  claimed: Pick<QrTokenPayload, 'studentId' | 'authorizedPersonId'>,
  method: VerifyResult['method'],
): Promise<VerifyResult> {
  if (
    String(link.studentId) !== claimed.studentId ||
    String(link.guardianId) !== claimed.authorizedPersonId
  ) {
    return denied('token does not match the guardian link', method);
  }

  const student = await resolveStudentInSchool(req, claimed.studentId);
  if (!student) {
    return denied('student not found in your school', method);
  }
  if (link.status !== 'active') {
    return denied('guardian link is revoked', method);
  }

  const guardian = await withTenantScope(GuardianModel.findById(link.guardianId), req);
  if (!guardian) {
    return denied('guardian record not found', method);
  }

  return approved(
    method,
    {
      id: student._id.toString(),
      firstName: student.firstName,
      lastName: student.lastName,
      photoUrl: student.photoUrl,
      classGrade: student.classGrade,
    },
    {
      id: guardian._id.toString(),
      name: guardian.name,
      photoUrl: guardian.photoUrl,
      role: 'guardian',
    },
    link.relationship,
    { id: link._id.toString(), type: 'guardian_self' },
  );
}

/** Verifies a scanned QR token (HMAC signature + live DB status). */
export async function verifyByToken(req: Request, token: string): Promise<VerifyResult> {
  const payload = verifyQrToken(token);
  if (!payload) {
    return denied('invalid or expired QR token', 'qr');
  }
  await expireOverdueLinks();

  const link = await AuthorizationLinkModel.findById(payload.linkId);
  if (link) {
    return verifyAuthorizationLink(req, link, payload, 'qr');
  }

  const guardianLink = await GuardianStudentLinkModel.findById(payload.linkId);
  if (guardianLink) {
    return verifyGuardianLink(req, guardianLink, payload, 'qr');
  }

  return denied('authorization not found', 'qr');
}

/** Verifies a manually entered 6-digit fallback code (hash lookup). */
export async function verifyByCode(req: Request, code: string): Promise<VerifyResult> {
  if (!/^\d{6}$/.test(code)) {
    return denied('invalid code format', 'code');
  }
  const hash = hashFallbackCode(code);
  await expireOverdueLinks();

  const link = await AuthorizationLinkModel.findOne({ fallbackCodeHash: hash }).select(
    '+fallbackCodeHash',
  );
  if (link) {
    return verifyAuthorizationLink(
      req,
      link,
      {
        studentId: String(link.studentId),
        authorizedPersonId: String(link.authorizedPersonId),
      },
      'code',
    );
  }

  const guardianLink = await GuardianStudentLinkModel.findOne({ fallbackCodeHash: hash }).select(
    '+fallbackCodeHash',
  );
  if (guardianLink) {
    return verifyGuardianLink(
      req,
      guardianLink,
      {
        studentId: String(guardianLink.studentId),
        authorizedPersonId: String(guardianLink.guardianId),
      },
      'code',
    );
  }

  return denied('code not found', 'code');
}

/** Convenience wrapper for a single scan input (token XOR code). */
export async function verifyScan(req: Request, input: { token?: string; code?: string }) {
  return input.token ? verifyByToken(req, input.token) : verifyByCode(req, input.code!);
}