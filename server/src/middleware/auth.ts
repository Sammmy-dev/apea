import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthRole, AuthTokenPayload, AuthenticatedUser, UserType } from '../types/auth';
import { UnauthorizedError } from './errorHandler';

const VALID_ROLES = new Set<AuthRole>(['guardian', 'admin', 'guard']);
const VALID_USER_TYPES = new Set<UserType>(['guardian', 'staff']);

/**
 * JWT verification middleware. Reads `Authorization: Bearer <token>`,
 * verifies the signature, validates the required claims, and attaches the
 * decoded identity to `req.user` (shape: AuthenticatedUser).
 *
 * Claims are: userId, userType (guardian | staff), role (guardian | admin |
 * guard), organizationId, and schoolId (staff only).
 *
 * Must run before tenantScope on any tenant-scoped route.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    next(new UnauthorizedError('missing bearer token'));
    return;
  }

  let payload: jwt.JwtPayload & AuthTokenPayload;
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    payload = decoded as jwt.JwtPayload & AuthTokenPayload;
  } catch {
    next(new UnauthorizedError('invalid or expired token'));
    return;
  }

  if (
    !payload.userId ||
    !payload.organizationId ||
    !VALID_ROLES.has(payload.role) ||
    !VALID_USER_TYPES.has(payload.userType)
  ) {
    next(new UnauthorizedError('malformed token'));
    return;
  }

  const user: AuthenticatedUser = {
    id: payload.userId,
    userType: payload.userType,
    role: payload.role,
    organizationId: payload.organizationId,
    schoolId: payload.schoolId,
  };

  req.user = user;
  next();
}