import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { EMAIL_RE, requiredString } from '../../utils/validate';
import * as staffService from './staff.service';

function parseRole(value: unknown): 'admin' | 'guard' {
  if (value === undefined) return 'guard';
  if (value === 'admin' || value === 'guard') return value;
  throw new HttpError(400, "role must be 'admin' or 'guard'");
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = requiredString(body.email, 'email');
  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, 'email is invalid');
  }
  const password = requiredString(body.password, 'password');
  if (password.length < 8) {
    throw new HttpError(400, 'password must be at least 8 characters');
  }

  const staff = await staffService.createStaff(req, {
    name: requiredString(body.name, 'name'),
    email,
    phone: requiredString(body.phone, 'phone'),
    role: parseRole(body.role),
    password,
  });
  res.status(201).json(staff);
}

export async function list(req: Request, res: Response): Promise<void> {
  const { role } = req.query as { role?: string };
  const staff = await staffService.listStaff(req, { role });
  res.json(staff);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // Whitelist — schoolId / status / passwordHash can never be changed here.
  const updates: staffService.UpdateStaffInput = {};
  if (body.name !== undefined) updates.name = requiredString(body.name, 'name');
  if (body.email !== undefined) {
    const email = requiredString(body.email, 'email');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'email is invalid');
    updates.email = email;
  }
  if (body.phone !== undefined) updates.phone = requiredString(body.phone, 'phone');
  if (body.role !== undefined) updates.role = parseRole(body.role);
  if (body.password !== undefined) {
    const password = requiredString(body.password, 'password');
    if (password.length < 8) throw new HttpError(400, 'password must be at least 8 characters');
    updates.password = password;
  }
  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, 'no updatable fields provided');
  }

  const staff = await staffService.updateStaff(req, req.params.staffId, updates);
  if (!staff) {
    throw new HttpError(404, 'staff member not found');
  }
  res.json(staff);
}

export async function deactivate(req: Request, res: Response): Promise<void> {
  const staff = await staffService.deactivateStaff(req, req.params.staffId);
  if (!staff) {
    throw new HttpError(404, 'staff member not found');
  }
  res.json(staff);
}