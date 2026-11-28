'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  advanceStep,
  completeOnboarding,
  getOnboardingStatus,
  type OnboardingStep,
  type OnboardingStatus,
} from '@/services/onboarding';
import type { Workspace } from '@/services/workspaces';

import WelcomeStep from './steps/WelcomeStep';
import TermsStep from './steps/TermsStep';
import PrivacyStep from './steps/PrivacyStep';
import ProfileStep from './steps/ProfileStep';
import InviteStep from './steps/InviteStep';
import AIStep from './steps/AIStep';
import DoneStep from './steps/DoneStep';

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  terms: 'Terms of Service',
  privacy: 'Privacy and policies',
  profile: 'Profile',
  invite: 'Invite teammates',
  ai: 'AI access',
  done: 'Done',
};

const STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  welcome: 'Set up your workspace in two minutes.',
  terms: 'Review and accept the Terms of Service.',
  privacy: 'Review our privacy policies.',
  profile: 'Tell us about yourself.',
  invite: 'Invite teammates to your workspace.',
  ai: 'Configure AI access for your workspace.',
  done: 'Your workspace is ready.',
};

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Called when the returned OnboardingStatus has required === false, so the
   * shell can close the modal immediately without a page reload.
   */
  onComplete: (status?: OnboardingStatus) => void;
  userName: string;
  userEmail: string;
  workspace: Workspace | null;
}

export function OnboardingModal({
  open,
  onComplete,
  userName,
  workspace,
}: OnboardingModalProps) {
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [stepError, setStepError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stepKey, setStepKey] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  const includeInviteStep =
    workspace != null && workspace.type !== 'INDIVIDUAL' && !workspace.isPersonal;

  const steps = useMemo(() => {
    const s: OnboardingStep[] = ['welcome', 'terms', 'privacy', 'profile'];
    if (includeInviteStep) s.push('invite');
    s.push('ai', 'done');
    return s;
  }, [includeInviteStep]);

  const currentIndex = steps.indexOf(currentStep);
  const stepNumber = Math.max(currentIndex, 0) + 1;
  const totalSteps = steps.length;
  const isFirstStep = currentIndex <= 0;
  const isLastStep = currentIndex >= steps.length - 1;

  // Terms and Privacy are legally required and cannot be skipped or dismissed.
  const requiredSteps = new Set(['terms', 'privacy']);
  const isRequired = requiredSteps.has(currentStep);
  const showSkip = !isRequired && !isLastStep;

  // Scroll the body to the top whenever the step changes (P1 fix).
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [currentStep, stepKey]);

  // Fetch onboarding status when the modal opens so the user resumes at the
  // current step rather than always restarting at Welcome. Progress lives on
  // the server, never in localStorage.
  useEffect(() => {
    if (!open) return;
    let active = true;
    async function load() {
      try {
        const result = await getOnboardingStatus();
        if (!active) return;
        const serverStep = result.currentStep;
        if (serverStep && steps.includes(serverStep)) {
          setCurrentStep(serverStep);
        }
        setStatusError(null);
      } catch (cause) {
        if (!active) return;
        setStatusError(
          cause instanceof Error ? cause.message : 'Unable to load onboarding status.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [open, steps]);

  /**
   * Apply a fresh OnboardingStatus returned by an action.
   * If the status says required === false, tell the shell to close immediately.
   */
  const applyStatus = useCallback(
    (status: OnboardingStatus | null | undefined) => {
      if (!status) return;
      if (status.required === false || status.completedAt != null) {
        onComplete(status);
        return;
      }
      const serverStep = status.currentStep;
      if (serverStep && steps.includes(serverStep)) {
        setCurrentStep(serverStep);
        setStepKey((k) => k + 1);
      }
    },
    [onComplete, steps],
  );

  const handleAdvance = useCallback(
    async (step: OnboardingStep, action: 'complete' | 'skip' = 'complete') => {
      setStepError(null);
      setBusy(true);
      try {
        // P2 fix: apply the returned status so the next step renders immediately.
        const status = await advanceStep({ step, action });
        const nextIndex = currentIndex + 1;
        if (nextIndex < steps.length) {
          setStepKey((k) => k + 1);
          setCurrentStep(steps[nextIndex]);
        }
        // Also update the shell with the latest status (closes modal if done).
        applyStatus(status);
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : 'Could not complete this step.';
        setStepError(message);
      } finally {
        setBusy(false);
      }
    },
    [currentIndex, steps, applyStatus],
  );

  const handleDone = useCallback(async () => {
    setStepError(null);
    setBusy(true);
    try {
      const status = await completeOnboarding();
      onComplete(status);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Could not complete onboarding.';
      setStepError(message);
    } finally {
      setBusy(false);
    }
  }, [onComplete]);

  const handleBack = useCallback(() => {
    if (isFirstStep) return;
    const prevIndex = currentIndex - 1;
    setStepKey((k) => k + 1);
    setCurrentStep(steps[prevIndex]);
  }, [currentIndex, steps, isFirstStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            key={stepKey}
            userName={userName}
            onComplete={() => void handleAdvance('welcome')}
            busy={busy}
          />
        );
      case 'terms':
        return (
          <TermsStep
            key={stepKey}
            onComplete={() => void handleAdvance('terms')}
            onError={setStepError}
            busy={busy}
          />
        );
      case 'privacy':
        return (
          <PrivacyStep
            key={stepKey}
            onComplete={() => void handleAdvance('privacy')}
            onError={setStepError}
            busy={busy}
          />
        );
      case 'profile':
        return (
          <ProfileStep
            key={stepKey}
            userName={userName}
            onComplete={(action) => void handleAdvance('profile', action)}
            onError={setStepError}
            busy={busy}
          />
        );
      case 'invite':
        return (
          <InviteStep
            key={stepKey}
            workspace={workspace}
            onComplete={(action) => void handleAdvance('invite', action)}
            onError={setStepError}
            busy={busy}
          />
        );
      case 'ai':
        return (
          <AIStep
            key={stepKey}
            onComplete={(action) => void handleAdvance('ai', action)}
            onError={setStepError}
            busy={busy}
          />
        );
      case 'done':
        return (
          <DoneStep
            key={stepKey}
            onComplete={handleDone}
            busy={busy}
          />
        );
      default:
        return null;
    }
  };

  const progressPct = totalSteps > 0 ? (stepNumber / totalSteps) * 100 : 0;
  const continueLabel = isLastStep ? 'Finish setup' : 'Continue';

  if (!open) return null;

  return (
    // Overlay: fixed, inset-0, overflow-y-auto so the modal is always reachable
    // even on very small screens where the modal approaches full height.
    <div
      role="presentation"
      className="fixed inset-0 z-[var(--z-modal)] overflow-y-auto flex items-start sm:items-center justify-center p-4"
    >
      {/* Dimmed backdrop */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" />

      {/* Dialog panel: flex column, max-height bounded to viewport */}
      <div
        role="dialog"
        aria-labelledby="onboarding-modal-title"
        aria-describedby="onboarding-modal-desc"
        className={[
          'relative z-10 w-full max-w-[600px]',
          'flex flex-col',
          // P1 fix: cap height so the modal never overflows the viewport.
          // calc(100dvh - 2rem) leaves 1 rem of breathing room top and bottom.
          'max-h-[calc(100dvh-2rem)]',
          'rounded-[var(--radius-xl)]',
          'bg-[var(--color-surface)] shadow-[var(--shadow-lg)]',
        ].join(' ')}
      >
        {/* ── Fixed header ── */}
        <div className="flex-shrink-0 border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="onboarding-modal-title"
                className="text-base font-semibold text-[var(--color-text-primary)]"
              >
                {STEP_LABELS[currentStep] ?? 'Onboarding'}
              </h2>
              <p
                id="onboarding-modal-desc"
                className="mt-0.5 text-sm text-[var(--color-text-secondary)]"
              >
                {STEP_DESCRIPTIONS[currentStep] ?? ''}
              </p>
            </div>
          </div>
        </div>

        {/* ── Fixed progress bar ── */}
        <div className="flex-shrink-0 px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              Step {stepNumber} of {totalSteps}
            </p>
            {statusError && (
              <span className="text-xs text-[var(--color-error)]">{statusError}</span>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuenow={stepNumber}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            className="w-full h-1.5 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden"
          >
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* ── Scrollable body ── */}
        {/* min-h-0 is required for flex children to shrink below their content size */}
        <div
          ref={bodyRef}
          className="flex-1 min-h-0 overflow-y-auto px-5 py-4"
        >
          {/* Status error */}
          {statusError && (
            <div className="mb-4">
              <Alert variant="error" title="Unable to load onboarding">
                {statusError}
              </Alert>
            </div>
          )}

          {/* Step error with retry */}
          {stepError && (
            <div className="mb-4" role="alert">
              <Alert variant="error" title="Unable to complete step">
                <span>{stepError}</span>{' '}
                <button
                  type="button"
                  onClick={() => setStepError(null)}
                  className="ml-1 underline text-xs"
                >
                  Dismiss
                </button>
              </Alert>
            </div>
          )}

          {/* Step content */}
          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            renderStep()
          )}
        </div>

        {/* ── Fixed footer with action buttons ── */}
        <div
          data-testid="onboarding-footer"
          className="flex-shrink-0 flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3"
        >
          {!isFirstStep ? (
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={handleBack}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          <span className="text-xs text-[var(--color-text-secondary)]">
            {isRequired ? 'Required step' : showSkip ? 'Optional step' : ''}
          </span>
          <Button
            size="md"
            loading={busy}
            disabled={busy}
            onClick={() => {
              if (showSkip) {
                void handleAdvance(currentStep, 'skip');
              } else if (isLastStep) {
                void handleDone();
              } else {
                void handleAdvance(currentStep, 'complete');
              }
            }}
          >
            {showSkip ? 'Skip for now' : continueLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
