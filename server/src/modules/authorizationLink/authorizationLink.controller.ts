import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { requiredString } from '../../utils/validate';
import * as authorizationLinkService from './authorizationLink.service';
import type { AuthorizationLinkType } from './authorizationLink.model';

export async function grant(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const type = body.type;
  if (type !== 'standing' && type !== 'daily') {
    throw new HttpError(400, "type must be 'standing' or 'daily'");
  }

  const result = await authorizationLinkService.grantAuthorization(req, {
    studentId: requiredString(body.studentId, 'studentId'),
    authorizedPersonId: requiredString(body.authorizedPersonId, 'authorizedPersonId'),
    type: type as AuthorizationLinkType,
  });

  res.status(201).json(result);
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const { studentId } = req.query as { studentId?: string };
  const links = await authorizationLinkService.listMyAuthorizations(req, { studentId });
  res.json(links);
}

export async function revokeMine(req: Request, res: Response): Promise<void> {
  const link = await authorizationLinkService.revokeMyAuthorization(req, req.params.linkId);
  if (!link) {
    throw new HttpError(404, 'authorization not found');
  }
  res.json(link);
}

/** Digital ID for an authorization: signed QR token + 6-digit fallback code. */
export async function qr(req: Request, res: Response): Promise<void> {
  const result = await authorizationLinkService.getDigitalId(req, req.params.linkId);
  if (!result) {
    throw new HttpError(404, 'authorization not found');
  }
  res.json(result);
}