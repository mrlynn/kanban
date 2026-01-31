'use client';

import { Providers } from '@/components/Providers';
import { AppShell } from '@/components/layout';

/**
 * App layout - includes Providers and AppShell
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
