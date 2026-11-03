import type { Metadata } from 'next';
import Link from 'next/link';
import { PolicyLinks } from '@/components/legal/PolicyLinks';
import { paidSubscriptionAvailability, subscriptionPlanOverview } from '@/lib/subscription-plans';

export const metadata: Metadata = { title: 'Plans', description: 'Explore the Nexus workspace plan structure.' };

export default function PricingPage() {
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Link href="/" className="flex items-center gap-2 font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">N</span>Nexus</Link><div className="flex items-center gap-4"><Link href="/sign-in" className="text-sm text-[var(--color-text-secondary)]">Sign in</Link><Link href="/sign-up" className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white">Get started</Link></div></header>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold text-[var(--color-primary)]">Workspace plans</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Plan availability</h1><p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">Nexus supports personal, company, and institution workspace models. Plan setup and paid subscriptions are not available from this page.</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">{subscriptionPlanOverview.map((plan) => <article key={plan.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7"><p className="text-xs font-medium text-[var(--color-text-muted)]">{plan.audience}</p><h2 className="mt-2 text-xl font-semibold">{plan.title}</h2><p className="mt-4 min-h-24 text-sm leading-6 text-[var(--color-text-secondary)]">{plan.summary}</p><div className="mt-5 border-t border-[var(--color-border)] pt-5"><p className="text-sm font-semibold">Free plan configuration</p><p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Approved product model; workspace setup is not connected here.</p></div></article>)}</div>
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-6 text-center sm:p-8"><p className="font-semibold">Paid plans unavailable</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">{paidSubscriptionAvailability.notice} No price, seat allowance, checkout, or trial enrollment is offered here.</p></div>
        <footer className="mt-12 border-t border-[var(--color-border)] pt-6"><PolicyLinks /></footer>
      </section>
    </main>
  );
}
