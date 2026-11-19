'use client';

import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';

interface DoneStepProps {
  onComplete: () => void;
  busy: boolean;
}

export default function DoneStep({
  onComplete,
  busy,
}: DoneStepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] font-bold text-2xl">
          ✓
        </span>
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          Your workspace is ready
        </h2>
      </div>

      <p className="text-base leading-7 text-[var(--color-text-secondary)]">
        Everything is set up. Start by creating your first project.
      </p>

      {busy && (
        <Alert variant="info" title="Finalising setup…">
          Completing onboarding. Please wait.
        </Alert>
      )}

      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          loading={busy}
          disabled={busy}
          onClick={() => { void onComplete(); }}
        >
          Create a project
        </Button>
        <Link
          href="/app/projects"
          onClick={(event) => {
            event.preventDefault();
            void onComplete();
          }}
          className="w-full inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
        >
          Go to projects
        </Link>
      </div>
    </div>
  );
}
