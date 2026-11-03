export type BillingPeriod = 'monthly' | 'annual';

export interface PaidPlanPricing {
  id: 'pro' | 'business';
  name: 'Pro' | 'Business';
  prices: Record<BillingPeriod, number>;
  additionalMemberMonthlyPrice: number;
  additionalMemberBillingPeriod: 'monthly';
  includedSeats: number;
  ownerConsumesIncludedSeat: true;
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
      includedSeats: 15,
      ownerConsumesIncludedSeat: true,
    },
    {
      id: 'business',
      name: 'Business',
      prices: { monthly: 15, annual: 70 },
      additionalMemberMonthlyPrice: 1,
      additionalMemberBillingPeriod: 'monthly',
      includedSeats: 25,
      ownerConsumesIncludedSeat: true,
    },
  ] satisfies PaidPlanPricing[],
  additionalSeatPolicy: {
    billOnlyActiveMembers: true,
    excludePendingInvitations: true,
    excludeSuspendedMembers: true,
    excludeRemovedMembers: true,
    excludeDeactivatedMembers: true,
    countOwnerOnce: true,
    preventDuplicateWorkspaceMembers: true,
    authoritativeCountSource: 'backend',
    backendEnforcementImplemented: false,
    annualPlansStillBillAdditionalMembersMonthly: true,
    additionsImmediateAfterPaymentAndProrated: true,
    reductionsAtNextRenewalWithoutCredit: true,
  },
} as const;

export const paidSubscriptionAvailability = {
  status: 'approved-not-connected' as const,
  backendEnforcementAvailable: false,
  checkoutAvailable: false,
  seatAllowances: 'approved-but-backend-enforcement-unavailable' as const,
  trialEnrollmentAvailable: false,
  notice: 'Prices and included seats are approved. Checkout and subscription management remain unavailable until a payment provider and subscription backend are implemented.',
};

export function formatSubscriptionPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: subscriptionPricing.currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
