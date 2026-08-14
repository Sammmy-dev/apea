'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthInput from '@/components/auth/AuthInput';
import { ApiError, apiFetch } from '@/lib/api-client';
import { loginGuardian } from '@/lib/auth';

/**
 * Claim-token flow (PRD §7.2 / roster upload): a guardian invited by the
 * school admin activates their account with the invite code from the
 * roster import, sets a password, and is signed in immediately.
 */
export default function ActivatePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [claimToken, setClaimToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const activated = await apiFetch<{ id: string; name: string; email: string }>(
        '/guardians/activate',
        { method: 'POST', body: { claimToken: claimToken.trim(), password }, token: null },
      );
      // Activation succeeds without a JWT — sign the new account straight in.
      await loginGuardian(activated.email, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'something went wrong — try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-headline-lg-mobile font-bold text-on-surface md:text-headline-lg">
          Activate your account
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Your school invited you to APEA. Enter the invite code from the
          notification you received, then choose a password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && (
          <p className="rounded bg-error-container px-3 py-2 text-label-bold text-on-error-container">
            {error}
          </p>
        )}

        <AuthInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthInput
          id="claim-token"
          label="Invite code"
          autoComplete="off"
          placeholder="Paste the code from your invitation"
          value={claimToken}
          onChange={(e) => setClaimToken(e.target.value)}
          required
        />
        <AuthInput
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AuthInput
          id="confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded bg-primary font-bold text-on-primary hover:bg-primary/90 disabled:opacity-40"
        >
          {submitting ? 'Activating…' : 'Activate account'}
        </button>
      </form>

      <p className="text-center text-body-md text-on-surface-variant">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}