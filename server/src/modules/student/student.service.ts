import type { Request } from 'express';
import { withTenantScope } from '../../middleware/tenantScope';
import type { BulkResult } from '../../types/bulk';
import { StudentModel, type StudentStatus } from './student.model';

export interface StudentUpdates {
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  dateOfBirth?: Date;
  classGrade?: string;
  status?: StudentStatus;
}

export interface StudentCsvRow {
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  dateOfBirth?: string;
  classGrade?: string;
  status?: string;
}

/** Lists students of the caller's school. SchoolModel's schema has schoolId, so withTenantScope merges it. */
export async function listStudents(req: Request, filter: { status?: StudentStatus } = {}) {
  return withTenantScope(StudentModel.find(filter), req);
}

/** Creates a student in the caller's school (tenant scope applied at creation). */
export async function createStudent(req: Request, data: StudentUpdates) {
  return StudentModel.create({
    ...data,
    schoolId: req.tenant!.schoolId,
  });
}

export async function getStudent(req: Request, studentId: string) {
  return withTenantScope(StudentModel.findById(studentId), req);
}

export async function updateStudent(req: Request, studentId: string, updates: StudentUpdates) {
  return withTenantScope(
    StudentModel.findByIdAndUpdate(studentId, updates, { new: true, runValidators: true }),
    req,
  );
}

export async function deleteStudent(req: Request, studentId: string) {
  return withTenantScope(StudentModel.findByIdAndDelete(studentId), req);
}

type StudentRowValidation = { data: StudentUpdates } | { error: string };

function validateStudentRow(row: StudentCsvRow): StudentRowValidation {
  const firstName = row.firstName?.trim();
  const lastName = row.lastName?.trim();
  if (!firstName) return { error: 'firstName is required' };
  if (!lastName) return { error: 'lastName is required' };

  let dateOfBirth: Date | undefined;
  if (row.dateOfBirth?.trim()) {
    dateOfBirth = new Date(row.dateOfBirth.trim());
    if (Number.isNaN(dateOfBirth.getTime())) {
      return { error: 'dateOfBirth must be a valid date (e.g. 2016-03-01)' };
    }
  }

  let status: StudentStatus = 'active';
  if (row.status?.trim()) {
    if (row.status.trim() !== 'active' && row.status.trim() !== 'inactive') {
      return { error: 'status must be active or inactive' };
    }
    status = row.status.trim() as StudentStatus;
  }

  return {
    data: {
      firstName,
      lastName,
      photoUrl: row.photoUrl?.trim() || undefined,
      dateOfBirth,
      classGrade: row.classGrade?.trim() || undefined,
      status,
    },
  };
}

/**
 * Bulk-creates students from parsed CSV rows. Each row is validated and
 * inserted individually so a bad row never blocks the others; the returned
 * report has one entry per row (row number = line in the original file).
 */
export async function bulkCreateStudents(
  req: Request,
  rows: StudentCsvRow[],
): Promise<BulkResult<{ id: string }>[]> {
  const results: BulkResult<{ id: string }>[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2; // 1-based + header line

    const validation = validateStudentRow(row);
    if ('error' in validation) {
      results.push({ row: rowNumber, status: 'error', error: validation.error });
      continue;
    }

    try {
      const student = await StudentModel.create({
        ...validation.data,
        schoolId: req.tenant!.schoolId,
      });
      results.push({ row: rowNumber, status: 'ok', data: { id: student._id.toString() } });
    } catch (err) {
      results.push({
        row: rowNumber,
        status: 'error',
        error: `could not save: ${err instanceof Error ? err.message : 'unknown error'}`,
      });
    }
  }

  return results;
}