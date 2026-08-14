import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Terminal Express error middleware. Must be registered LAST, after all
 * routes, and every other middleware must `next(err)` (see asyncHandler)
 * for errors to reach it.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: 'validation failed', details: err.errors });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `invalid value for ${err.path}` });
    return;
  }

  // MongoDB duplicate-key (unique index) violations — e.g. two staff with
  // the same email in one school. Surfaced as 409, not a bare 500.
  if (err instanceof Error && (err as { code?: number }).code === 11000) {
    const keyPattern = (err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {};
    const field = Object.keys(keyPattern)[0] ?? 'field';
    res.status(409).json({ error: `duplicate value for ${field}` });
    return;
  }

  const message = err instanceof Error ? err.message : 'unknown error';
  logger.error(`unhandled error: ${message}`);
  res.status(500).json({ error: 'internal server error' });
}