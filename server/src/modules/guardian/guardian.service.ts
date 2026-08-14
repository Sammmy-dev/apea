import crypto from 'node:crypto';
import type { Request } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { withTenantScope } from '../../middleware/tenantScope';
import type { BulkResult } from '../../types/bulk';
import { hashPassword } from '../auth/auth.service';
import { GuardianModel, type Guardian } from './guardian.model';

const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface GuardianUpdates {
  name?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
}

export interface GuardianCsvRow {
  name?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
}

function hashClaimToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Claim-token flow: a random token is generated, only its SHA-256 hash is
 * stored (with a 7-day expiry), and the plaintext is returned exactly once
 * (admin shares it with the guardian, who uses it at /guardians/activate).
 */
function generateClaimToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashClaimToken(token),
    expiresAt: new Date(Date.now() + CLAIM_TOKEN_TTL_MS),
  };
}

export async function listGuardians(req: Request) {
  return withTenantScope(GuardianModel.find(), req);
}

/**
 * Creates a guardian in the caller's organization in `invited` status.
 * No password is set — activation happens via the returned claim token.
 */
export async function createGuardian(
  req: Request,
  data: { name: string; email: string; phone: string; photoUrl?: string },
): Promise<{ guardian: Guardian; claimToken: string }> {
  const { token, tokenHash, expiresAt } = generateClaimToken();
  const guardian = await GuardianModel.create({
    ...data,
    organizationId: req.tenant!.organizationId,
    status: 'invited',
    claimTokenHash: tokenHash,
    claimTokenExpiresAt: expiresAt,
  });
  return { guardian, claimToken: token };
}

export async function getGuardian(req: Request, guardianId: string) {
  return withTenantScope(GuardianModel.findById(guardianId), req);
}

export async function updateGuardian(req: Request, guardianId: string, updates: GuardianUpdates) {
  return withTenantScope(
    GuardianModel.findByIdAndUpdate(guardianId, updates, { new: true, runValidators: true }),
    req,
  );
}

export async function deleteGuardian(req: Request, guardianId: string) {
  return withTenantScope(GuardianModel.findByIdAndDelete(guardianId), req);
}

type GuardianRowValidation =
  | { data: { name: string; email: string; phone: string; photoUrl?: string } }
  | { error: string };

function validateGuardianRow(row: GuardianCsvRow): GuardianRowValidation {
  const name = row.name?.trim();
  const email = row.email?.trim().toLowerCase();
  const phone = row.phone?.trim();

  if (!name) return { error: 'name is required' };
  if (!email) return { error: 'email is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'email is invalid' };
  if (!phone) return { error: 'phone is required' };

  return { data: { name, email, phone, photoUrl: row.photoUrl?.trim() || undefined } };
}

/**
 * Bulk-creates guardians from parsed CSV rows. Rows are validated and
 * inserted individually (duplicate emails within the file are rejected, and
 * the org-scoped unique index catches cross-import duplicates). Every
 * successful guardian gets a claim token for the activation flow, returned
 * in the per-row report.
 */
export async function bulkCreateGuardians(
  req: Request,
  rows: GuardianCsvRow[],
): Promise<BulkResult<{ id: string; claimToken: string }>[]> {
  const results: BulkResult<{ id: string; claimToken: string }>[] = [];
  const seenEmails = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2; // 1-based + header line

    const validation = validateGuardianRow(row);
    if ('error' in validation) {
      results.push({ row: rowNumber, status: 'error', error: validation.error });
      continue;
    }

    const email = validation.data.email;
    if (seenEmails.has(email)) {
      results.push({ row: rowNumber, status: 'error', error: 'duplicate email within the file' });
      continue;
    }
    seenEmails.add(email);

    try {
      const { guardian, claimToken } = await createGuardian(req, validation.data);
      results.push({
        row: rowNumber,
        status: 'ok',
        data: { id: guardian._id.toString(), claimToken },
      });
    } catch (err) {
      results.push({
        row: rowNumber,
        status: 'error',
        error: `could not save: ${err instanceof Error ? err.message : 'unknown error'}`,
      });
    }
  }

  return results;
}

/**
 * Activation: exchanges a claim token for a real password. The token is
 * hashed in the DB, single-use, and expires after 7 days.
 */
export async function activateGuardian(claimToken: string, password: string): Promise<{ id: string; name: string; email: string }> {
  const tokenHash = hashClaimToken(claimToken);
  const guardian = await GuardianModel.findOne({ claimTokenHash: tokenHash }).select('+claimTokenHash');

  if (!guardian) {
    throw new HttpError(400, 'invalid claim token');
  }
  if (guardian.claimTokenExpiresAt && guardian.claimTokenExpiresAt < new Date()) {
    throw new HttpError(400, 'claim token has expired — contact your school');
  }
  if (guardian.status !== 'invited') {
    throw new HttpError(400, 'account is already activated');
  }

  const passwordHash = await hashPassword(password);
  guardian.passwordHash = passwordHash;
  guardian.status = 'active';
  guardian.claimTokenHash = undefined;
  guardian.claimTokenExpiresAt = undefined;
  await guardian.save();

  return { id: guardian._id.toString(), name: guardian.name, email: guardian.email };
}