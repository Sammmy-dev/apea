import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import * as organizationService from './organization.service';

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} is required`);
  }
  return value.trim();
}

export async function onboard(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const school = (body.school ?? {}) as Record<string, unknown>;
  const admin = (body.admin ?? {}) as Record<string, unknown>;

  const name = requiredString(body.name, 'organization name');
  const schoolName = requiredString(school.name, 'school name');
  const adminName = requiredString(admin.name, 'admin name');
  const adminEmail = requiredString(admin.email, 'admin email');
  const adminPhone = requiredString(admin.phone, 'admin phone');
  const adminPassword = requiredString(admin.password, 'admin password');
  if (adminPassword.length < 8) {
    throw new HttpError(400, 'admin password must be at least 8 characters');
  }

  const plan = typeof body.plan === 'string' && body.plan.trim() ? body.plan.trim() : 'free';

  const result = await organizationService.onboard({
    name,
    plan,
    school: {
      name: schoolName,
      address: typeof school.address === 'string' ? school.address : undefined,
      contactEmail: typeof school.contactEmail === 'string' ? school.contactEmail : undefined,
      contactPhone: typeof school.contactPhone === 'string' ? school.contactPhone : undefined,
    },
    admin: {
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      password: adminPassword,
    },
  });

  res.status(201).json(result);
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const organization = await organizationService.getCurrentOrganization(req);
  if (!organization) {
    throw new HttpError(404, 'organization not found');
  }
  res.json(organization);
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // Whitelist — _id / organizationId can never be changed via this route.
  const updates: { name?: string; plan?: string } = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new HttpError(400, 'name must be a non-empty string');
    }
    updates.name = body.name.trim();
  }
  if (body.plan !== undefined) {
    if (typeof body.plan !== 'string' || !body.plan.trim()) {
      throw new HttpError(400, 'plan must be a non-empty string');
    }
    updates.plan = body.plan.trim();
  }
  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, 'no updatable fields provided');
  }

  const organization = await organizationService.updateCurrentOrganization(req, updates);
  if (!organization) {
    throw new HttpError(404, 'organization not found');
  }
  res.json(organization);
}

export async function deleteMe(req: Request, res: Response): Promise<void> {
  await organizationService.deleteCurrentOrganization(req);
  res.status(204).end();
}