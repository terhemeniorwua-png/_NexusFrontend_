import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingModal } from '../OnboardingModal';
import type { Workspace } from '@/services/workspaces';
import type { OnboardingStatus } from '@/services/onboarding';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getOnboardingStatus: vi.fn(),
  advanceStep: vi.fn(),
  completeOnboarding: vi.fn(),
  acceptLegalDocument: vi.fn(),
  updateAIAccess: vi.fn(),
}));

vi.mock('@/services/onboarding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/onboarding')>();
  return { ...actual, ...mocks };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE: Workspace = {
  id: 'ws-1',
  name: 'Acme',
  slug: 'acme',
  description: null,
  type: 'COMPANY',
  isPersonal: false,
  visibility: 'PRIVATE',
  status: 'ACTIVE',
  ownerId: 'owner-1',
  role: 'OWNER',
  organizationRole: null,
  joinCodeEnabled: false,
  memberCount: 1,
  projectCount: 0,
  teamCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeStatus(overrides: Partial<OnboardingStatus> = {}): OnboardingStatus {
  return {
    required: true,
    currentStep: 'welcome',
    completedAt: null,
    pendingLegal: [],
    aiAccessEnabled: false,
    skippedSteps: [],
    ...overrides,
  };
}

function renderModal(props: Partial<React.ComponentProps<typeof OnboardingModal>> = {}) {
  const onComplete = vi.fn();
  const onClose = vi.fn();
  render(
    <OnboardingModal
      open={true}
      onClose={onClose}
      onComplete={onComplete}
      userName="Alice"
      userEmail="alice@example.com"
      workspace={WORKSPACE}
      {...props}
    />,
  );
  return { onComplete, onClose };
}

/** Get the footer's primary action button (Continue / Skip / Finish). */
function footerPrimaryButton() {
  const footer = screen.getByTestId('onboarding-footer');
  return within(footer).getByRole('button', { name: /continue|skip for now|finish setup/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OnboardingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOnboardingStatus.mockResolvedValue(makeStatus({ currentStep: 'welcome' }));
    mocks.advanceStep.mockResolvedValue(makeStatus({ currentStep: 'terms' }));
    mocks.completeOnboarding.mockResolvedValue(
      makeStatus({ required: false, completedAt: '2026-01-01T00:00:00Z' }),
    );
    mocks.acceptLegalDocument.mockResolvedValue(makeStatus({ currentStep: 'terms' }));
    mocks.updateAIAccess.mockResolvedValue({ aiAccessEnabled: true, aiAccessUpdatedAt: null });
  });

  // -------------------------------------------------------------------------
  // P2: Next step renders after each action
  // -------------------------------------------------------------------------

  it('renders the next step after completing Welcome (footer Continue)', async () => {
    const user = userEvent.setup();
    mocks.advanceStep.mockResolvedValueOnce(makeStatus({ currentStep: 'terms' }));
    renderModal();

    await waitFor(() => expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument());

    await user.click(footerPrimaryButton());

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument(),
    );
  });

  it('renders the next step after acceptLegalDocument succeeds (Terms step)', async () => {
    const user = userEvent.setup();
    mocks.getOnboardingStatus.mockResolvedValue(makeStatus({ currentStep: 'terms' }));
    mocks.advanceStep.mockResolvedValueOnce(makeStatus({ currentStep: 'privacy' }));
    mocks.acceptLegalDocument.mockResolvedValueOnce(makeStatus({ currentStep: 'terms' }));

    renderModal();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('checkbox', { name: /i have read and agree/i }));
    await user.click(screen.getByRole('button', { name: /i accept/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /privacy/i })).toBeInTheDocument(),
    );
  });

  it('renders the next step after skipping an optional step (footer Skip)', async () => {
    const user = userEvent.setup();
    mocks.getOnboardingStatus.mockResolvedValue(makeStatus({ currentStep: 'invite' }));
    mocks.advanceStep.mockResolvedValueOnce(makeStatus({ currentStep: 'ai' }));

    renderModal();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /invite/i })).toBeInTheDocument(),
    );

    // The footer shows "Skip for now" for optional steps
    await user.click(footerPrimaryButton());

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /ai access/i })).toBeInTheDocument(),
    );
  });

  it('renders the next step after the AI step (footer Continue)', async () => {
    const user = userEvent.setup();
    mocks.getOnboardingStatus.mockResolvedValue(makeStatus({ currentStep: 'ai' }));
    mocks.advanceStep.mockResolvedValueOnce(makeStatus({ currentStep: 'done' }));

    renderModal();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /ai access/i })).toBeInTheDocument(),
    );

    // The footer renders "Skip for now" for the AI step (optional)
    await user.click(footerPrimaryButton());

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /done/i })).toBeInTheDocument(),
    );
  });

  it('calls onComplete and closes the modal when completeOnboarding returns required=false', async () => {
    const user = userEvent.setup();
    mocks.getOnboardingStatus.mockResolvedValue(makeStatus({ currentStep: 'done' }));
    mocks.completeOnboarding.mockResolvedValueOnce(
      makeStatus({ required: false, completedAt: '2026-01-01T00:00:00Z' }),
    );

    const { onComplete } = renderModal();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /done/i })).toBeInTheDocument(),
    );

    await user.click(footerPrimaryButton()); // "Finish setup"

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const calledWith = onComplete.mock.calls[0]?.[0] as OnboardingStatus | undefined;
    expect(calledWith?.required).toBe(false);
  });

  // -------------------------------------------------------------------------
  // P2: Error shows inline with dismiss
  // -------------------------------------------------------------------------

  it('shows an inline error and does not advance the step when advanceStep fails', async () => {
    const user = userEvent.setup();
    mocks.getOnboardingStatus.mockResolvedValue(makeStatus({ currentStep: 'profile' }));
    mocks.advanceStep.mockRejectedValueOnce(new Error('Server error'));

    renderModal();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument(),
    );

    await user.click(footerPrimaryButton());

    await waitFor(() =>
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0),
    );
    expect(screen.getByText('Server error')).toBeInTheDocument();
    // Still on the same step
    expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
  });

  it('allows dismissing the step error', async () => {
    const user = userEvent.setup();
    mocks.getOnboardingStatus.mockResolvedValue(makeStatus({ currentStep: 'profile' }));
    mocks.advanceStep.mockRejectedValueOnce(new Error('Something went wrong'));

    renderModal();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument(),
    );

    await user.click(footerPrimaryButton());
    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    await waitFor(() =>
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument(),
    );
  });

  // -------------------------------------------------------------------------
  // P2: Buttons disabled while request in flight
  // -------------------------------------------------------------------------

  it('disables the footer action button while a request is in flight', async () => {
    const user = userEvent.setup();
    mocks.getOnboardingStatus.mockResolvedValue(makeStatus({ currentStep: 'profile' }));

    let resolve!: (v: OnboardingStatus) => void;
    mocks.advanceStep.mockReturnValueOnce(
      new Promise<OnboardingStatus>((res) => { resolve = res; }),
    );

    renderModal();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument(),
    );

    const btn = footerPrimaryButton();
    await user.click(btn);

    // Button should now be disabled
    expect(btn).toBeDisabled();

    resolve(makeStatus({ currentStep: 'ai' }));
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  // -------------------------------------------------------------------------
  // P1: Body scroll resets on step change
  // -------------------------------------------------------------------------

  it('resets body scroll to top when the step changes', async () => {
    const user = userEvent.setup();
    mocks.advanceStep.mockResolvedValueOnce(makeStatus({ currentStep: 'terms' }));

    renderModal();
    await waitFor(() => expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument());

    // Find the scrollable body div (has both flex-1 and min-h-0 classes)
    const dialog = screen.getByRole('dialog');
    const bodyEl = dialog.querySelector('[data-testid="onboarding-footer"]')?.parentElement
      ?.querySelector('[class*="min-h-0"]') as HTMLElement | null;

    if (bodyEl) {
      Object.defineProperty(bodyEl, 'scrollTop', { writable: true, value: 100 });
      expect(bodyEl.scrollTop).toBe(100);
    }

    await user.click(footerPrimaryButton());
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument(),
    );

    if (bodyEl) {
      expect(bodyEl.scrollTop).toBe(0);
    }
  });

  // -------------------------------------------------------------------------
  // P1: Modal has max-height constraint
  // -------------------------------------------------------------------------

  it('renders the dialog with a max-height CSS constraint', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toMatch(/max-h-\[calc\(100dvh/);
  });

  // -------------------------------------------------------------------------
  // P1: Footer stays visible (not inside the scrollable body)
  // -------------------------------------------------------------------------

  it('renders the footer action button outside the scrollable body element', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    const dialog = screen.getByRole('dialog');
    const footer = screen.getByTestId('onboarding-footer');
    const scrollableBody = dialog.querySelector('[class*="min-h-0"][class*="overflow-y-auto"]');

    expect(footer).toBeInTheDocument();
    // Footer must NOT be inside the scrollable body
    expect(scrollableBody?.contains(footer)).toBe(false);
  });
});
