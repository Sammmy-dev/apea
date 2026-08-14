import type { Request } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { withTenantScope } from '../../middleware/tenantScope';
import { PickupEventModel } from './pickupEvent.model';
import { verifyScan } from './verify.service';
import { StudentModel } from '../student/student.model';

/**
 * Logs the FINAL pickup outcome once the guard taps confirm on the gate app.
 * The server re-verifies the scan fresh — the client can never assert its
 * own status, so an APPROVED screen that is revoked between scan and confirm
 * is logged as DENIED instead. Every denied attempt is logged too (PRD §7.5).
 *
 * For guardian self-pickups (guardian's own digital ID) the event stores the
 * guardian's id in authorizedPersonId with authorizationLinkId = null.
 */
export async function logPickupEvent(
  req: Request,
  input: { token?: string; code?: string },
): Promise<import('mongoose').HydratedDocument<import('./pickupEvent.model').PickupEvent>> {
  const result = await verifyScan(req, input);

  return PickupEventModel.create({
    studentId: result.student?.id,
    authorizedPersonId: result.pickupPerson?.id,
    authorizationLinkId:
      result.authorization && result.authorization.type !== 'guardian_self'
        ? result.authorization.id
        : null,
    scannedByStaffId: req.user!.id,
    schoolId: req.tenant!.schoolId,
    method: result.method,
    status: result.status === 'APPROVED' ? 'approved' : 'denied',
    denialReason: result.status === 'DENIED' ? result.reason : null,
  });
}

export interface PickupEventFilters {
  studentId?: string;
  staffId?: string;
  from?: string;
  to?: string;
  status?: string;
}

/**
 * Audit log / guard's personal log. Tenant-scoped by schoolId automatically;
 * a guard may only ever see their own events (the audit view is admin-only).
 */
export async function listPickupEvents(req: Request, filters: PickupEventFilters) {
  const query: Record<string, unknown> = {};

  if (filters.studentId) {
    const student = await withTenantScope(StudentModel.findById(filters.studentId), req);
    if (!student) {
      throw new HttpError(404, 'student not found in this school');
    }
    query.studentId = filters.studentId;
  }

  if (filters.staffId) {
    if (req.user!.role === 'guard' && filters.staffId !== req.user!.id) {
      throw new HttpError(403, 'guards can only view their own pickup events');
    }
    query.scannedByStaffId = filters.staffId;
  }
  if (req.user!.role === 'guard' && !query.scannedByStaffId) {
    query.scannedByStaffId = req.user!.id;
  }

  if (filters.from || filters.to) {
    const timestamp: Record<string, Date> = {};
    if (filters.from) {
      const from = new Date(filters.from);
      if (Number.isNaN(from.getTime())) {
        throw new HttpError(400, 'from must be a valid ISO date');
      }
      timestamp.$gte = from;
    }
    if (filters.to) {
      const to = new Date(filters.to);
      if (Number.isNaN(to.getTime())) {
        throw new HttpError(400, 'to must be a valid ISO date');
      }
      timestamp.$lte = to;
    }
    query.timestamp = timestamp;
  }

  if (filters.status) {
    if (filters.status !== 'approved' && filters.status !== 'denied') {
      throw new HttpError(400, "status must be 'approved' or 'denied'");
    }
    query.status = filters.status;
  }

  return withTenantScope(PickupEventModel.find(query).sort({ timestamp: -1 }), req)
    .populate('studentId', 'firstName lastName classGrade')
    .populate('scannedByStaffId', 'name');
}