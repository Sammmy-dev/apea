import type { Request } from 'express';
import { ForbiddenError, HttpError } from '../../middleware/errorHandler';
import { withTenantScope } from '../../middleware/tenantScope';
import { StaffModel } from '../staff/staff.model';
import { StudentModel } from '../student/student.model';
import { GuardianStudentLinkModel } from './guardianStudentLink.model';

/**
 * Admin-only revocation of a guardian's link to a student (PRD §7.3):
 * a guardian can never revoke another guardian's link — only a school
 * admin can, and only with a mandatory logged reason.
 *
 * Enforced at three layers:
 *   1. Route middleware (requireRole('admin')) — JWT role claim.
 *   2. Here: the live Staff record must exist, be role 'admin', and belong
 *      to the token's school (defense against forged/stale tokens).
 *   3. Tenant scope: the link's student must belong to the caller's school.
 */
export async function revokeLink(req: Request, linkId: string, revocationReason: string) {
  if (!req.user || req.user.userType !== 'staff' || req.user.role !== 'admin') {
    throw new ForbiddenError('only school admins can revoke guardian access');
  }

  const staff = await StaffModel.findById(req.user.id).select('role schoolId');
  if (!staff || staff.role !== 'admin') {
    throw new ForbiddenError('only school admins can revoke guardian access');
  }
  if (staff.schoolId.toString() !== req.tenant?.schoolId?.toString()) {
    throw new ForbiddenError('staff school does not match the token scope');
  }

  const reason = revocationReason.trim();
  if (!reason) {
    throw new HttpError(400, 'revocationReason is required');
  }

  const link = await GuardianStudentLinkModel.findById(linkId);
  if (!link) {
    return null;
  }

  const student = await withTenantScope(StudentModel.findById(link.studentId), req);
  if (!student) {
    return null;
  }

  if (link.status === 'revoked') {
    throw new HttpError(400, 'link is already revoked');
  }

  link.status = 'revoked';
  link.revokedByStaffId = staff._id;
  link.revokedAt = new Date();
  link.revocationReason = reason;
  await link.save();

  return link;
}