'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { RadioGroup } from '@/components/ui/Radio';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { listWorkspaceMembers, type WorkspaceMember } from '@/services/workspaces';
import { ApiRequestError } from '@/lib/api';

type MemberState =
  | { status: 'loading'; workspaceId: string | null }
  | { status: 'success'; workspaceId: string; members: WorkspaceMember[] }
  | { status: 'error'; workspaceId: string; message: string };

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function WorkspaceSettings({ workspaceId }: { workspaceId: string }) {
  const { workspaces, activeWorkspace, saveWorkspace } = useWorkspaceContext();
  const workspace = activeWorkspace?.id === workspaceId ? activeWorkspace : workspaces.find((item) => item.id === workspaceId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const descriptionValue = String(data.get('description') ?? '').trim();
    const visibility = String(data.get('visibility') ?? workspace.visibility);
    if (name.length < 2 || name.length > 80) {
      setError('Workspace name must be between 2 and 80 characters.');
      setSuccess(null);
      return;
    }
    if (descriptionValue.length > 500) {
      setError('Description must be 500 characters or fewer.');
      setSuccess(null);
      return;
    }
    if (visibility !== 'PRIVATE' && visibility !== 'PUBLIC') {
      setError('Choose a valid workspace visibility.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveWorkspace(workspace.id, { name, description: descriptionValue || null, visibility });
      setSuccess('Workspace settings saved.');
    } catch (cause) {
      setError(errorText(cause, 'Workspace settings could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  if (!workspace) return null;

  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-5"><p className="text-sm font-semibold text-[var(--color-primary)]">Workspace profile</p><h2 className="mt-1 text-xl font-semibold">{workspace.name}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{workspace.type === 'INDIVIDUAL' ? 'Personal workspace' : workspace.type === 'COMPANY' ? 'Company workspace' : 'Institution workspace'} · {workspace.slug}</p></div>
      {error && <Alert variant="error" title="Settings not saved" className="mb-5">{error}</Alert>}
      {success && <Alert variant="success" title="Saved" className="mb-5">{success}</Alert>}
      <form key={workspace.id} onSubmit={handleSubmit} className="space-y-5">
        <Input id="workspace-name" name="name" label="Workspace name" required minLength={2} maxLength={80} defaultValue={workspace.name} />
        <Textarea id="workspace-description" name="description" label="Description" rows={3} maxLength={500} defaultValue={workspace.description ?? ''} helperText="Up to 500 characters." />
        {workspace.isPersonal ? <p className="text-sm text-[var(--color-text-secondary)]">Personal workspaces stay private.</p> : <Select id="workspace-visibility" name="visibility" label="Visibility" defaultValue={workspace.visibility} options={[{ value: 'PRIVATE', label: 'Private' }, { value: 'PUBLIC', label: 'Publicly discoverable' }]} helperText="Public workspaces can appear in discovery; membership still requires an invitation or approved request." />}
        <div className="flex justify-end"><Button type="submit" loading={saving}>Save workspace</Button></div>
      </form>
      <p className="mt-5 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-secondary)]">Workspace logos and other branding controls are not available in the current backend contract.</p>
    </Card>
  );
}

export default function WorkspacesPage() {
  const { workspaces, activeWorkspace, loading, switchingWorkspaceId, error: contextError, retry, switchToWorkspace, createAndActivateWorkspace } = useWorkspaceContext();
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [workspaceType, setWorkspaceType] = useState<'COMPANY' | 'INSTITUTION'>('COMPANY');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [memberState, setMemberState] = useState<MemberState>({ status: 'loading', workspaceId: null });

  useEffect(() => {
    const workspaceId = activeWorkspace?.id;
    if (!workspaceId) return;
    let current = true;
    listWorkspaceMembers(workspaceId)
      .then((members) => { if (current) setMemberState({ status: 'success', workspaceId, members }); })
      .catch((cause: unknown) => { if (current) setMemberState({ status: 'error', workspaceId, message: errorText(cause, 'Workspace members could not be loaded.') }); });
    return () => { current = false; };
  }, [activeWorkspace?.id]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = workspaceName.trim();
    const description = workspaceDescription.trim();
    if (name.length < 2 || name.length > 80) {
      setCreateError('Workspace name must be between 2 and 80 characters.');
      return;
    }
    if (description.length > 500) {
      setCreateError('Description must be 500 characters or fewer.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createAndActivateWorkspace({ name, description: description || null, type: workspaceType, visibility });
      setWorkspaceName('');
      setWorkspaceDescription('');
    } catch (cause) {
      setCreateError(errorText(cause, 'The workspace could not be created.'));
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><p role="status">Loading workspaces…</p></main>;
  if (contextError && workspaces.length === 0) return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><Alert variant="error" title="Workspaces unavailable">{contextError}</Alert><Button className="mt-4" onClick={retry}>Try again</Button></main>;

  const activeMembers = memberState.status === 'success' && memberState.workspaceId === activeWorkspace?.id ? memberState.members : null;
  const memberError = memberState.status === 'error' && memberState.workspaceId === activeWorkspace?.id ? memberState.message : null;
  const membersLoading = Boolean(activeWorkspace && !activeMembers && !memberError);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-7 px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/app" className="text-sm font-medium text-[var(--color-primary)] hover:underline">← Back to workspace</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight">Workspaces</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Create and manage Company and Institution workspaces, and switch between the workspaces you belong to.</p></div></header>
      {contextError && <Alert variant="error" title="Workspace switch failed">{contextError}</Alert>}

      {workspaces.length > 0 && <Card className="p-5 sm:p-7"><h2 className="text-xl font-semibold">Your workspaces</h2><ul className="mt-4 divide-y divide-[var(--color-border)]">{workspaces.map((workspace) => <li key={workspace.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{workspace.name}{workspace.isPersonal && <span className="ml-2 text-xs text-[var(--color-text-secondary)]">Personal</span>}</p><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{workspace.type} · {workspace.memberCount} members · {workspace.role}</p></div><Button variant={workspace.id === activeWorkspace?.id ? 'secondary' : 'primary'} disabled={workspace.id === activeWorkspace?.id || switchingWorkspaceId !== null} loading={switchingWorkspaceId === workspace.id} onClick={() => { void switchToWorkspace(workspace.id); }}>{workspace.id === activeWorkspace?.id ? 'Current workspace' : 'Switch to workspace'}</Button></li>)}</ul></Card>}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-7"><h2 className="text-xl font-semibold">Create a workspace</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">You’ll become the workspace owner. Your personal workspace remains separate.</p>{createError && <Alert variant="error" title="Workspace not created" className="mt-5">{createError}</Alert>}<form onSubmit={handleCreate} className="mt-5 space-y-5"><RadioGroup legend="Workspace type" name="workspace-type" value={workspaceType} onChange={(value) => setWorkspaceType(value as 'COMPANY' | 'INSTITUTION')} options={[{ value: 'COMPANY', label: 'Company' }, { value: 'INSTITUTION', label: 'Institution' }]} helperText="Personal workspaces are created and managed by Nexus account setup." /><Input id="new-workspace-name" label="Workspace name" required minLength={2} maxLength={80} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} /><Textarea id="new-workspace-description" label="Description" rows={3} maxLength={500} value={workspaceDescription} onChange={(event) => setWorkspaceDescription(event.target.value)} /><Select id="new-workspace-visibility" label="Visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as 'PRIVATE' | 'PUBLIC')} options={[{ value: 'PRIVATE', label: 'Private' }, { value: 'PUBLIC', label: 'Publicly discoverable' }]} /><div className="flex justify-end"><Button type="submit" loading={creating}>Create workspace</Button></div></form></Card>

        {activeWorkspace ? <div className="space-y-6"><WorkspaceSettings key={activeWorkspace.id} workspaceId={activeWorkspace.id} /><Card className="p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Members</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">People who currently belong to {activeWorkspace.name}.</p></div><span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]">{activeMembers?.length ?? activeWorkspace.memberCount}</span></div>{membersLoading ? <p role="status" className="mt-5 text-sm text-[var(--color-text-secondary)]">Loading members…</p> : memberError ? <Alert variant="error" title="Members unavailable" className="mt-5">{memberError}</Alert> : activeMembers?.length ? <ul className="mt-5 divide-y divide-[var(--color-border)]">{activeMembers.map((member) => <li key={member.id} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{member.name}{member.owner && <span className="ml-2 text-xs text-[var(--color-primary)]">Owner</span>}</p><p className="text-xs text-[var(--color-text-secondary)]">{member.email}</p></div><p className="text-xs text-[var(--color-text-secondary)]">{member.organizationRole ?? member.role} · {member.membershipStatus.toLowerCase()}</p></li>)}</ul> : <EmptyState title="No members found" description="The backend returned no members for this workspace." />}</Card></div> : <Card className="p-5 sm:p-7"><EmptyState title="Choose a workspace" description="Create a Company or Institution workspace, or select an existing one." /></Card>}
      </section>
    </main>
  );
}
