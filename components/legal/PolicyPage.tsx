import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { PolicyLinks } from '@/components/legal/PolicyLinks';
import type { LegalPolicyContent } from '@/lib/legal-policies';

export function PolicyPage({ policy }: { policy: LegalPolicyContent }) {
  return (
    <main className="min-h-dvh bg-[var(--color-background)]">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Nexus home">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">N</span>
          Nexus
        </Link>
        <Link href="/sign-in" className="text-sm font-medium text-[var(--color-primary)] hover:underline">Sign in</Link>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <p className="text-sm font-semibold text-[var(--color-primary)]">Nexus policies</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{policy.title}</h1>
        <p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">{policy.summary}</p>

        <Alert variant="warning" title="DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL" className="mt-8">
          This draft is not a final or legally approved policy. Bracketed items identify missing business, deployment, or legal decisions that must be resolved before publication.
        </Alert>

        <div className="mt-8 space-y-4">
          {policy.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
              <h2 id={`${section.id}-heading`} className="text-lg font-semibold">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul className="list-disc space-y-1 pl-5">
                    {section.bullets.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-[var(--color-border)] pt-6">
          <PolicyLinks />
          <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-[var(--color-text-primary)]">Return to Nexus</Link>
          </p>
        </footer>
      </article>
    </main>
  );
}
