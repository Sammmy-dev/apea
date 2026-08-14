import type { Request } from 'express';
import { withTenantScope } from '../../middleware/tenantScope';
import { SchoolModel } from '../school/school.model';
import { StaffModel } from '../staff/staff.model';
import { hashPassword } from '../auth/auth.service';
import { OrganizationModel } from './organization.model';

export interface OnboardInput {
  name: string;
  plan: string;
  school: {
    name: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  admin: {
    name: string;
    email: string;
    phone: string;
    password: string;
  };
}

export interface OnboardResult {
  organization: {
    id: string;
    name: string;
    plan: string;
  };
  school: {
    id: string;
    name: string;
  };
  admin: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'admin';
  };
}

/**
 * Onboarding: creates the Organization, its first School, and the first
 * admin Staff account (with hashed password) in one request. No transaction
 * is used (standalone MongoDB has no replica-set support); if a later step
 * fails, the org is rolled back manually.
 */
export async function onboard(input: OnboardInput): Promise<OnboardResult> {
  const organization = await OrganizationModel.create({
    name: input.name,
    plan: input.plan,
  });

  try {
    const school = await SchoolModel.create({
      organizationId: organization._id,
      name: input.school.name,
      address: input.school.address,
      contactEmail: input.school.contactEmail,
      contactPhone: input.school.contactPhone,
    });

    const passwordHash = await hashPassword(input.admin.password);
    const staff = await StaffModel.create({
      schoolId: school._id,
      name: input.admin.name,
      email: input.admin.email,
      phone: input.admin.phone,
      role: 'admin',
      passwordHash,
    });

    return {
      organization: { id: organization._id.toString(), name: organization.name, plan: organization.plan },
      school: { id: school._id.toString(), name: school.name },
      admin: {
        id: staff._id.toString(),
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: 'admin',
      },
    };
  } catch (err) {
    await OrganizationModel.findByIdAndDelete(organization._id).catch(() => undefined);
    throw err;
  }
}

/** Fetches the caller's own organization (scoped — can never return another org). */
export async function getCurrentOrganization(req: Request) {
  return withTenantScope(OrganizationModel.findById(req.tenant!.organizationId), req);
}

/** Updates the caller's own organization; field whitelist enforced by the controller. */
export async function updateCurrentOrganization(req: Request, updates: { name?: string; plan?: string }) {
  return withTenantScope(
    OrganizationModel.findByIdAndUpdate(req.tenant!.organizationId, updates, { new: true, runValidators: true }),
    req,
  );
}

/**
 * Deletes the tenant's organization and its schools and staff. Full cascade
 * (students, guardians, links, pickup events, ...) is TODO once those
 * modules land.
 */
export async function deleteCurrentOrganization(req: Request): Promise<void> {
  const organizationId = req.tenant!.organizationId;

  const schools = await SchoolModel.find({ organizationId });
  const schoolIds = schools.map((s) => s._id);

  await StaffModel.deleteMany({ schoolId: { $in: schoolIds } });
  await SchoolModel.deleteMany({ _id: { $in: schoolIds } });
  await OrganizationModel.findByIdAndDelete(organizationId);
}