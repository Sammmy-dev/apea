'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type ChildCardData } from '@/components/ChildCard';
import { api, ApiError } from '@/lib/api-client';

/** Hub navigation card into a child's management areas. */
function HubCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded border border-border bg-surface p-6 transition-colors hover:border-primary"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-headline-md font-semibold text-on-surface">{title}</p>
        <p className="text-body-md text-on-surface-variant">{description}</p>
      </div>
      <span aria-hidden className="text-headline-md font-semibold text-primary">
        ›
      </span>
    </Link>
  );
}

/**
 * Child detail hub: identity header + navigation into "Authorized people"
 * and "Pickup history" (PRD folder structure / user stories).
 */
export default function ChildDetailPage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const [link, setLink] = useState<ChildCardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const links = await api.get<ChildCardData[]>('/guardian-student-links/me');
        const match = links.find((l) => l.student && l.student.id === params.studentId) ?? null;
        if (cancelled) return;
        if (!match) {
          setError('We could not find that child on your account.');
          return;
        }
        setLink(match);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'could not load this child');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.studentId, router]);

  const s = link?.student;
  const initials = s ? `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase() : '';

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-container py-8">
      <Link
        href="/"
        className="text-label-bold text-primary transition-colors hover:underline"
      >
        ‹ Your children
      </Link>

      {error && (
        <p className="mt-4 rounded bg-error-container px-3 py-2 text-label-bold text-on-error-container">
          {error}
        </p>
      )}

      {!link && !error && <p className="mt-8 text-body-md text-on-surface-variant">Loading…</p>}

      {link && s && (
        <>
          <div className="mt-6 flex items-center gap-4">
            {s.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external S3 URLs
              <img src={s.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-surface-container text-headline-md font-bold text-on-surface-variant">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-headline-lg-mobile font-bold text-on-surface md:text-headline-lg">
                {s.firstName} {s.lastName}
              </h1>
              <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                {s.classGrade ?? '—'} · {link.schoolName ?? 'School'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
              Your relationship: {link.relationship}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <HubCard
              href={`/children/${s.id}/authorized-people`}
              title="Authorized people"
              description="Manage who may pick up your child — add, revoke, or view their digital IDs."
            />
            <HubCard
              href={`/children/${s.id}/history`}
              title="Pickup history"
              description="See every pickup event and SMS notification for this child."
            />
          </div>
        </>
      )}
    </main>
  );
}