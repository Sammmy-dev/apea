import type { Types } from 'mongoose';

export type UserType = 'guardian' | 'staff';

export type StaffRole = 'admin' | 'guard';

/**
 * Role carried by the JWT and `req.user`. For staff this is their
 * `Staff.role` (`admin` | `guard`); guardians always have role `guardian`.
 */
export type AuthRole = UserType | StaffRole;

/**
 * Shape of the authenticated user attached to `req.user` by the auth
 * middleware, decoded from the JWT:
 *   userId, userType, role, organizationId, and schoolId (staff only).
 */
export interface AuthenticatedUser {
  id: Types.ObjectId | string;
  userType: UserType;
  role: AuthRole;
  organizationId: Types.ObjectId | string;
  schoolId?: Types.ObjectId | string;
}

/**
 * Tenant scope attached to `req.tenant` by the tenantScope middleware.
 * `schoolId` is only present for staff (guards/admins), since guardians
 * are scoped to an organization, not a school.
 */
export interface TenantContext {
  organizationId: Types.ObjectId | string;
  schoolId?: Types.ObjectId | string;
  role: AuthRole;
}

/** Claims encoded in the JWT (see server/src/middleware/auth.ts). */
export interface AuthTokenPayload {
  userId: string;
  userType: UserType;
  role: AuthRole;
  organizationId: string;
  schoolId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenant?: TenantContext;
    }
  }
}