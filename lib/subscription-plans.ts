export type BillingPeriod = 'monthly' | 'annual';

export interface PaidPlanPricing {
  id: 'pro' | 'business';
  name: 'Pro' | 'Business';
  prices: Record<BillingPeriod, number>;
  additionalMemberMonthlyPrice: number;
  additionalMemberAnnualPrice: number;
  additionalMemberBillingPeriod: 'same-as-base';
  includedSeats: number;
  ownerConsumesIncludedSeat: true;
}

export const freePlan = {
  id: 'free',
  name: 'Free',
  monthlyPrice: 0,
  annualPrice: 0,
  verifiedFeatures: ['A personal workspace is created when your account is activated.'],
} as const;

/** Central source for approved plan and additional-member prices and open rules. */
export const subscriptionPricing = {
  currency: 'USD',
  plans: [
    {
      id: 'pro',
      name: 'Pro',
      prices: { monthly: 10, annual: 50 },
      additionalMemberMonthlyPrice: 0.5,
      additionalMemberAnnualPrice: 0.5,
      additionalMemberBillingPeriod: 'same-as-base',
      includedSeats: 15,
      ownerConsumesIncludedSeat: true,
    },
    {
      id: 'business',
      name: 'Business',
      prices: { monthly: 15, annual: 70 },
      additionalMemberMonthlyPrice: 1,
      additionalMemberAnnualPrice: 1,
      additionalMemberBillingPeriod: 'same-as-base',
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
    additionalSeatsUseBaseSubscriptionDuration: true,
    additionsImmediateAfterPaymentAndProrated: true,
    reductionsAtNextRenewalWithoutCredit: true,
  },
} as const;

export function formatSubscriptionPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: subscriptionPricing.currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
