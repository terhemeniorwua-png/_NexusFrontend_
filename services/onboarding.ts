import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

export type OnboardingStep =
  | 'welcome'
  | 'terms'
  | 'privacy'
  | 'profile'
  | 'invite'
  | 'ai'
  | 'done';

export interface OnboardingStatus {
  required: boolean;
  currentStep: OnboardingStep | null;
  completedAt: string | null;
  pendingLegal: { documentType: string; version: string }[];
  aiAccessEnabled: boolean;
  skippedSteps: string[];
}

export interface AcceptLegalInput {
  documentType: string;
  version: string;
}

export interface AdvanceStepInput {
  step: OnboardingStep;
  action: 'complete' | 'skip';
}

export interface UpdateAIAccessInput {
  enabled: boolean;
}

export interface UpdateAIAccessResult {
  aiAccessEnabled: boolean;
  aiAccessUpdatedAt: string | null;
}

async function authorizedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, authenticated: true });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}

/** Fetch the user's onboarding status. Used by the gate to resume mid-flow. */
export function getOnboardingStatus(): Promise<OnboardingStatus> {
  return authorizedRequest<OnboardingStatus>('/onboarding/status');
}

/** Accept a legal document (Terms or Privacy). */
export function acceptLegalDocument(input: AcceptLegalInput): Promise<OnboardingStatus> {
  return authorizedRequest<OnboardingStatus>('/onboarding/accept', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Mark a step as complete or skipped on the server. */
export function advanceStep(input: AdvanceStepInput): Promise<OnboardingStatus> {
  return authorizedRequest<OnboardingStatus>('/onboarding/step', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Enable or disable AI access for the user. */
export function updateAIAccess(input: UpdateAIAccessInput): Promise<UpdateAIAccessResult> {
  return authorizedRequest<UpdateAIAccessResult>('/onboarding/ai', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Finalise onboarding. Called from the Done step. */
export function completeOnboarding(): Promise<OnboardingStatus> {
  return authorizedRequest<OnboardingStatus>('/onboarding/complete', { method: 'POST' });
}
