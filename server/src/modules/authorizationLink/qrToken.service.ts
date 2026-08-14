import crypto from 'node:crypto';
import { env } from '../../config/env';
import type { AuthorizationLink } from './authorizationLink.model';

/**
 * Signed QR tokens (HMAC-SHA256, no extra dependency).
 *
 * Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(body))
 *   payload: { linkId, studentId, authorizedPersonId, exp }
 *
 * Expiry rules:
 *   - daily links: exp = the link's validUntil (end of the granted day)
 *   - standing links: exp = now + STANDING_TOKEN_TTL_MS (rolling short
 *     expiry, refreshed on every digital-ID view — see issueQrTokenForLink)
 *
 * The signature prevents forgery; live status/revocation checks are the job
 * of the gate verification service (pickupEvent module).
 */

export const STANDING_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface QrTokenPayload {
  linkId: string;
  studentId: string;
  authorizedPersonId: string;
  /** Epoch ms; token is invalid after this. */
  exp: number;
}

function hmacSign(body: string): string {
  return crypto.createHmac('sha256', env.qrTokenSecret).update(body).digest('base64url');
}

export function signQrToken(payload: QrTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${hmacSign(body)}`;
}

/**
 * Verifies the HMAC signature and the expiry. Returns the payload, or null
 * for any tampered/expired/malformed token.
 */
export function verifyQrToken(token: string): QrTokenPayload | null {
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = Buffer.from(hmacSign(body), 'base64url');
  const provided = Buffer.from(signature, 'base64url');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }

  let payload: QrTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload.linkId || !payload.studentId || !payload.authorizedPersonId || typeof payload.exp !== 'number') {
    return null;
  }
  if (payload.exp <= Date.now()) {
    return null;
  }

  return payload;
}

/** Picks the token expiry for a link: daily → link.validUntil, standing → rolling window. */
export function issueQrTokenForLink(
  link: Pick<AuthorizationLink, '_id' | 'studentId' | 'authorizedPersonId' | 'type' | 'validUntil'>,
  now: Date = new Date(),
): QrTokenPayload {
  const exp =
    link.type === 'daily' && link.validUntil
      ? link.validUntil.getTime()
      : now.getTime() + STANDING_TOKEN_TTL_MS;

  return {
    linkId: link._id.toString(),
    studentId: link.studentId.toString(),
    authorizedPersonId: link.authorizedPersonId.toString(),
    exp,
  };
}

/**
 * 6-digit fallback code: random, zero-padded. Only its SHA-256 is stored on
 * the link; the plaintext is returned exactly once, at generation time.
 * A fresh code is generated on each digital-ID view (old codes die with the
 * hash rotation, so a leaked screenshot is only valid until the next view).
 */
export function generateFallbackCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashFallbackCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}