/**
 * Guardian session handling: JWT storage + guardian login/logout.
 *
 * The token lives in localStorage (browser only) and is attached to every
 * API call by api-client.ts. Session *validity* is enforced server-side on
 * each request — the JWT payload decoded here is only used to remember who
 * is logged in (guardianId, display name) without an extra round-trip.
 */

const TOKEN_KEY = 'guardian_token';
const USER_KEY = 'guardian_user';

/** Shape of `user` in the server's POST /auth/guardian/login response. */
export interface GuardianUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: 'guardian';
  role: 'guardian';
  organizationId: string;
}

export interface GuardianSession {
  guardianId: string;
  user: GuardianUser;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/** Returns the cached session (from login), or null when logged out. */
export function getSession(): GuardianSession | null {
  if (!isBrowser()) return null;
  const token = getToken();
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as GuardianUser;
    return { guardianId: user.id, user };
  } catch {
    return null;
  }
}

/**
 * Logs a guardian in via POST /auth/guardian/login and stores the session.
 * Throws ApiError on bad credentials so callers can surface the message.
 */
export async function loginGuardian(email: string, password: string): Promise<GuardianSession> {
  const { apiFetch } = await import('./api-client');
  const { token, user } = await apiFetch<{ token: string; user: GuardianUser }>(
    '/auth/guardian/login',
    { method: 'POST', body: { email, password }, token: null },
  );
  setToken(token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return { guardianId: user.id, user };
}

/** Clears the stored session (redirect is the caller's job). */
export function logout(): void {
  clearToken();
}