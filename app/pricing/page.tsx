import type { Metadata } from 'next';
import Link from 'next/link';
import { PolicyLinks } from '@/components/legal/PolicyLinks';
import { PricingOptions } from './PricingOptions';

export const metadata: Metadata = { title: 'Plans', description: 'Explore Nexus plan pricing.' };

export default function PricingPage() {
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Link href="/" className="flex items-center gap-2 font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">N</span>Nexus</Link><div className="flex items-center gap-4"><Link href="/sign-in" className="text-sm text-[var(--color-text-secondary)]">Sign in</Link><Link href="/sign-up" className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white">Get started</Link></div></header>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-[var(--color-primary)]">Workspace plans</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Simple, clear pricing</h1>
          <p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">Compare Free, Pro, and Business. Signed-in workspace owners can manage paid subscriptions when the payment provider is configured for USD.</p>
        </div>
        <PricingOptions />
        <footer className="mt-12 border-t border-[var(--color-border)] pt-6"><PolicyLinks /></footer>
      </section>
    </main>
  );
}
