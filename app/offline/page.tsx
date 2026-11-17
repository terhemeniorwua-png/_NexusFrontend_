import Link from 'next/link';

export const metadata = {
  title: 'Offline',
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-6 py-16">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Offline</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">You are offline</h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          Nexus could not reach the network. Check your connection and try again. Previously loaded static
          pages and assets may still be available, but workspace data requires an internet connection.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/app"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white"
          >
            Try again
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text-primary)]"
          >
            Go to home
          </Link>
        </div>
      </div>
    </main>
  );
}
