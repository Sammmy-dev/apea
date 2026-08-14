import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import * as schoolService from './school.service';
import type { SchoolUpdates } from './school.service';

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} is required`);
  }
  return value.trim();
}

export async function list(req: Request, res: Response): Promise<void> {
  const schools = await schoolService.listSchools(req);
  res.json(schools);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const school = await schoolService.createSchool(req, {
    name: requiredString(body.name, 'school name'),
    address: typeof body.address === 'string' && body.address ? body.address : undefined,
    contactEmail: typeof body.contactEmail === 'string' && body.contactEmail ? body.contactEmail : undefined,
    contactPhone: typeof body.contactPhone === 'string' && body.contactPhone ? body.contactPhone : undefined,
  });
  res.status(201).json(school);
}

export async function get(req: Request, res: Response): Promise<void> {
  const school = await schoolService.getSchool(req, req.params.schoolId);
  if (!school) {
    throw new HttpError(404, 'school not found');
  }
  res.json(school);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // Whitelist — organizationId can never be changed via this route.
  const updates: SchoolUpdates = {};
  for (const field of ['name', 'address', 'contactEmail', 'contactPhone'] as const) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') {
        throw new HttpError(400, `${field} must be a string`);
      }
      updates[field] = body[field] as string;
    }
  }
  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, 'no updatable fields provided');
  }

  const school = await schoolService.updateSchool(req, req.params.schoolId, updates);
  if (!school) {
    throw new HttpError(404, 'school not found');
  }
  res.json(school);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const school = await schoolService.deleteSchool(req, req.params.schoolId);
  if (!school) {
    throw new HttpError(404, 'school not found');
  }
  res.status(204).end();
}