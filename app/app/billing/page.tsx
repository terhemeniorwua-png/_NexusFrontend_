'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiRequestError } from '@/lib/api';
import { formatSubscriptionPrice, subscriptionPricing, type BillingPeriod } from '@/lib/subscription-plans';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { AccessState } from '@/components/shared/AccessState';
import {
  apiInterval, cancelBilling, getBillingHistory, getBillingSummary, scheduleBillingChange,
  startBillingCheckout, verifyBillingCheckout, type BillingPayment, type BillingPlanId, type BillingSummary,
} from '@/services/billing';

function friendlyError(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : 'Billing information could not be loaded. Please try again.';
}

function dateLabel(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'Not available';
}

function totalCents(planId: BillingPlanId, interval: 'MONTHLY' | 'ANNUAL', seats: number): number {
  const plan = subscriptionPricing.plans.find((item) => item.id.toUpperCase() === planId);
  if (!plan) return 0;
  const base = interval === 'MONTHLY' ? plan.prices.monthly : plan.prices.annual;
  const seatPrice = interval === 'MONTHLY' ? plan.additionalMemberMonthlyPrice : plan.additionalMemberAnnualPrice;
  return Math.round((base + Math.max(0, seats - plan.includedSeats) * seatPrice) * 100);
}

export default function BillingPage() {
  const { activeWorkspace, loading } = useWorkspaceContext();
  if (loading) return <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><p role="status">Loading workspace…</p></div>;
  if (!activeWorkspace) return <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><EmptyState title="Choose a workspace" description="Select a workspace to view its billing information." /></div>;
  return <WorkspaceBilling key={activeWorkspace.id} />;
}

function WorkspaceBilling() {
  const { activeWorkspace, user, loading: workspaceLoading } = useWorkspaceContext();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [plan, setPlan] = useState<BillingPlanId>('PRO');
  const [billableSeats, setBillableSeats] = useState(1);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const workspaceId = activeWorkspace?.id;

  const isOwner = Boolean(activeWorkspace && user && activeWorkspace.ownerId === user.id);
  const interval = apiInterval(billingPeriod);
  const currentTotal = useMemo(() => summary?.subscription
    ? totalCents(summary.subscription.plan, summary.subscription.interval, summary.subscription.billableSeats)
    : 0, [summary]);
  const targetTotal = summary ? totalCents(plan, interval, billableSeats) : 0;
  const activeSeats = summary?.activeBillableSeats ?? 0;
  const seatTargetValid = Number.isInteger(billableSeats) && billableSeats >= Math.max(1, activeSeats) && billableSeats <= 10_000;

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const [nextSummary, history] = await Promise.all([
        getBillingSummary(activeWorkspace.id), getBillingHistory(activeWorkspace.id),
      ]);
      setSummary(nextSummary);
      setPayments(history);
      setError(null);
      setBillableSeats(Math.max(1, nextSummary.subscription?.billableSeats ?? nextSummary.activeBillableSeats));
      if (nextSummary.subscription) {
        setPlan(nextSummary.subscription.plan);
        setBillingPeriod(nextSummary.subscription.interval === 'MONTHLY' ? 'monthly' : 'annual');
      }
    } catch (cause) {
      setError(friendlyError(cause));
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    void Promise.all([getBillingSummary(workspaceId), getBillingHistory(workspaceId)])
      .then(([nextSummary, history]) => {
        if (!active) return;
        setSummary(nextSummary);
        setPayments(history);
        setError(null);
        setBillableSeats(Math.max(1, nextSummary.subscription?.billableSeats ?? nextSummary.activeBillableSeats));
        if (nextSummary.subscription) {
          setPlan(nextSummary.subscription.plan);
          setBillingPeriod(nextSummary.subscription.interval === 'MONTHLY' ? 'monthly' : 'annual');
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
          setAccessStatus(cause.status);
        } else {
          setError(friendlyError(cause));
        }
      });
    return () => { active = false; };
  }, [workspaceId]);

  useEffect(() => {
    if (!activeWorkspace || !isOwner) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') ?? params.get('trxref');
    if (!reference) return;
    let active = true;
    void verifyBillingCheckout(activeWorkspace.id, reference)
      .then(async () => {
        if (!active) return;
        setNotice('Payment verified. Your workspace subscription has been updated.');
        window.history.replaceState({}, '', '/app/billing');
        await load();
      })
      .catch((cause: unknown) => { if (active) setError(friendlyError(cause)); });
    return () => { active = false; };
  }, [activeWorkspace, isOwner, load]);

  async function applySelection() {
    if (!activeWorkspace) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      if (summary?.subscription && billableSeats < summary.subscription.billableSeats && targetTotal >= currentTotal) {
        setError('Complete the plan upgrade separately, then schedule your seat reduction for renewal.');
        return;
      }
      if (summary?.subscription && targetTotal < currentTotal) {
        await scheduleBillingChange(activeWorkspace.id, { plan, interval, billableSeats });
        setNotice('Your downgrade or seat reduction is scheduled for the next renewal.');
        await load();
      } else {
        const checkout = await startBillingCheckout(activeWorkspace.id, { plan, interval, billableSeats });
        window.location.assign(checkout.authorizationUrl);
      }
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setWorking(false);
    }
  }

  async function confirmCancellation() {
    if (!activeWorkspace) return;
    setWorking(true);
    setError(null);
    try {
      await cancelBilling(activeWorkspace.id);
      setConfirmCancel(false);
      setNotice('Cancellation is scheduled at the end of the paid period. Your current benefits continue until then.');
      await load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setWorking(false);
    }
  }

  if (workspaceLoading || (activeWorkspace && !summary && !error && !accessStatus)) return <div className="mx-auto max-w-5xl px-5 py-10"><p role="status">Loading workspace billing…</p></div>;
  if (!activeWorkspace) return <div className="mx-auto max-w-5xl px-5 py-10"><EmptyState title="Choose a workspace" description="Select a workspace before viewing its billing." action={<Link href="/app/workspaces" className="text-[var(--color-primary)] underline">Manage workspaces</Link>} /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-[var(--color-primary)]">{activeWorkspace.name}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Subscription and billing</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">USD billing for this workspace. Only the workspace owner can make changes.</p></div>
        <Link href="/app" className="text-sm text-[var(--color-primary)] hover:underline">Back to workspace</Link>
      </header>

      {error && <Alert variant="error" title="Billing request failed">{error}</Alert>}
      {notice && <Alert variant="info" title="Billing update">{notice}</Alert>}
      {accessStatus && <AccessState status={accessStatus} onRetry={() => { setAccessStatus(null); }} />}

      <Card className="p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Current subscription</h2>
        {summary?.subscription ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-[var(--color-text-secondary)]">Plan and status</p><p className="mt-1 font-semibold">{summary.subscription.plan} · {summary.subscription.status.replaceAll('_', ' ').toLowerCase()}</p></div>
            <div><p className="text-xs text-[var(--color-text-secondary)]">Active billable seats</p><p className="mt-1 font-semibold">{summary.activeBillableSeats} · {summary.includedSeats} included · {summary.additionalSeats} additional</p></div>
            <div><p className="text-xs text-[var(--color-text-secondary)]">Billing duration</p><p className="mt-1 font-semibold">{summary.subscription.interval === 'MONTHLY' ? 'Monthly' : 'Annual'}</p></div>
            <div><p className="text-xs text-[var(--color-text-secondary)]">Renewal / effective date</p><p className="mt-1 font-semibold">{dateLabel(summary.nextRenewalAt)}</p></div>
            {summary.subscription.cancelAtPeriodEnd && <p className="sm:col-span-2 lg:col-span-4 text-sm text-[var(--color-warning)]">Cancellation is scheduled. Benefits remain active through {dateLabel(summary.subscription.currentPeriodEnd)}.</p>}
            {summary.subscription.pendingChange && <p className="sm:col-span-2 lg:col-span-4 text-sm">Scheduled change: {summary.subscription.pendingChange.plan} {summary.subscription.pendingChange.interval?.toLowerCase()} effective {dateLabel(summary.subscription.pendingChange.effectiveAt)}.</p>}
          </div>
        ) : <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No paid subscription is active for this workspace.</p>}
      </Card>

      <Card className="p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Choose a plan</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">The server uses active membership records and confirms every payment with Paystack.</p>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Billing duration">
          {(['monthly', 'annual'] as const).map((period) => <Button key={period} variant={billingPeriod === period ? 'primary' : 'secondary'} aria-pressed={billingPeriod === period} onClick={() => setBillingPeriod(period)}>{period === 'monthly' ? 'Monthly' : 'Annual'}</Button>)}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {subscriptionPricing.plans.map((item) => <button key={item.id} type="button" aria-pressed={plan.toLowerCase() === item.id} onClick={() => setPlan(item.id.toUpperCase() as BillingPlanId)} className={`rounded-xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${plan.toLowerCase() === item.id ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border)]'}`}><span className="font-semibold">{item.name}</span><span className="mt-1 block text-2xl font-semibold">{formatSubscriptionPrice(item.prices[billingPeriod])}<span className="ml-1 text-sm font-normal text-[var(--color-text-secondary)]">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span></span><span className="mt-2 block text-sm text-[var(--color-text-secondary)]">{item.includedSeats} included seats · {formatSubscriptionPrice(billingPeriod === 'monthly' ? item.additionalMemberMonthlyPrice : item.additionalMemberAnnualPrice)} per additional seat/{billingPeriod === 'monthly' ? 'month' : 'year'}</span></button>)}
        </div>
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Current active seats: {summary?.activeBillableSeats ?? 0}. The workspace owner counts once. Pending, suspended, removed, and deactivated accounts are excluded.</p>
        <label className="mt-4 flex max-w-sm flex-col gap-1 text-sm font-medium" htmlFor="billing-seat-count">Seats to include in this subscription
          <input id="billing-seat-count" type="number" min={Math.max(1, summary?.activeBillableSeats ?? 1)} max={10_000} step={1} value={billableSeats} disabled={!isOwner || working} onChange={(event) => setBillableSeats(Number(event.currentTarget.value))} className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3" />
          <span className="text-xs font-normal text-[var(--color-text-secondary)]">Must cover all current active seats. Additional seats are charged at the selected plan rate and cadence.</span>
        </label>
        {!isOwner && <Alert variant="info" title="Owner action required" className="mt-4">Ask the workspace owner to change or cancel this subscription.</Alert>}
        {isOwner && <div className="mt-5 flex flex-wrap gap-3"><Button loading={working} onClick={() => void applySelection()} disabled={!seatTargetValid || Boolean(summary?.subscription && summary.subscription.plan === plan && summary.subscription.interval === interval && summary.subscription.billableSeats === billableSeats)}> {summary?.subscription ? targetTotal < currentTotal ? 'Schedule change' : 'Continue to checkout' : 'Continue to checkout'}</Button>{summary?.subscription && !summary.subscription.cancelAtPeriodEnd && <Button variant="destructive" disabled={working} onClick={() => setConfirmCancel(true)}>Cancel at renewal</Button>}</div>}
        <p className="mt-3 text-xs text-[var(--color-text-secondary)]">An upgrade or seat increase is charged immediately for the prorated difference. Downgrades and seat reductions begin at renewal. Annual seat charges use the annual cycle. Refunds are handled manually.</p>
      </Card>

      <Card className="p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Billing history</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Cancellation does not issue an automatic refund. Outstanding invoices remain payable. The current backend provides payment history, but does not yet expose an invoice list.</p>
        {payments.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]"><th scope="col" className="py-2 pr-3">Date</th><th scope="col" className="py-2 pr-3">Reference</th><th scope="col" className="py-2 pr-3">Amount</th><th scope="col" className="py-2">Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.providerReference} className="border-b border-[var(--color-border)] last:border-0"><td className="py-3 pr-3">{dateLabel(payment.paidAt ?? payment.createdAt)}</td><td className="py-3 pr-3 font-mono text-xs">{payment.providerReference}</td><td className="py-3 pr-3">{formatSubscriptionPrice(payment.amountSubunit / 100)}</td><td className="py-3">{payment.status.toLowerCase()}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No billing transactions are recorded yet.</p>}
      </Card>

      <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)} onConfirm={() => void confirmCancellation()} title="Cancel this subscription?" description={`Renewal will stop. Your current benefits remain until ${dateLabel(summary?.subscription?.currentPeriodEnd ?? null)}.`} confirmLabel="Cancel at renewal" destructive loading={working} />
    </div>
  );
}
