import type { Request } from 'express';
import { withTenantScope } from '../../middleware/tenantScope';
import { SchoolModel } from './school.model';

export interface SchoolUpdates {
  name?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * Lists the caller's org's schools. SchoolModel has an organizationId field,
 * so withTenantScope merges `organizationId: req.tenant.organizationId` and
 * any pre-set filter is overridden.
 */
export async function listSchools(req: Request) {
  return withTenantScope(SchoolModel.find(), req);
}

/** Creates a school owned by the caller's org (tenant scope applied at creation). */
export async function createSchool(req: Request, data: { name: string; address?: string; contactEmail?: string; contactPhone?: string }) {
  return SchoolModel.create({
    ...data,
    organizationId: req.tenant!.organizationId,
  });
}

/** Fetches one school, scoped — a school outside the tenant's org returns null. */
export async function getSchool(req: Request, schoolId: string) {
  return withTenantScope(SchoolModel.findById(schoolId), req);
}

export async function updateSchool(req: Request, schoolId: string, updates: SchoolUpdates) {
  return withTenantScope(
    SchoolModel.findByIdAndUpdate(schoolId, updates, { new: true, runValidators: true }),
    req,
  );
}

export async function deleteSchool(req: Request, schoolId: string) {
  return withTenantScope(SchoolModel.findByIdAndDelete(schoolId), req);
}