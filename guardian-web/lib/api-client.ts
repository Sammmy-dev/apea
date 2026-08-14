/**
 * Typed fetch wrapper for the APEA API server.
 *
 * Base URL comes from NEXT_PUBLIC_API_URL (see .env.local.example); the
 * guardian JWT (lib/auth.ts) is attached automatically. Non-2xx responses
 * throw ApiError with the server's `{ error }` message so UI callers can
 * show it directly.
 */

import { getToken } from './auth';

export const API_URL: string = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** JSON-serialized as the request body. */
  body?: unknown;
  /** Override the token (pass null to force an unauthenticated call). */
  token?: string | null;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, token } = options;

  const tokenToUse = token === undefined ? getToken() : token;
  const requestHeaders: Record<string, string> = { ...headers };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (tokenToUse) requestHeaders['Authorization'] = `Bearer ${tokenToUse}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'cannot reach the APEA server — is it running?');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const message =
      (json && typeof json.error === 'string' ? json.error : null) ??
      `request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return json as T;
}

/** Convenience methods matching the server's REST routes. */
export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};