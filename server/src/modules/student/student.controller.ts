import { parse } from 'csv-parse/sync';
import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { requiredString, optionalString } from '../../utils/validate';
import type { StudentStatus } from './student.model';
import * as studentService from './student.service';

const REQUIRED_HEADERS = ['firstName', 'lastName'];

function parseCsvBody(req: Request): Record<string, string>[] {
  const csv = req.body;
  if (typeof csv !== 'string' || !csv.trim()) {
    throw new HttpError(400, 'request body must be a non-empty CSV string');
  }

  let rows: Record<string, string>[];
  try {
    rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch {
    throw new HttpError(400, 'could not parse CSV — check quoting and column count');
  }

  if (rows.length === 0) {
    throw new HttpError(400, 'CSV contains no data rows');
  }

  for (const header of REQUIRED_HEADERS) {
    if (!(header in rows[0])) {
      throw new HttpError(400, `CSV is missing required column: ${header}`);
    }
  }

  return rows;
}

export async function list(req: Request, res: Response): Promise<void> {
  const { status } = req.query as { status?: string };
  const filter: { status?: StudentStatus } =
    status === 'active' || status === 'inactive' ? { status } : {};
  const students = await studentService.listStudents(req, filter);
  res.json(students);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const student = await studentService.createStudent(req, {
    firstName: requiredString(body.firstName, 'firstName'),
    lastName: requiredString(body.lastName, 'lastName'),
    photoUrl: optionalString(body.photoUrl),
    dateOfBirth:
      body.dateOfBirth !== undefined && typeof body.dateOfBirth === 'string'
        ? new Date(body.dateOfBirth)
        : undefined,
    classGrade: optionalString(body.classGrade),
    status: body.status === 'inactive' ? 'inactive' : 'active',
  });
  res.status(201).json(student);
}

export async function bulk(req: Request, res: Response): Promise<void> {
  const rows = parseCsvBody(req);
  const results = await studentService.bulkCreateStudents(req, rows);

  res.status(201).json({
    total: results.length,
    succeeded: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'error').length,
    results,
  });
}

export async function get(req: Request, res: Response): Promise<void> {
  const student = await studentService.getStudent(req, req.params.studentId);
  if (!student) {
    throw new HttpError(404, 'student not found');
  }
  res.json(student);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // Whitelist — schoolId can never be changed via this route.
  const updates: studentService.StudentUpdates = {};
  if (body.firstName !== undefined) updates.firstName = requiredString(body.firstName, 'firstName');
  if (body.lastName !== undefined) updates.lastName = requiredString(body.lastName, 'lastName');
  if (body.photoUrl !== undefined) updates.photoUrl = optionalString(body.photoUrl);
  if (body.classGrade !== undefined) updates.classGrade = optionalString(body.classGrade);
  if (body.dateOfBirth !== undefined) {
    if (typeof body.dateOfBirth !== 'string') throw new HttpError(400, 'dateOfBirth must be a string');
    updates.dateOfBirth = new Date(body.dateOfBirth);
  }
  if (body.status !== undefined) {
    if (body.status !== 'active' && body.status !== 'inactive') {
      throw new HttpError(400, 'status must be active or inactive');
    }
    updates.status = body.status;
  }
  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, 'no updatable fields provided');
  }

  const student = await studentService.updateStudent(req, req.params.studentId, updates);
  if (!student) {
    throw new HttpError(404, 'student not found');
  }
  res.json(student);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const student = await studentService.deleteStudent(req, req.params.studentId);
  if (!student) {
    throw new HttpError(404, 'student not found');
  }
  res.status(204).end();
}