import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import { optionalString, requiredString } from '../../utils/validate';
import * as authorizedPersonService from './authorizedPerson.service';

export async function list(req: Request, res: Response): Promise<void> {
  const people = await authorizedPersonService.listAuthorizedPeople(req);
  res.json(people);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const person = await authorizedPersonService.createAuthorizedPerson(req, {
    name: requiredString(body.name, 'name'),
    phone: requiredString(body.phone, 'phone'),
    photoUrl: optionalString(body.photoUrl),
    idDocumentNumber: optionalString(body.idDocumentNumber),
  });
  res.status(201).json(person);
}

export async function get(req: Request, res: Response): Promise<void> {
  const person = await authorizedPersonService.getAuthorizedPerson(req, req.params.personId);
  if (!person) {
    throw new HttpError(404, 'authorized person not found');
  }
  res.json(person);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // Whitelist — organizationId can never be changed via this route.
  const updates: authorizedPersonService.AuthorizedPersonUpdates = {};
  if (body.name !== undefined) updates.name = requiredString(body.name, 'name');
  if (body.phone !== undefined) updates.phone = requiredString(body.phone, 'phone');
  if (body.photoUrl !== undefined) updates.photoUrl = optionalString(body.photoUrl);
  if (body.idDocumentNumber !== undefined) updates.idDocumentNumber = optionalString(body.idDocumentNumber);
  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, 'no updatable fields provided');
  }

  const person = await authorizedPersonService.updateAuthorizedPerson(req, req.params.personId, updates);
  if (!person) {
    throw new HttpError(404, 'authorized person not found');
  }
  res.json(person);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const person = await authorizedPersonService.deleteAuthorizedPerson(req, req.params.personId);
  if (!person) {
    throw new HttpError(404, 'authorized person not found');
  }
  res.status(204).end();
}