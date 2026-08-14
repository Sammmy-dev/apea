import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/errorHandler';
import * as pickupEventService from './pickupEvent.service';
import { verifyScan } from './verify.service';

/** Exactly one of token | code must be present in the body. */
function parseScanInput(body: Record<string, unknown>): { token?: string; code?: string } {
  const token = typeof body.token === 'string' && body.token.length > 0 ? body.token : undefined;
  const code = typeof body.code === 'string' && body.code.length > 0 ? body.code : undefined;
  if (Boolean(token) === Boolean(code)) {
    throw new HttpError(400, 'provide exactly one of token or code');
  }
  return { token, code };
}

/** Live verification result for the guard UI — no event is logged here. */
export async function verify(req: Request, res: Response): Promise<void> {
  const input = parseScanInput((req.body ?? {}) as Record<string, unknown>);
  const result = await verifyScan(req, input);
  res.json(result);
}

/** Guard taps confirm: logs the final approved or denied event. */
export async function create(req: Request, res: Response): Promise<void> {
  const input = parseScanInput((req.body ?? {}) as Record<string, unknown>);
  const event = await pickupEventService.logPickupEvent(req, input);
  res.status(201).json(event);
}

export async function list(req: Request, res: Response): Promise<void> {
  const q = req.query as pickupEventService.PickupEventFilters;
  const events = await pickupEventService.listPickupEvents(req, {
    studentId: q.studentId,
    staffId: q.staffId,
    from: q.from,
    to: q.to,
    status: q.status,
  });
  res.json(events);
}