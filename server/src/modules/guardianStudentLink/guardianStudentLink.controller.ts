import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { requiredString } from '../../utils/validate';
import * as guardianStudentLinkService from './guardianStudentLink.service';
import { revokeLink } from './revoke.service';

export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const relationship = requiredString(body.relationship, 'relationship');

  const { link, fallbackCode } = await guardianStudentLinkService.linkGuardianToStudent(req, {
    guardianId: requiredString(body.guardianId, 'guardianId'),
    studentId: requiredString(body.studentId, 'studentId'),
    relationship,
    isPrimary: body.isPrimary === true,
  });

  res.status(201).json({ ...link.toJSON(), fallbackCode });
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

export async function revoke(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const revocationReason = requiredString(body.revocationReason, 'revocationReason');

  const link = await revokeLink(req, req.params.linkId, revocationReason);
  if (!link) {
    throw new HttpError(404, 'link not found');
  }
  res.json(link);
}

export async function qr(req: Request, res: Response): Promise<void> {
  const digitalId = await guardianStudentLinkService.getGuardianDigitalId(req, req.params.linkId);
  if (!digitalId) {
    throw new HttpError(404, 'link not found');
  }
  res.json(digitalId);
}