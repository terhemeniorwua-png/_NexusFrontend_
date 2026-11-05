import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PricingPage from './page';
import { freePlan, subscriptionPricing } from '@/lib/subscription-plans';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

describe('subscription pricing configuration', () => {
  it('includes the verified Free plan without defining unsupported limits', () => {
    expect(freePlan).toMatchObject({ id: 'free', name: 'Free', monthlyPrice: 0, annualPrice: 0 });
    expect(freePlan.verifiedFeatures).toEqual(['A personal workspace is created when your account is activated.']);
  });
  it('contains the approved Pro and Business prices', () => {
    expect(subscriptionPricing.plans.find((plan) => plan.id === 'pro')?.prices).toEqual({ monthly: 10, annual: 50 });
    expect(subscriptionPricing.plans.find((plan) => plan.id === 'business')?.prices).toEqual({ monthly: 15, annual: 70 });
  });

  it('contains approved additional-seat prices and included allowances', () => {
    expect(subscriptionPricing.plans.find((plan) => plan.id === 'pro')).toMatchObject({
      additionalMemberMonthlyPrice: 0.5,
      additionalMemberAnnualPrice: 1,
      includedSeats: 15,
      ownerConsumesIncludedSeat: true,
    });
    expect(subscriptionPricing.plans.find((plan) => plan.id === 'business')).toMatchObject({
      additionalMemberMonthlyPrice: 0.5,
      additionalMemberAnnualPrice: 1,
      includedSeats: 25,
      ownerConsumesIncludedSeat: true,
    });
    expect(subscriptionPricing.plans.every((plan) => plan.additionalMemberBillingPeriod === 'same-as-base')).toBe(true);
  });

  it('declares additional-seat rules for backend enforcement', () => {
    expect(subscriptionPricing.additionalSeatPolicy).toEqual({
      billOnlyActiveMembers: true,
      excludePendingInvitations: true,
      excludeSuspendedMembers: true,
      excludeRemovedMembers: true,
      excludeDeactivatedMembers: true,
      countOwnerOnce: true,
      preventDuplicateWorkspaceMembers: true,
      authoritativeCountSource: 'backend',
      backendEnforcementImplemented: true,
      additionalSeatsUseBaseSubscriptionDuration: true,
      additionsImmediateAfterPaymentAndProrated: true,
      reductionsAtNextRenewalWithoutCredit: true,
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
    expect(screen.getByLabelText('Price: Free')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getAllByText('/ month')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Get started' }).some((link) => link.getAttribute('href') === '/sign-up')).toBe(true);
  });

  it('switches both displayed prices and billing copy to annual', async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole('button', { name: 'Annual' }));

    expect(screen.getByRole('button', { name: 'Annual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Price: $50 per year')).toBeInTheDocument();
    expect(screen.getByLabelText('Price: $70 per year')).toBeInTheDocument();
    expect(screen.getByLabelText('Price: Free')).toBeInTheDocument();
    expect(screen.getAllByText('/ year')).toHaveLength(2);
    expect(screen.getAllByText('Billed annually')).toHaveLength(2);
    expect(screen.getAllByText('$1 per additional seat per year')).toHaveLength(2);
    expect(screen.getAllByText(/follow the subscription duration/i)).toHaveLength(2);
  });

  it('displays approved included allowances and excludes inactive memberships', () => {
    render(<PricingPage />);

    expect(screen.getByText('15 included seats, including the workspace owner')).toBeInTheDocument();
    expect(screen.getByText('25 included seats, including the workspace owner')).toBeInTheDocument();
    expect(screen.getAllByText(/pending invitations, suspended members, removed members, and deactivated members are not billed/i)).toHaveLength(2);
  });

  it('directs users to authenticated workspace billing', () => {
    render(<PricingPage />);

    expect(screen.getByRole('link', { name: 'Sign in to manage billing' })).toHaveAttribute('href', '/sign-in');
  });
});
