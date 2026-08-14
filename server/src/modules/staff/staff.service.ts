import type { Request } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { withTenantScope } from '../../middleware/tenantScope';
import { hashPassword } from '../auth/auth.service';
import { StaffModel, type StaffRole } from './staff.model';

export interface CreateStaffInput {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  password: string;
}

export interface UpdateStaffInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: StaffRole;
  password?: string;
}

/** Admin creates a staff account (guard or admin) with an initial password. */
export async function createStaff(req: Request, input: CreateStaffInput) {
  const passwordHash = await hashPassword(input.password);
  return StaffModel.create({
    schoolId: req.tenant!.schoolId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: input.role,
    status: 'active',
    passwordHash,
  });
}

/** Lists staff in the caller's school, optionally filtered by role. */
export async function listStaff(req: Request, filter: { role?: string }) {
  const query: Record<string, unknown> = {};
  if (filter.role) {
    if (filter.role !== 'admin' && filter.role !== 'guard') {
      throw new HttpError(400, "role must be 'admin' or 'guard'");
    }
    query.role = filter.role;
  }
  return withTenantScope(StaffModel.find(query).sort({ createdAt: 1 }), req);
}

/**
 * Admin updates a staff member. An admin can never change their own role
 * (prevents accidentally locking the school out of admin access).
 */
export async function updateStaff(req: Request, staffId: string, updates: UpdateStaffInput) {
  const staff = await withTenantScope(StaffModel.findById(staffId), req);
  if (!staff) {
    return null;
  }

  if (updates.role && staff._id.toString() === req.user!.id) {
    throw new HttpError(400, 'you cannot change your own role');
  }

  if (updates.name !== undefined) staff.name = updates.name;
  if (updates.email !== undefined) staff.email = updates.email;
  if (updates.phone !== undefined) staff.phone = updates.phone;
  if (updates.role !== undefined) staff.role = updates.role;
  if (updates.password !== undefined) {
    staff.passwordHash = await hashPassword(updates.password);
  }

  await staff.save();
  return staff;
}

/**
 * Deactivates a staff account: login is refused and the gate app locks out,
 * but PickupEvent references stay intact (no hard delete). Admins cannot
 * deactivate themselves.
 */
export async function deactivateStaff(req: Request, staffId: string) {
  const staff = await withTenantScope(StaffModel.findById(staffId), req);
  if (!staff) {
    return null;
  }
  if (staff._id.toString() === req.user!.id) {
    throw new HttpError(400, 'you cannot deactivate your own account');
  }
  if (staff.status === 'inactive') {
    throw new HttpError(400, 'staff account is already inactive');
  }

  staff.status = 'inactive';
  await staff.save();
  return staff;
}