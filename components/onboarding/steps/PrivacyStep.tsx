'use client';

import { useCallback, useState } from 'react';
import { acceptLegalDocument } from '@/services/onboarding';
import { legalPolicies } from '@/lib/legal-policies';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';

interface PrivacyStepProps {
  onComplete: () => void;
  onError: (message: string) => void;
  busy: boolean;
}

export default function PrivacyStep({
  onComplete,
  onError,
  busy,
}: PrivacyStepProps) {
  const policy = legalPolicies.privacy;
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [agreed, setAgreed] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const toggleSection = useCallback((id: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isOpen = (id: string) => openSections.has(id);

  const handleAccept = async () => {
    setAcceptError(null);
    try {
      await acceptLegalDocument({ documentType: 'privacy', version: '1.0' });
      onComplete();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Could not accept privacy policy.';
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

      <div className="space-y-3">
        {policy.sections.map((section) => (
          <section
            key={section.id}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
          >
            <button
              type="button"
              onClick={() => { void toggleSection(section.id); }}
              className={[
                'flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold',
                'text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-border)] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
              ].join(' ')}
              aria-expanded={isOpen(section.id)}
              aria-controls={`onboarding-privacy-${section.id}`}
            >
              {section.heading}
              <span
                className={[
                  'ml-auto flex-shrink-0 size-5',
                  isOpen(section.id)
                    ? 'rotate-180'
                    : '',
                ].join(' ')}
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>
            {isOpen(section.id) && (
              <div className="border-t border-[var(--color-border)] px-4 py-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {section.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                {section.bullets && (
                  <ul className="list-disc space-y-1 pl-4 mt-2">
                    {section.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        ))}
      </div>

      {acceptError && (
        <Alert variant="error" title="Could not accept privacy policy">
          {acceptError}
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Checkbox
          id="onboarding-privacy-agree"
          label="I accept the Privacy Policy"
          checked={agreed}
          onChange={(event) => { setAgreed(event.target.checked); }}
          disabled={busy}
          description="You must accept the Privacy Policy to continue."
        />
      </div>

      <Button
        size="lg"
        className="w-full"
        loading={busy}
        disabled={busy || !agreed || acceptError != null}
        onClick={() => { void handleAccept(); }}
      >
        I accept
      </Button>
    </div>
  );
}
