import Link from 'next/link';
import { PolicyLinks } from '@/components/legal/PolicyLinks';

const features = [
  { number: '01', title: 'Projects that stay connected', text: 'Bring tasks, discussions, files, and milestones into one shared project space.' },
  { number: '02', title: 'Conversation in context', text: 'Keep team communication close to the work, with space for focused conversations.' },
  { number: '03', title: 'One workspace for every team', text: 'Give people a clear place to organise work across personal, company, and institution spaces.' },
];

export default function HomePage() {
  return (
    <main>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Nexus home">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">N</span>
          <span className="text-lg">Nexus</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-7">
          <a className="hidden text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] sm:inline" href="#features">Features</a>
          <a className="hidden text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] sm:inline" href="#workspaces">Workspaces</a>
          <Link className="hidden text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] sm:inline" href="/pricing">Plans</Link>
          <Link className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" href="/sign-in">Sign in</Link>
          <Link className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]" href="/sign-up">Get started</Link>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(81,70,216,0.13),transparent_48%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-20">
          <div className="max-w-2xl">
            {/* <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              <span className="size-1.5 rounded-full bg-[var(--color-primary)]" />A more connected way to work</p> */}
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-[-0.04em] sm:text-6xl">
              Bring your work {/* Everything your team needs, */} <span className="text-[var(--color-primary)]">




                together.
                {/* connected. */}
                </span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg sm:leading-8">Projects, conversations, and the people behind them belong in one clear workspace. Nexus helps your team keep the whole picture in view.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]" href="/sign-up">Start with Nexus <span className="ml-2" aria-hidden="true">→</span></Link>
              <a className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-sm font-medium hover:bg-[var(--color-surface-secondary)]" href="#features">Explore the platform</a>
            </div>
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">One account. Personal and shared workspaces.</p>
          </div>

          <div aria-label="Illustration of a connected project workspace" className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2rem] bg-[var(--color-primary-soft)] blur-2xl" />
            <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)] sm:p-6">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-sm font-semibold text-[var(--color-primary)]">N</span><div><p className="text-sm font-semibold">Product launch</p><p className="text-xs text-[var(--color-text-muted)]">Design team · Project</p></div></div>
                <span className="rounded-full bg-[var(--color-success-bg)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-success)]">On track</span>
              </div>
              <div className="grid grid-cols-2 gap-3 py-5">
                <div className="rounded-xl border border-[var(--color-border)] p-3"><p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Project progress</p><p className="mt-2 text-2xl font-semibold">68%</p><div className="mt-3 h-1.5 rounded-full bg-[var(--color-surface-secondary)]"><div className="h-full w-[68%] rounded-full bg-[var(--color-primary)]" /></div></div>
                <div className="rounded-xl border border-[var(--color-border)] p-3"><p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">This week</p><p className="mt-2 text-2xl font-semibold">12 <span className="text-sm font-normal text-[var(--color-text-muted)]">tasks</span></p><p className="mt-2 text-[10px] text-[var(--color-success)]">A shared view of the work</p></div>
              </div>
              <div className="space-y-2.5">
                {[['Finalize homepage concepts', 'In review', 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'], ['Prepare launch checklist', 'In progress', 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'], ['Review customer feedback', 'Complete', 'bg-[var(--color-success-bg)] text-[var(--color-success)]']].map(([task, status, color]) => <div key={task} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-3"><span className="truncate text-xs font-medium">{task}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-medium ${color}`}>{status}</span></div>)}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2.5"><p className="text-[10px] text-[var(--color-text-secondary)]">People, plans, and progress in one place</p><div className="flex -space-x-2" aria-hidden="true"><span className="grid size-6 place-items-center rounded-full border-2 border-[var(--color-surface-secondary)] bg-[#E7D3C2] text-[8px] font-semibold text-[#5E4030]">AM</span><span className="grid size-6 place-items-center rounded-full border-2 border-[var(--color-surface-secondary)] bg-[#D8D9F5] text-[8px] font-semibold text-[#39356D]">JK</span><span className="grid size-6 place-items-center rounded-full border-2 border-[var(--color-surface-secondary)] bg-[#D0E8DD] text-[8px] font-semibold text-[#315542]">+4</span></div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl"><p className="text-sm font-semibold text-[var(--color-primary)]">A clearer way to collaborate</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Everything connected to the work.</h2><p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">Give teams shared context without adding more noise. Nexus brings the essential parts of getting work done into one connected place.</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">{features.map((feature) => <article key={feature.number} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7"><p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">{feature.number}</p><h3 className="mt-8 text-lg font-semibold">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{feature.text}</p></article>)}</div>
      </section>

      <section id="workspaces" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <div><p className="text-sm font-semibold text-[var(--color-primary)]">Made for the way you work</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">One Nexus. Many workspaces.</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">{[['Personal', 'Organise your own work and ideas.'], ['Company', 'Bring teams and projects together.'], ['Institution', 'Coordinate people and shared work.']].map(([title, text]) => <div key={title} className="rounded-xl border border-[var(--color-border)] p-4"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-5 text-[var(--color-text-secondary)]">{text}</p></div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 sm:py-24"><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Make room for better work.</h2><p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">Start with one connected place for your team’s projects, conversations, and plans.</p><Link className="mt-7 inline-flex h-12 items-center rounded-lg bg-[var(--color-primary)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]" href="/sign-up">Create your account</Link></section>

      <footer className="border-t border-[var(--color-border)]"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8"><Link href="/" className="font-semibold text-[var(--color-text-primary)]">Nexus</Link><p>One connected workspace for projects, people, and progress.</p><div className="flex flex-wrap gap-5"><Link href="/pricing" className="hover:text-[var(--color-text-primary)]">Plans</Link><Link href="/sign-in" className="hover:text-[var(--color-text-primary)]">Sign in</Link><Link href="/sign-up" className="hover:text-[var(--color-text-primary)]">Get started</Link></div><PolicyLinks className="justify-start sm:justify-end" /></div></footer>
    </main>
  );
}
