'use client';

import { useState } from 'react';
import { updateAIAccess } from '@/services/onboarding';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface AIStepProps {
  onComplete: (action: 'complete' | 'skip') => void;
  onError: (message: string) => void;
  busy: boolean;
}

export default function AIStep({
  onComplete,
  onError,
  busy,
}: AIStepProps) {
  const [enabled, setEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleToggle = async () => {
    const next = !enabled;
    setToggling(true);
    setAiError(null);
    try {
      await updateAIAccess({ enabled: next });
      setEnabled(next);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Could not update AI access.';
      setAiError(message);
      onError(message);
    } finally {
      setToggling(false);
    }
  };

  const handleContinue = () => {
    onComplete('complete');
  };

  const handleSkip = () => {
    onComplete('skip');
  };

  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
        AI access for your workspace
      </p>
      <p className="text-base leading-7 text-[var(--color-text-secondary)]">
        PITERON AI can help summarise tasks, draft replies, and surface activity across
        your workspace. It only sees tasks, comments, and workspace activity that you are
        already authorised to access. It cannot see your private files, passwords, or
        personal messages outside of shared workspaces.
      </p>

      {aiError && (
        <Alert variant="error" title="Could not update AI access">{aiError}</Alert>
      )}

      <div className="flex items-center gap-3">
        <Checkbox
          id="onboarding-ai-access"
          label="Enable AI assistance for this workspace"
          checked={enabled}
          onChange={() => { void handleToggle(); }}
          disabled={busy || toggling}
          description="Off by default. You can enable or disable AI at any time in Settings."
        />
      </div>

      <p className="text-xs text-[var(--color-text-secondary)]">
        AI is off by default. Turning it on allows AI to read authorised workspace content
        to provide suggestions and summaries.
      </p>

      {toggling && (
        <p className="text-sm text-[var(--color-text-secondary)]">Updating AI settings…</p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="secondary"
          size="md"
          disabled={busy || toggling}
          onClick={() => { void handleSkip(); }}
        >
          Skip for now
        </Button>
        <Button
          size="md"
          loading={busy || toggling}
          disabled={busy || toggling}
          onClick={() => { void handleContinue(); }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
