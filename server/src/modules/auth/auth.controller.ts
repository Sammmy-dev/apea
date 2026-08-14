import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import * as authService from './auth.service';

function parseLoginBody(req: Request): { email: string; password: string } {
  const { email, password } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new HttpError(400, 'email and password are required');
  }
  return { email, password };
}

export async function guardianLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = parseLoginBody(req);
  const result = await authService.loginGuardian(email, password);
  res.status(200).json(result);
}

export async function staffLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = parseLoginBody(req);
  const result = await authService.loginStaff(email, password);
  res.status(200).json(result);
}