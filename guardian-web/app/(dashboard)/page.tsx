'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChildCard, { type ChildCardData } from '@/components/ChildCard';
import { api, ApiError } from '@/lib/api-client';

/**
 * Guardian dashboard (PRD §7.1 user story): card grid of the guardian's
 * linked children from GET /guardian-student-links/me. Generous spacing
 * between cards (DESIGN.md §Layout & Spacing — prevents mis-tapping).
 */
export default function DashboardPage() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildCardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<ChildCardData[]>('/guardian-student-links/me');
        if (!cancelled) setChildren(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'could not load your children');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-container py-8">
      <h1 className="text-headline-lg-mobile font-bold text-on-surface md:text-headline-lg">
        Your children
      </h1>
      <p className="text-body-md text-on-surface-variant">
        Tap a child to manage who can pick them up.
      </p>

      {error && (
        <p className="mt-4 rounded bg-error-container px-3 py-2 text-label-bold text-on-error-container">
          {error}
        </p>
      )}

      {children === null && !error && (
        <p className="mt-8 text-body-md text-on-surface-variant">Loading…</p>
      )}

      {children !== null && children.length === 0 && (
        <div className="mt-8 rounded border border-border bg-surface p-gutter text-center">
          <p className="text-body-md font-semibold text-on-surface">
            No children are linked to your account yet.
          </p>
          <p className="text-body-md text-on-surface-variant">
            Contact your school to link your child.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {children?.map((child) => (
          <ChildCard key={child.linkId} child={child} />
        ))}
      </div>
    </main>
  );
}