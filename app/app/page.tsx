'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { workspaceKindFor } from '@/lib/app-navigation';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import type { WorkspaceSummary } from '@/types/navigation';

function toSwitcherSummary(workspace: ReturnType<typeof useWorkspaceContext>['workspaces'][number]): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    kind: workspaceKindFor(workspace),
    kindLabel: workspace.type === 'INDIVIDUAL' ? 'Individual' : workspace.type === 'COMPANY' ? 'Company' : 'Institution',
    role: workspace.organizationRole ?? workspace.role,
  };
}

export default function AppHomePage() {
  const { user, workspaces, activeWorkspace, loading, switchingWorkspaceId, error, retry, switchToWorkspace } = useWorkspaceContext();

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      {loading ? <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading your workspace…</p> : error && !user ? (
        <div className="mx-auto max-w-lg"><Alert variant="error" title="We couldn’t load your workspace">{error}</Alert><div className="mt-5 flex gap-3"><Button onClick={retry}>Try again</Button><Link className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]" href="/sign-in">Sign in</Link></div></div>
      ) : user && activeWorkspace ? (
        <div className="space-y-6">
          <PageHeader
            title={`Welcome, ${user.name}.`}
            description={`You’re working in ${activeWorkspace.name}. Switch between your workspaces or manage their details below.`}
          />
          {error && <Alert variant="error" title="Workspace switch failed">{error}</Alert>}
          <Card className="p-4 sm:p-9">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <WorkspaceSwitcher workspaces={workspaces.map(toSwitcherSummary)} activeWorkspaceId={activeWorkspace.id} onWorkspaceChange={(workspaceId) => { void switchToWorkspace(workspaceId); }} className="min-w-0 max-w-full" />
              <Link href="/app/workspaces" className="inline-flex h-9 w-full items-center justify-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium hover:bg-[var(--color-surface-secondary)] sm:w-auto">Manage workspaces</Link>
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
        </Card>
      ) : null}
    </div>
  );
}
