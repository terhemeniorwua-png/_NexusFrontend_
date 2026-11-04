'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { signOut } from '@/services/auth';
import type { WorkspaceSummary } from '@/types/navigation';

function toSwitcherSummary(workspace: ReturnType<typeof useWorkspaceContext>['workspaces'][number]): WorkspaceSummary {
  const kind = workspace.type.toLowerCase() as WorkspaceSummary['kind'];
  const kindLabel = workspace.type === 'INDIVIDUAL' ? 'Individual' : workspace.type === 'COMPANY' ? 'Company' : 'Institution';
  return { id: workspace.id, name: workspace.name, kind, kindLabel, role: workspace.organizationRole ?? workspace.role };
}

export default function AppHomePage() {
  const router = useRouter();
  const { user, workspaces, activeWorkspace, loading, switchingWorkspaceId, error, retry, switchToWorkspace } = useWorkspaceContext();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
      router.push('/');
    } catch {
      setSignOutError('Sign out could not be confirmed. Please try again.');
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-8 sm:px-8">
      <header role="banner" className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">N</span>Nexus</Link>
        {user && <div className="flex items-center gap-3"><Link href="/app/profile" className="text-sm font-medium text-[var(--color-primary)] hover:underline">Profile</Link><Button variant="secondary" onClick={handleSignOut}>Sign out</Button></div>}
      </header>

      <section className="my-auto py-12 sm:py-16">
        {loading ? <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading your workspace…</p> : error && !user ? (
          <div className="mx-auto max-w-lg"><Alert variant="error" title="We couldn’t load your workspace">{error}</Alert><div className="mt-5 flex gap-3"><Button onClick={retry}>Try again</Button><Link className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]" href="/sign-in">Sign in</Link></div></div>
        ) : user && activeWorkspace ? (
          <div className="space-y-6">
            <Card className="mx-auto max-w-3xl p-6 sm:p-9">
              <p className="text-sm font-medium text-[var(--color-primary)]">Workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {user.name}.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">You’re working in <strong className="font-semibold text-[var(--color-text-primary)]">{activeWorkspace.name}</strong>. Switch between your workspaces or manage their details below.</p>
              {error && <Alert variant="error" title="Workspace switch failed" className="mt-5">{error}</Alert>}
              {signOutError && <Alert variant="error" title="Sign out failed" className="mt-5">{signOutError}</Alert>}
              <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div><WorkspaceSwitcher workspaces={workspaces.map(toSwitcherSummary)} activeWorkspaceId={activeWorkspace.id} onWorkspaceChange={(workspaceId) => { void switchToWorkspace(workspaceId); }} /></div>
                <Link href="/app/workspaces" className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium hover:bg-[var(--color-surface-secondary)]">Manage workspaces</Link>
              </div>
              {switchingWorkspaceId && <p role="status" className="mt-3 text-sm text-[var(--color-text-secondary)]">Switching workspace…</p>}
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] p-4"><p className="text-xs text-[var(--color-text-secondary)]">Members</p><p className="mt-1 text-xl font-semibold">{activeWorkspace.memberCount}</p></div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] p-4"><p className="text-xs text-[var(--color-text-secondary)]">Projects</p><p className="mt-1 text-xl font-semibold">{activeWorkspace.projectCount}</p></div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] p-4"><p className="text-xs text-[var(--color-text-secondary)]">Teams</p><p className="mt-1 text-xl font-semibold">{activeWorkspace.teamCount}</p></div>
              </div>
            </Card>
          </div>
        ) : user ? (
          <Card className="mx-auto max-w-2xl p-5 sm:p-8">
            {error ? <><Alert variant="error" title="Workspaces unavailable">{error}</Alert><div className="mt-5 flex flex-wrap justify-center gap-3"><Button onClick={retry}>Try again</Button><Link href="/app/workspaces" className="inline-flex h-9 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium">Manage workspaces</Link></div></> : <EmptyState title="No workspaces are available" description="Create a Company or Institution workspace to get started, or refresh if you were just invited." action={<div className="flex flex-wrap justify-center gap-3"><Link href="/app/workspaces" className="inline-flex h-9 items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white">Create workspace</Link><Button variant="secondary" onClick={retry}>Refresh workspaces</Button></div>} />}
            {signOutError && <Alert variant="error" title="Sign out failed" className="mt-5">{signOutError}</Alert>}
          </Card>
        ) : null}
      </section>
      <footer className="text-xs text-[var(--color-text-muted)]">Nexus · One connected workspace for projects, people, and progress.</footer>
    </main>
  );
}
