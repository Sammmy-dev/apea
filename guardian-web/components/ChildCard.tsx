import Link from 'next/link';

/** Shape of one entry from GET /guardian-student-links/me. */
export interface ChildCardData {
  linkId: string;
  relationship: string;
  isPrimary: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classGrade: string | null;
    photoUrl: string | null;
  } | null;
  schoolName: string | null;
}

/**
 * Dashboard child card (DESIGN.md §Cards): white card, 1px border, 64px
 * square photo, name + grade; the entire card is the tap target. Missing
 * photos fall back to a square grayscale placeholder with initials
 * (§Photo Placeholders — square, never circular).
 */
export default function ChildCard({ child }: { child: ChildCardData }) {
  const s = child.student;
  if (!s) return null;

  const initials = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();

  return (
    <Link
      href={`/children/${s.id}`}
      className="flex items-center gap-4 rounded border border-border bg-surface p-gutter transition-colors hover:border-primary"
    >
      {s.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external S3 URLs, next/image needs domain config
        <img src={s.photoUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-surface-container text-headline-md font-bold text-on-surface-variant">
          {initials}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-headline-md font-semibold text-on-surface">
          {s.firstName} {s.lastName}
        </p>
        <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
          {s.classGrade ?? '—'} · {child.schoolName ?? 'School'}
        </p>
      </div>

      <span aria-hidden className="text-headline-md font-semibold text-primary">
        ›
      </span>
    </Link>
  );
}