'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getSession, logout } from '@/lib/auth';

/** Dashboard top bar: logo, guardian name, sign-out. Flat per DESIGN.md. */
export default function DashboardHeader() {
  const router = useRouter();
  const session = getSession();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-container">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="APEA" width={32} height={32} className="rounded" priority />
          <span className="text-label-bold text-on-surface">APEA</span>
        </div>
        <div className="flex items-center gap-4">
          {session && (
            <span className="hidden text-label-sm text-on-surface-variant sm:block">
              {session.user.name}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="h-12 rounded border border-border px-4 text-label-bold text-primary transition-colors hover:border-primary"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}