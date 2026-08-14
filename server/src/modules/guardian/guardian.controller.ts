import { parse } from 'csv-parse/sync';
import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { EMAIL_RE, optionalString, requiredString } from '../../utils/validate';
import * as guardianService from './guardian.service';

const REQUIRED_HEADERS = ['name', 'email', 'phone'];

function parseCsvBody(req: Request): Record<string, string>[] {
  const csv = req.body;
  if (typeof csv !== 'string' || !csv.trim()) {
    throw new HttpError(400, 'request body must be a non-empty CSV string');
  }

  let rows: Record<string, string>[];
  try {
    rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch {
    throw new HttpError(400, 'could not parse CSV — check quoting and column count');
  }

  if (rows.length === 0) {
    throw new HttpError(400, 'CSV contains no data rows');
  }

  for (const header of REQUIRED_HEADERS) {
    if (!(header in rows[0])) {
      throw new HttpError(400, `CSV is missing required column: ${header}`);
    }
  }

  return rows;
}

export async function list(req: Request, res: Response): Promise<void> {
  const guardians = await guardianService.listGuardians(req);
  res.json(guardians);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = requiredString(body.email, 'email');
  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, 'email is invalid');
  }
  const result = await guardianService.createGuardian(req, {
    name: requiredString(body.name, 'name'),
    email,
    phone: requiredString(body.phone, 'phone'),
    photoUrl: optionalString(body.photoUrl),
  });
  res.status(201).json({ guardian: result.guardian, claimToken: result.claimToken });
}

export async function bulk(req: Request, res: Response): Promise<void> {
  const rows = parseCsvBody(req);
  const results = await guardianService.bulkCreateGuardians(req, rows);

  res.status(201).json({
    total: results.length,
    succeeded: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'error').length,
    results,
  });
}

export async function get(req: Request, res: Response): Promise<void> {
  const guardian = await guardianService.getGuardian(req, req.params.guardianId);
  if (!guardian) {
    throw new HttpError(404, 'guardian not found');
  }
  res.json(guardian);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // Whitelist — organizationId / status / claim fields can never be changed here.
  const updates: guardianService.GuardianUpdates = {};
  if (body.name !== undefined) updates.name = requiredString(body.name, 'name');
  if (body.email !== undefined) {
    const email = requiredString(body.email, 'email');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'email is invalid');
    updates.email = email;
  }
  if (body.phone !== undefined) updates.phone = requiredString(body.phone, 'phone');
  if (body.photoUrl !== undefined) updates.photoUrl = optionalString(body.photoUrl);
  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, 'no updatable fields provided');
  }

  const guardian = await guardianService.updateGuardian(req, req.params.guardianId, updates);
  if (!guardian) {
    throw new HttpError(404, 'guardian not found');
  }
  res.json(guardian);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const guardian = await guardianService.deleteGuardian(req, req.params.guardianId);
  if (!guardian) {
    throw new HttpError(404, 'guardian not found');
  }
  res.status(204).end();
}

/** Public: guardian claims an invited account with their claim token + a password. */
export async function activate(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const claimToken = requiredString(body.claimToken, 'claimToken');
  const password = requiredString(body.password, 'password');
  if (password.length < 8) {
    throw new HttpError(400, 'password must be at least 8 characters');
  }

  const activated = await guardianService.activateGuardian(claimToken, password);
  res.json(activated);
}