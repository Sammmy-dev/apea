import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { requiredString } from '../../utils/validate';
import * as guardianStudentLinkService from './guardianStudentLink.service';

export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const relationship = requiredString(body.relationship, 'relationship');

  const link = await guardianStudentLinkService.linkGuardianToStudent(req, {
    guardianId: requiredString(body.guardianId, 'guardianId'),
    studentId: requiredString(body.studentId, 'studentId'),
    relationship,
    isPrimary: body.isPrimary === true,
  });

  res.status(201).json(link);
}

export async function list(req: Request, res: Response): Promise<void> {
  const { studentId, guardianId } = req.query as { studentId?: string; guardianId?: string };
  if (!studentId && !guardianId) {
    throw new HttpError(400, 'provide at least one of studentId or guardianId');
  }

  const links = await guardianStudentLinkService.listLinks(req, { studentId, guardianId });
  res.json(links);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const link = await guardianStudentLinkService.deleteLink(req, req.params.linkId);
  if (!link) {
    throw new HttpError(404, 'link not found');
  }
  res.status(204).end();
}