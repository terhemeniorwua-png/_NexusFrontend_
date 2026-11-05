import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InvitationAcceptClient } from './InvitationAcceptClient';

export const metadata: Metadata = {
  title: 'Workspace invitation',
  robots: { index: false, follow: false },
};

export default function InvitationAcceptPage() {
  return (
    <Suspense
      fallback={(
        <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-8">
          <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading invitation…</p>
        </main>
      )}
    >
      <InvitationAcceptClient />
    </Suspense>
  );
}
