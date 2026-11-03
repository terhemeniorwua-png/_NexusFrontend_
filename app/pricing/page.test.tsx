import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PricingPage from './page';
import { paidSubscriptionAvailability, subscriptionPricing } from '@/lib/subscription-plans';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

describe('subscription pricing configuration', () => {
  it('contains the approved Pro and Business prices', () => {
    expect(subscriptionPricing.plans.find((plan) => plan.id === 'pro')?.prices).toEqual({ monthly: 10, annual: 50 });
    expect(subscriptionPricing.plans.find((plan) => plan.id === 'business')?.prices).toEqual({ monthly: 15, annual: 70 });
  });

  it('contains approved additional-member monthly prices and leaves included seats pending', () => {
    expect(subscriptionPricing.plans.find((plan) => plan.id === 'pro')?.additionalMemberMonthlyPrice).toBe(0.5);
    expect(subscriptionPricing.plans.find((plan) => plan.id === 'business')?.additionalMemberMonthlyPrice).toBe(1);
    expect(subscriptionPricing.plans.every((plan) => plan.additionalMemberBillingPeriod === 'monthly')).toBe(true);
    expect(subscriptionPricing.plans.every((plan) => plan.includedSeats === null && plan.includedSeatsStatus === 'pending-approval')).toBe(true);
  });

  it('declares additional-seat rules for backend enforcement', () => {
    expect(subscriptionPricing.additionalSeatPolicy).toEqual({
      billOnlyActiveMembers: true,
      excludePendingInvitations: true,
      countOwnerOnce: true,
      preventDuplicateWorkspaceMembers: true,
      backendEnforced: true,
      annualPlansStillBillAdditionalMembersMonthly: true,
      removalUsesProviderBillingCycleAndProration: true,
    });
  });
});

describe('PricingPage', () => {
  it('renders monthly pricing with consistent USD formatting', () => {
    render(<PricingPage />);

    expect(screen.getByRole('heading', { name: 'Simple, clear pricing', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Choose a billing period' })).toBeInTheDocument();
    expect(screen.getByLabelText('Price: $10 per month')).toBeInTheDocument();
    expect(screen.getByLabelText('Price: $15 per month')).toBeInTheDocument();
    expect(screen.getAllByText('/ month')).toHaveLength(2);
  });

  it('switches both displayed prices and billing copy to annual', async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole('button', { name: 'Annual' }));

    expect(screen.getByRole('button', { name: 'Annual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Price: $50 per year')).toBeInTheDocument();
    expect(screen.getByLabelText('Price: $70 per year')).toBeInTheDocument();
    expect(screen.getAllByText('/ year')).toHaveLength(2);
    expect(screen.getAllByText('Billed annually')).toHaveLength(2);
    expect(screen.getAllByText('$0.50 per additional member per month')).toHaveLength(1);
    expect(screen.getAllByText('$1 per additional member per month')).toHaveLength(1);
    expect(screen.getAllByText(/billed monthly, including with an annual plan/i)).toHaveLength(2);
  });

  it('does not bill pending invitations or imply unapproved included allowances', () => {
    render(<PricingPage />);

    expect(screen.getAllByText(/pending invitations are not billed/i)).toHaveLength(2);
    expect(screen.getAllByText(/included number is pending approval/i)).toHaveLength(2);
    expect(screen.queryByText(/\d+ included seats/i)).not.toBeInTheDocument();
  });

  it('keeps checkout unavailable without a purchase action', () => {
    render(<PricingPage />);

    expect(paidSubscriptionAvailability.checkoutAvailable).toBe(false);
    expect(screen.getByText('Checkout unavailable')).toBeInTheDocument();
    expect(screen.getByText(/until the subscription backend is implemented/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /subscribe|checkout|start trial/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /subscribe|checkout|start trial/i })).not.toBeInTheDocument();
  });
});
