import type { NextFunction, Request, Response } from 'express';
import type { Model, Query, RootFilterQuery } from 'mongoose';
import type { TenantContext } from '../types/auth';
import { HttpError } from './errorHandler';

/**
 * WHY THIS FILE EXISTS
 * --------------------
 * PRD §4 (Non-Functional Requirements) — Tenant isolation: "No query path
 * may return data across Organization boundaries. Enforce at the ORM/query
 * layer, not just UI."
 *
 * Every controller in this codebase reads multiple collections per request
 * (many FKs, joins via populate). If each controller hand-rolls its own
 * `organizationId`/`schoolId` filter, a single forgotten filter silently
 * becomes a cross-tenant data leak. Centralizing the merge here means the
 * tenant scope is always applied by construction:
 *
 *   - Collections with an `organizationId` field (Guardian, AuthorizedPerson,
 *     School, ...) get `organizationId` merged unconditionally.
 *   - Collections with a `schoolId` field (Student, Staff, PickupEvent, ...)
 *     get `schoolId` merged — and throw if the caller has no school scope
 *     (i.e. a guardian querying a school-scoped collection).
 *   - The Organization collection itself is scoped by `_id == tenant`.
 *   - Collections WITHOUT either field (GuardianStudentLink, AuthorizationLink,
 *     Notification) have no direct tenant FK and are intentionally left
 *     untouched — those must be filtered server-side through their refs
 *     (e.g. via guardianId/studentId) in the controller.
 *
 * The helper works on the Mongoose Query object (it reads the model from
 * the query), so field presence is derived from the actual schema instead of
 * a hardcoded whitelist — adding a new collection can never silently bypass
 * scoping.
 */

export class TenantScopeError extends HttpError {
  constructor(message: string) {
    super(403, message);
    this.name = 'TenantScopeError';
  }
}

/**
 * Middleware: attaches `req.tenant` derived from the authenticated user
 * (`req.user`, set by the auth middleware from the JWT — added next). Must
 * run AFTER auth and BEFORE any route that touches tenant-scoped data.
 */
export function tenantScope(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new TenantScopeError('tenantScope requires an authenticated user'));
    return;
  }

  const tenant: TenantContext = {
    organizationId: req.user.organizationId,
    schoolId: req.user.schoolId,
    role: req.user.role,
  };

  req.tenant = tenant;
  next();
}

function assertSameOrganization(id: unknown, tenant: TenantContext): void {
  if (id !== undefined && String(id) !== String(tenant.organizationId)) {
    throw new TenantScopeError('query targets another organization');
  }
}

/**
 * Merges the request's tenant scope into the query filter.
 *
 * Usage (fluent — returns the wrapped query, so controller code stays
 * unchanged apart from wrapping the first `.find(...)`/`.findOne(...)`/...
 * call):
 *
 *   const kids = await withTenantScope(GuardianModel.find({ name: /a/ }), req);
 *
 * The tenant filter always wins: if the controller pre-set `organizationId`
 * or `schoolId`, it is overwritten with the tenant value. Any attempt to
 * query outside the tenant's scope therefore fails loudly (TenantScopeError)
 * rather than silently returning an empty or foreign result set.
 */
export function withTenantScope<Res, Doc>(
  query: Query<Res, Doc>,
  req: Request,
): Query<Res, Doc> {
  const tenant = req.tenant;
  if (!tenant) {
    throw new TenantScopeError('withTenantScope requires req.tenant — run tenantScope middleware first');
  }

  const model: Model<Doc> = query.model;
  const schema = model.schema;
  const filter = query.getFilter() as Record<string, unknown>;

  let tenantFilter: Record<string, unknown> = {};

  if (model.modelName === 'Organization') {
    assertSameOrganization(filter._id, tenant);
    tenantFilter = { _id: filter._id ?? tenant.organizationId };
  } else {
    if ('organizationId' in schema.paths) {
      tenantFilter.organizationId = tenant.organizationId;
    }

    if ('schoolId' in schema.paths) {
      if (!tenant.schoolId) {
        throw new TenantScopeError(
          `${model.modelName} is school-scoped but the requester has no school scope`,
        );
      }
      tenantFilter.schoolId = tenant.schoolId;
    }
  }

  // merge() with overwrite semantics: the tenant filter always wins over any
  // filter the controller pre-set.
  return query.merge(tenantFilter as RootFilterQuery<Doc>);
}