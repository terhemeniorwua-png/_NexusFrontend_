'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  advanceStep,
  completeOnboarding,
  getOnboardingStatus,
  type OnboardingStep,
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
  onComplete: () => void;
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
  const [busyStep, setBusyStep] = useState<OnboardingStep | null>(null);
  const [direction, setDirection] = useState<'next' | 'back' | null>(null);
  const [stepKey, setStepKey] = useState(0);

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

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => { setPrefersReducedMotion(mq.matches); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

  // The modal is never dismissible mid-flow. Escape / backdrop / X are no-ops
  // until onboarding completes (onClose is only invoked from Done).
  const handleClose = useCallback(() => {
    // Intentional no-op: the flow must be completed before the modal closes.
  }, []);

  const handleAdvance = useCallback(
    async (step: OnboardingStep, action: 'complete' | 'skip' = 'complete') => {
      setStepError(null);
      setBusyStep(step);
      setDirection('next');
      try {
        await advanceStep({ step, action });
        const nextIndex = currentIndex + 1;
        if (nextIndex < steps.length) {
          setStepKey((k) => k + 1);
          setCurrentStep(steps[nextIndex]);
        }
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : 'Could not complete this step.';
        setStepError(message);
      } finally {
        setBusyStep(null);
      }
    },
    [currentIndex, steps],
  );

  const handleDone = useCallback(async () => {
    setStepError(null);
    setBusyStep('done');
    setDirection('next');
    try {
      await completeOnboarding();
      onComplete();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Could not complete onboarding.';
      setStepError(message);
    } finally {
      setBusyStep(null);
    }
  }, [onComplete]);

  const handleBack = useCallback(() => {
    if (isFirstStep) return;
    setDirection('back');
    const prevIndex = currentIndex - 1;
    setStepKey((k) => k + 1);
    setCurrentStep(steps[prevIndex]);
  }, [currentIndex, steps, isFirstStep]);

  const stepTitle = STEP_LABELS[currentStep] ?? 'Onboarding';
  const stepDescription = STEP_DESCRIPTIONS[currentStep] ?? '';
  const isRequired = requiredSteps.has(currentStep);
  const showSkip = !isRequired && !isLastStep;

  const continueLabel = isLastStep ? 'Finish setup' : 'Continue';

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            key={stepKey}
            userName={userName}
            onComplete={() => void handleAdvance('welcome')}
            busy={busyStep === 'welcome'}
          />
        );
      case 'terms':
        return (
          <TermsStep
            key={stepKey}
            onComplete={() => void handleAdvance('terms')}
            onError={setStepError}
            busy={busyStep === 'terms'}
          />
        );
      case 'privacy':
        return (
          <PrivacyStep
            key={stepKey}
            onComplete={() => void handleAdvance('privacy')}
            onError={setStepError}
            busy={busyStep === 'privacy'}
          />
        );
      case 'profile':
        return (
          <ProfileStep
            key={stepKey}
            userName={userName}
            onComplete={(action) => void handleAdvance('profile', action)}
            onError={setStepError}
            busy={busyStep === 'profile'}
          />
        );
      case 'invite':
        return (
          <InviteStep
            key={stepKey}
            workspace={workspace}
            onComplete={(action) => void handleAdvance('invite', action)}
            onError={setStepError}
            busy={busyStep === 'invite'}
          />
        );
      case 'ai':
        return (
          <AIStep
            key={stepKey}
            onComplete={(action) => void handleAdvance('ai', action)}
            onError={setStepError}
            busy={busyStep === 'ai'}
          />
        );
      case 'done':
        return (
          <DoneStep
            key={stepKey}
            onComplete={handleDone}
            busy={busyStep === 'done'}
          />
        );
      default:
        return null;
    }
  };

  const progressPct = totalSteps > 0 ? (stepNumber / totalSteps) * 100 : 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={stepTitle}
      description={stepDescription}
      maxWidth="lg"
      className="max-w-[600px]"
    >
      {/* Progress indicator */}
      <div className="px-5 py-3 border-b border-[var(--color-border)]">
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

      {/* Status error alert */}
      {statusError && (
        <div className="px-5 pt-4 pb-2">
          <Alert variant="error" title="Unable to load onboarding">
            {statusError}
          </Alert>
        </div>
      )}

      {/* Step error alert */}
      {stepError && (
        <div className="px-5 pt-2 pb-2">
          <Alert variant="error" title="Unable to complete step">
            {stepError}
          </Alert>
        </div>
      )}

      {/* Step content */}
      <div
        className={[
          'flex-1 overflow-y-auto px-5 py-4',
          'transition-opacity duration-200 ease-in-out',
          prefersReducedMotion ? 'duration-0' : '',
          direction === null ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {loading && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {!loading && renderStep()}
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3">
        {!isFirstStep && (
          <Button
            variant="secondary"
            size="md"
            disabled={busyStep != null}
            onClick={handleBack}
          >
            Back
          </Button>
        )}
        <span className="text-xs text-[var(--color-text-secondary)]">
          {isRequired ? 'Required step' : showSkip ? 'Optional step' : ''}
        </span>
        <Button
          size="md"
          loading={busyStep != null}
          disabled={busyStep != null}
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
    </Modal>
  );
}
