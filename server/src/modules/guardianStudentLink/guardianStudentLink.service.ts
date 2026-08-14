import type { Request } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { withTenantScope } from '../../middleware/tenantScope';
import { GuardianStudentLinkModel } from './guardianStudentLink.model';
import { GuardianModel } from '../guardian/guardian.model';
import { StudentModel } from '../student/student.model';

/**
 * GuardianStudentLink has no organizationId/schoolId field (see the tenant
 * scope doc), so tenant safety is enforced here at the controller level:
 * the guardian must belong to the caller's organization and the student to
 * the caller's school before any link record is read or written.
 */

/** Links a guardian to a student with a relationship label. Admin-only route. */
export async function linkGuardianToStudent(
  req: Request,
  input: { guardianId: string; studentId: string; relationship: string; isPrimary: boolean },
) {
  const guardian = await withTenantScope(GuardianModel.findById(input.guardianId), req);
  if (!guardian) {
    throw new HttpError(404, 'guardian not found in this organization');
  }
  const student = await withTenantScope(StudentModel.findById(input.studentId), req);
  if (!student) {
    throw new HttpError(404, 'student not found in this school');
  }

  const existing = await GuardianStudentLinkModel.findOne({
    guardianId: input.guardianId,
    studentId: input.studentId,
    status: 'active',
  });
  if (existing) {
    throw new HttpError(400, 'this guardian is already linked to this student');
  }

  const link = await GuardianStudentLinkModel.create({
    guardianId: input.guardianId,
    studentId: input.studentId,
    relationship: input.relationship,
    isPrimary: input.isPrimary,
  });

  // A student has at most one primary guardian.
  if (input.isPrimary) {
    await GuardianStudentLinkModel.updateMany(
      { studentId: input.studentId, isPrimary: true, _id: { $ne: link._id } },
      { $set: { isPrimary: false } },
    );
  }

  return link;
}

/** Lists links filtered by studentId and/or guardianId; refs are verified in-tenant first. */
export async function listLinks(req: Request, filter: { studentId?: string; guardianId?: string }) {
  if (filter.studentId) {
    const student = await withTenantScope(StudentModel.findById(filter.studentId), req);
    if (!student) {
      throw new HttpError(404, 'student not found in this school');
    }
  }
  if (filter.guardianId) {
    const guardian = await withTenantScope(GuardianModel.findById(filter.guardianId), req);
    if (!guardian) {
      throw new HttpError(404, 'guardian not found in this organization');
    }
  }

  // Build the query filter explicitly — passing `guardianId: undefined`
  // straight into find() would serialize into the query and match nothing.
  const queryFilter: Record<string, string> = {};
  if (filter.studentId) queryFilter.studentId = filter.studentId;
  if (filter.guardianId) queryFilter.guardianId = filter.guardianId;

  return GuardianStudentLinkModel.find(queryFilter)
    .populate('guardianId', 'name email phone')
    .populate('studentId', 'firstName lastName classGrade');
}

/** Unlinks a guardian from a student. The link's student is verified in-tenant first. */
export async function deleteLink(req: Request, linkId: string) {
  const link = await GuardianStudentLinkModel.findById(linkId);
  if (!link) {
    return null;
  }
  const student = await withTenantScope(StudentModel.findById(link.studentId), req);
  if (!student) {
    return null;
  }
  return GuardianStudentLinkModel.findByIdAndDelete(linkId);
}