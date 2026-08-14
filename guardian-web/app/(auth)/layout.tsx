import type { ReactNode } from 'react';
import Image from 'next/image';

/**
 * Auth shell (login / activation): calm, institutional and minimal per
 * DESIGN.md — off-white page, single white card, 1px border, no shadows,
 * 24px mobile safe-zone margin, 48px+ touch targets inside the forms.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-container">
      <div className="mb-8 flex flex-col items-center gap-1.5">
        <Image
          src="/logo.png"
          alt="APEA logo"
          width={64}
          height={64}
          priority
          className="rounded"
        />
        <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
          School pickup verification
        </p>
      </div>
      <div className="w-full max-w-md rounded border border-border bg-surface p-gutter md:p-8">
        {children}
      </div>
    </main>
  );
}