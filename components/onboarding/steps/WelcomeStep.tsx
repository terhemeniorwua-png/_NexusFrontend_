'use client';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface WelcomeStepProps {
  userName: string;
  onComplete: () => void;
  busy: boolean;
}

export default function WelcomeStep({
  userName,
  onComplete,
  busy,
}: WelcomeStepProps) {
  const displayName = userName && userName.trim().length > 0 ? userName.trim() : 'there';

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold text-xl">
          P
        </span>
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          Welcome, {displayName}
        </h2>
      </div>

      <p className="text-base leading-7 text-[var(--color-text-secondary)]">
        Two minutes to set up your workspace. We’ll guide you through the essentials so you
        can start collaborating right away.
      </p>

      {busy && (
        <Alert variant="info" title="Getting started…">
          Preparing your workspace. Please wait.
        </Alert>
      )}

      <Button
        size="lg"
        className="w-full"
        loading={busy}
        disabled={busy}
        onClick={() => { void onComplete(); }}
      >
        Continue
      </Button>
    </div>
  );
}
