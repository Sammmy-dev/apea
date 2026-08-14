import type { Request } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { ForbiddenError } from '../../middleware/errorHandler';
import { withTenantScope } from '../../middleware/tenantScope';
import { GuardianStudentLinkModel } from './guardianStudentLink.model';
import { GuardianModel } from '../guardian/guardian.model';
import { SchoolModel } from '../school/school.model';
import { StudentModel } from '../student/student.model';
import {
  generateFallbackCode,
  hashFallbackCode,
  issueQrTokenForLink,
  signQrToken,
} from '../authorizationLink/qrToken.service';

/**
 * GuardianStudentLink has no organizationId/schoolId field (see the tenant
 * scope doc), so tenant safety is enforced here at the controller level:
 * the guardian must belong to the caller's organization and the student to
 * the caller's school before any link record is read or written.
 */

/**
 * Links a guardian to a student with a relationship label. Admin-only route.
 * The guardian's own pickup digital ID (QR token + 6-digit fallback code)
 * is issued immediately: hash stored, plaintext returned once.
 */
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

  const fallbackCode = generateFallbackCode();
  const link = await GuardianStudentLinkModel.create({
    guardianId: input.guardianId,
    studentId: input.studentId,
    relationship: input.relationship,
    isPrimary: input.isPrimary,
    fallbackCodeHash: hashFallbackCode(fallbackCode),
  });

  // A student has at most one primary guardian.
  if (input.isPrimary) {
    await GuardianStudentLinkModel.updateMany(
      { studentId: input.studentId, isPrimary: true, _id: { $ne: link._id } },
      { $set: { isPrimary: false } },
    );
  }

  return { link, fallbackCode };
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

/**
 * Lists the calling guardian's OWN active links with student + school
 * details — the data source for the guardian dashboard's child cards.
 * Scoped purely by req.user.id, so no cross-tenant surface exists.
 */
export async function listMyLinks(req: Request) {
  const links = await GuardianStudentLinkModel.find({
    guardianId: req.user!.id,
    status: 'active',
  });

  if (links.length === 0) return [];

  const studentIds = links.map((l) => l.studentId);
  const students = await StudentModel.find({ _id: { $in: studentIds } });
  const schoolIds = [...new Set(students.map((s) => s.schoolId.toString()))];
  const schools = await SchoolModel.find({ _id: { $in: schoolIds } });
  const schoolNames = new Map(schools.map((s) => [s._id.toString(), s.name]));
  const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

  return links.map((link) => {
    const student = studentMap.get(link.studentId.toString());
    return {
      linkId: link._id.toString(),
      relationship: link.relationship,
      isPrimary: link.isPrimary,
      student: student
        ? {
            id: student._id.toString(),
            firstName: student.firstName,
            lastName: student.lastName,
            classGrade: student.classGrade ?? null,
            photoUrl: student.photoUrl ?? null,
          }
        : null,
      schoolName: student ? (schoolNames.get(student.schoolId.toString()) ?? null) : null,
    };
  });
}

/**
 * Guardian's own pickup digital ID: signed QR token (standing → rolling
 * 15-min expiry) + freshly rotated 6-digit fallback code. Only the link's
 * guardian can view it (a guardian presents this to verify they may pick up
 * their own child — verified via the GuardianStudentLink directly, with no
 * AuthorizationLink involved).
 */
export async function getGuardianDigitalId(req: Request, linkId: string) {
  const link = await GuardianStudentLinkModel.findById(linkId);
  if (!link) {
    return null;
  }
  if (link.guardianId.toString() !== req.user!.id.toString()) {
    throw new ForbiddenError('you can only view your own pickup digital ID');
  }
  if (link.status !== 'active') {
    throw new HttpError(400, `link is ${link.status}`);
  }

  const payload = issueQrTokenForLink({
    _id: link._id,
    studentId: link.studentId,
    authorizedPersonId: link.guardianId,
    type: 'standing',
    validUntil: undefined,
  });
  const qrToken = signQrToken(payload);
  const fallbackCode = generateFallbackCode();
  link.fallbackCodeHash = hashFallbackCode(fallbackCode);
  await link.save();

  return { qrToken, fallbackCode, expiresAt: new Date(payload.exp) };
}