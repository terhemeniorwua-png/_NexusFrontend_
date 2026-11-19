'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { acceptLegalDocument } from '@/services/onboarding';
import { legalPolicies } from '@/lib/legal-policies';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';

interface TermsStepProps {
  onComplete: () => void;
  onError: (message: string) => void;
  busy: boolean;
}

export default function TermsStep({
  onComplete,
  onError,
  busy,
}: TermsStepProps) {
  const policy = legalPolicies.terms;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    setScrolledToBottom(atBottom);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    el?.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => el?.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const canAccept = scrolledToBottom || agreed;

  const handleAccept = async () => {
    setAcceptError(null);
    try {
      await acceptLegalDocument({ documentType: 'terms', version: '1.0' });
      onComplete();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Could not accept terms.';
      setAcceptError(message);
      onError(message);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
        {policy.title}
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">{policy.summary}</p>

      <div
        ref={containerRef}
        className="max-h-64 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]"
      >
        {policy.sections.map((section) => (
          <section key={section.id} className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {section.heading}
            </h3>
            <div className="mt-1 space-y-2">
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {section.bullets && (
                <ul className="list-disc space-y-1 pl-4">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>

      {acceptError && (
        <Alert variant="error" title="Could not accept terms">{acceptError}</Alert>
      )}

      <div className="flex items-center gap-3">
        <Checkbox
          id="onboarding-terms-agree"
          label="I have read and agree to the Terms of Service"
          checked={agreed}
          onChange={(event) => { setAgreed(event.target.checked); }}
          disabled={busy}
          description="You must accept the Terms of Service to continue."
        />
      </div>

      <p className="text-xs text-[var(--color-text-secondary)]">
        Or scroll to the bottom of the terms above to enable acceptance.
      </p>

      <Button
        size="lg"
        className="w-full"
        loading={busy}
        disabled={busy || !canAccept || acceptError != null}
        onClick={() => { void handleAccept(); }}
      >
        I accept
      </Button>
    </div>
  );
}
