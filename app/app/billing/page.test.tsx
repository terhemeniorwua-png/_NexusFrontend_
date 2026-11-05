import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BillingPage from './page';

const mocks = vi.hoisted(() => ({
  context: {
    activeWorkspace: { id: 'workspace-1', name: 'Nexus Studio', ownerId: 'owner-1' },
    user: { id: 'owner-1' },
    loading: false,
  },
  getBillingSummary: vi.fn(),
  getBillingHistory: vi.fn(),
  startBillingCheckout: vi.fn(),
  verifyBillingCheckout: vi.fn(),
  scheduleBillingChange: vi.fn(),
  cancelBilling: vi.fn(),
}));

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mocks.context }));
vi.mock('@/services/billing', () => ({
  apiInterval: (period: string) => period === 'monthly' ? 'MONTHLY' : 'ANNUAL',
  getBillingSummary: mocks.getBillingSummary,
  getBillingHistory: mocks.getBillingHistory,
  startBillingCheckout: mocks.startBillingCheckout,
  verifyBillingCheckout: mocks.verifyBillingCheckout,
  scheduleBillingChange: mocks.scheduleBillingChange,
  cancelBilling: mocks.cancelBilling,
}));

const summary = {
  subscription: {
    id: 'subscription-1', plan: 'PRO', interval: 'ANNUAL', currency: 'USD', status: 'ACTIVE',
    billableSeats: 4, currentPeriodStart: '2026-01-01T00:00:00.000Z', currentPeriodEnd: '2027-01-01T00:00:00.000Z',
    cancelAtPeriodEnd: false, pendingChange: null,
  },
  activeBillableSeats: 4, includedSeats: 15, additionalSeats: 0, nextRenewalAt: '2027-01-01T00:00:00.000Z',
};

const currentPlanStatus = () => screen.getByText((_content, element) => element?.textContent === 'PRO · active');

describe('BillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.activeWorkspace = { id: 'workspace-1', name: 'Nexus Studio', ownerId: 'owner-1' };
    mocks.context.user = { id: 'owner-1' };
    mocks.getBillingSummary.mockResolvedValue(summary);
    mocks.getBillingHistory.mockResolvedValue([]);
    mocks.cancelBilling.mockResolvedValue({ cancelAtPeriodEnd: true, effectiveAt: summary.nextRenewalAt });
  });

  it('shows backend plan, status, active seats, cadence and renewal date', async () => {
    render(<BillingPage />);

    await waitFor(() => expect(currentPlanStatus()).toBeInTheDocument());
    expect(screen.getByText('4 · 15 included · 0 additional')).toBeInTheDocument();
    expect(screen.getByText('Billing duration').parentElement).toHaveTextContent('Annual');
    expect(screen.getByText('Jan 1, 2027')).toBeInTheDocument();
  });

  it('shows an unauthenticated access state when the billing load returns 401', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.getBillingSummary.mockRejectedValue(new ApiRequestError('Unauthorized', 401));
    render(<BillingPage />);
    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
  });

  it('shows a forbidden access state when the billing load returns 403', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.getBillingSummary.mockRejectedValue(new ApiRequestError('Forbidden', 403));
    render(<BillingPage />);
    expect(await screen.findByText('You do not have access')).toBeInTheDocument();
  });

  it('requires explicit confirmation to schedule period-end cancellation', async () => {
    const user = userEvent.setup();
    render(<BillingPage />);
    await waitFor(() => expect(currentPlanStatus()).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Cancel at renewal' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Your current benefits remain until');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel at renewal' }));

    await waitFor(() => expect(mocks.cancelBilling).toHaveBeenCalledWith('workspace-1'));
    expect(await screen.findByText(/Cancellation is scheduled at the end of the paid period/)).toBeInTheDocument();
  });

  it('does not offer billing mutations to a non-owner', async () => {
    mocks.context.user = { id: 'member-1' };
    render(<BillingPage />);

    await waitFor(() => expect(currentPlanStatus()).toBeInTheDocument());
    expect(screen.getByText('Owner action required')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel at renewal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue to checkout|Schedule change/ })).not.toBeInTheDocument();
  });
});
