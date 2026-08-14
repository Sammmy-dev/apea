import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthRole } from '../types/auth';
import { ForbiddenError, UnauthorizedError } from './errorHandler';

/**
 * Route guard factory. Restricts access to the given roles, e.g.:
 *
 *   router.get('/roster', requireAuth, requireRole('admin'), handler)
 *
 * `requireRole('admin')` → admins only. `requireRole('guard', 'admin')` →
 * any staff member. `requireRole('guardian')` → guardians only.
 */
export function requireRole(...allowedRoles: AuthRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('authentication required'));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('insufficient permissions'));
      return;
    }
    next();
  };
}