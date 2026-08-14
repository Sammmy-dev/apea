import type { ReactNode } from 'react';
import DashboardHeader from '@/components/DashboardHeader';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <DashboardHeader />
      {children}
    </div>
  );
}