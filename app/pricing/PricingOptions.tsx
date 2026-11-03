'use client';

import { useState } from 'react';
import {
  type BillingPeriod,
  formatSubscriptionPrice,
  paidSubscriptionAvailability,
  subscriptionPricing,
} from '@/lib/subscription-plans';

const billingPeriods: { id: BillingPeriod; label: string; detail: string }[] = [
  { id: 'monthly', label: 'Monthly', detail: 'Billed monthly' },
  { id: 'annual', label: 'Annual', detail: 'Billed annually' },
];

export function PricingOptions() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  return (
    <>
      <div className="mt-9 flex justify-center" aria-label="Billing period">
        <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1" role="group" aria-label="Choose a billing period">
          {billingPeriods.map((period) => (
            <button
              key={period.id}
              type="button"
              aria-pressed={billingPeriod === period.id}
              onClick={() => setBillingPeriod(period.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${billingPeriod === period.id ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'}`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {subscriptionPricing.plans.map((plan) => (
          <article key={plan.id} aria-labelledby={`${plan.id}-plan-title`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none sm:p-8">
            <p className="text-sm font-medium text-[var(--color-text-muted)]">Nexus plan</p>
            <h2 id={`${plan.id}-plan-title`} className="mt-2 text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-6 flex items-baseline gap-2" aria-label={`Price: ${formatSubscriptionPrice(plan.prices[billingPeriod])} ${billingPeriod === 'monthly' ? 'per month' : 'per year'}`}>
              <span className="text-4xl font-semibold tracking-tight">{formatSubscriptionPrice(plan.prices[billingPeriod])}</span>
              <span className="text-sm text-[var(--color-text-secondary)]">/ {billingPeriod === 'monthly' ? 'month' : 'year'}</span>
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {billingPeriods.find((period) => period.id === billingPeriod)?.detail}
            </p>
            <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p className="font-medium text-[var(--color-text-primary)]">
                {plan.includedSeats} included members, including the workspace owner
              </p>
              <p className="font-medium text-[var(--color-text-primary)]">
                {formatSubscriptionPrice(plan.additionalMemberMonthlyPrice)} per additional member per month
              </p>
              <p className="mt-2">Only active members beyond the included allowance are billable. Pending invitations, suspended members, removed members, and deactivated members are not billed.</p>
              <p className="mt-2">Additional members are billed monthly, including with an annual plan. Increases take effect after confirmed payment and are prorated; reductions take effect at renewal.</p>
            </div>
          </article>
        ))}
      </div>

      <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-6 text-[var(--color-text-secondary)]">
        The workspace owner uses one included member seat and is counted once. When billing is connected, the backend will determine billable members from workspace membership records; these displayed prices are informational only.
      </p>

      <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-6 text-center sm:p-8">
        <p className="font-semibold">Checkout unavailable</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
          {paidSubscriptionAvailability.notice}
        </p>
      </div>
    </>
  );
}
