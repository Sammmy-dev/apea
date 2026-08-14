import type { Request } from 'express';
import { withTenantScope } from '../../middleware/tenantScope';
import { AuthorizedPersonModel } from './authorizedPerson.model';

export interface AuthorizedPersonUpdates {
  name?: string;
  phone?: string;
  photoUrl?: string;
  idDocumentNumber?: string;
}

/** Lists authorized people in the caller's org. Org-scoped via withTenantScope. */
export async function listAuthorizedPeople(req: Request) {
  return withTenantScope(AuthorizedPersonModel.find(), req);
}

/** Creates an authorized person in the caller's org (tenant scope applied at creation). */
export async function createAuthorizedPerson(req: Request, data: AuthorizedPersonUpdates) {
  return AuthorizedPersonModel.create({
    ...data,
    organizationId: req.tenant!.organizationId,
  });
}

export async function getAuthorizedPerson(req: Request, personId: string) {
  return withTenantScope(AuthorizedPersonModel.findById(personId), req);
}

export async function updateAuthorizedPerson(req: Request, personId: string, updates: AuthorizedPersonUpdates) {
  return withTenantScope(
    AuthorizedPersonModel.findByIdAndUpdate(personId, updates, { new: true, runValidators: true }),
    req,
  );
}

export async function deleteAuthorizedPerson(req: Request, personId: string) {
  return withTenantScope(AuthorizedPersonModel.findByIdAndDelete(personId), req);
}