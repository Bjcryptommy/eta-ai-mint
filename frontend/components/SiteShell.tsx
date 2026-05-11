import { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-[1050px] px-4 py-8 md:px-6 md:py-10">{children}</main>
    </div>
  );
}
