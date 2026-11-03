export type BillingPeriod = 'monthly' | 'annual';

export interface PaidPlanPricing {
  id: 'pro' | 'business';
  name: 'Pro' | 'Business';
  prices: Record<BillingPeriod, number>;
  additionalMemberMonthlyPrice: number;
  additionalMemberBillingPeriod: 'monthly';
  includedSeats: null;
  includedSeatsStatus: 'pending-approval';
}

/** Central source for approved plan and additional-member prices and open rules. */
export const subscriptionPricing = {
  currency: 'USD',
  plans: [
    {
      id: 'pro',
      name: 'Pro',
      prices: { monthly: 10, annual: 50 },
      additionalMemberMonthlyPrice: 0.5,
      additionalMemberBillingPeriod: 'monthly',
      includedSeats: null,
      includedSeatsStatus: 'pending-approval',
    },
    {
      id: 'business',
      name: 'Business',
      prices: { monthly: 15, annual: 70 },
      additionalMemberMonthlyPrice: 1,
      additionalMemberBillingPeriod: 'monthly',
      includedSeats: null,
      includedSeatsStatus: 'pending-approval',
    },
  ] satisfies PaidPlanPricing[],
  additionalSeatPolicy: {
    billOnlyActiveMembers: true,
    excludePendingInvitations: true,
    countOwnerOnce: true,
    preventDuplicateWorkspaceMembers: true,
    backendEnforced: true,
    annualPlansStillBillAdditionalMembersMonthly: true,
    removalUsesProviderBillingCycleAndProration: true,
  },
} as const;

export const paidSubscriptionAvailability = {
  status: 'approved-not-connected' as const,
  checkoutAvailable: false,
  seatAllowances: null,
  trialEnrollmentAvailable: false,
  notice: 'Prices are listed for planning. Checkout and subscription management are unavailable until the subscription backend is implemented.',
};

export function formatSubscriptionPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: subscriptionPricing.currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
