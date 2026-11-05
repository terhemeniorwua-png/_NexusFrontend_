'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/layout/PageHeader';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { listWorkspaceMembers, type WorkspaceMember } from '@/services/workspaces';
import {
  addInstitutionGroupMember, createInstitutionGroup, deleteInstitutionGroup,
  listInstitutionGroupMembers, listInstitutionGroups, removeInstitutionGroupMember,
  updateInstitutionGroup, updateInstitutionGroupMember,
  type InstitutionGroup, type InstitutionGroupMember,
} from '@/services/organization-structure';

export default function GroupsPage() {
  const { activeWorkspace, loading: workspaceLoading } = useWorkspaceContext();
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [groupMembersState, setGroupMembersState] = useState<{ workspaceId: string; groupId: string; members: InstitutionGroupMember[] } | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberRole, setMemberRole] = useState<'LEAD' | 'MEMBER'>('MEMBER');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; name: string } | null>(null);
  const latestLoad = useRef(0);
  const activeWorkspaceIdRef = useRef<string | undefined>(activeWorkspace?.id);
  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspace?.id;
  }, [activeWorkspace?.id]);
  const selectedGroup = loadedWorkspaceId === activeWorkspace?.id
    ? groups.find((group) => group.id === selectedId) ?? null
    : null;
  const groupMembers = groupMembersState && groupMembersState.workspaceId === activeWorkspace?.id && groupMembersState.groupId === selectedId
    ? groupMembersState.members
    : [];

  const load = useCallback(async () => {
    if (activeWorkspace && activeWorkspace.id !== activeWorkspaceIdRef.current) return;
    const loadId = ++latestLoad.current;
    if (!activeWorkspace || activeWorkspace.type !== 'INSTITUTION') { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [groupList, memberList] = await Promise.all([
        listInstitutionGroups(activeWorkspace.id), listWorkspaceMembers(activeWorkspace.id),
      ]);
      if (loadId !== latestLoad.current) return;
      setGroups(groupList);
      setLoadedWorkspaceId(activeWorkspace.id);
      setWorkspaceMembers(memberList.filter((member) => member.membershipStatus === 'ACTIVE'));
      setSelectedId((current) => groupList.some((group) => group.id === current) ? current : groupList[0]?.id ?? '');
    } catch (cause) {
      if (loadId !== latestLoad.current) return;
      setGroups([]); setWorkspaceMembers([]); setLoadedWorkspaceId(activeWorkspace.id);
      setError(cause instanceof ApiRequestError ? cause.message : 'Institution groups could not be loaded.');
    } finally { if (loadId === latestLoad.current) setLoading(false); }
  }, [activeWorkspace]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load() : undefined);
    return () => { active = false; };
  }, [load]);
  useEffect(() => {
    if (!activeWorkspace || !selectedId || loadedWorkspaceId !== activeWorkspace.id || !groups.some((group) => group.id === selectedId)) return;
    let current = true;
    void Promise.resolve().then(() => listInstitutionGroupMembers(activeWorkspace.id, selectedId)).then((result) => {
      if (current) setGroupMembersState({ workspaceId: activeWorkspace.id, groupId: selectedId, members: result });
    }).catch((cause: unknown) => {
      if (current) setError(cause instanceof ApiRequestError ? cause.message : 'Group members could not be loaded.');
    });
    return () => { current = false; };
  }, [activeWorkspace, groups, loadedWorkspaceId, selectedId]);

  async function perform(action: () => Promise<unknown>, message: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true); setError(null); setNotice(null);
    try { await action(); setNotice(message); await load(); return true; }
    catch (cause) { setError(cause instanceof ApiRequestError ? cause.message : 'The requested change could not be completed.'); return false; }
    finally { setBusy(false); }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeWorkspace) return;
    await perform(async () => { await createInstitutionGroup(activeWorkspace.id, { name: name.trim(), description: description.trim() || null }); setName(''); setDescription(''); }, 'Group created.');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeWorkspace || !selectedGroup) return;
    const form = new FormData(event.currentTarget);
    const nextName = String(form.get('groupName') ?? '').trim();
    const nextDescription = String(form.get('groupDescription') ?? '').trim() || null;
    await perform(async () => {
      const updated = await updateInstitutionGroup(activeWorkspace.id, selectedGroup.id, { name: nextName, description: nextDescription });
      setGroups((current) => current.map((group) => group.id === updated.id ? updated : group));
    }, 'Group details updated.');
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeWorkspace || !selectedGroup || !memberId) return;
    await perform(async () => { await addInstitutionGroupMember(activeWorkspace.id, selectedGroup.id, memberId, memberRole); setMemberId(''); }, 'Member added to the group.');
  }

  if (workspaceLoading) {
    return <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8"><p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading workspace…</p></div>;
  }

  if (!activeWorkspace || activeWorkspace.type !== 'INSTITUTION') {
    return <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8"><EmptyState title="Institution workspace required" description="Groups are available only in institution workspaces." /></div>;
  }

  return <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8">
    <PageHeader title="Institution groups" description={`Manage groups in ${activeWorkspace.name}. Group membership is independent from department, team, and project access.`} />
    {error && <Alert variant="error" title="Could not complete request">{error}</Alert>}
    {notice && <Alert variant="success">{notice}</Alert>}
    {loading || loadedWorkspaceId !== activeWorkspace.id ? <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading institution groups…</p> : <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-5">
        <Card className="space-y-4"><h2 className="text-lg font-semibold">Create a group</h2><form className="space-y-4" onSubmit={(event) => { void create(event); }}>
          <Input id="new-group-name" label="Group name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
          <Textarea id="new-group-description" label="Description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
          <Button type="submit" loading={busy}>Create group</Button>
        </form></Card>
        <Card className="space-y-3"><h2 className="text-lg font-semibold">Groups</h2>{groups.length ? <ul className="space-y-2">{groups.map((group) => <li key={group.id}><button type="button" aria-pressed={group.id === selectedId} onClick={() => setSelectedId(group.id)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] p-3 text-left hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><span className="min-w-0"><span className="block truncate font-medium">{group.name}</span><span className="block truncate text-xs text-[var(--color-text-secondary)]">{group.description || 'No description'}</span></span><Badge>{group._count.members} members</Badge></button></li>)}</ul> : <EmptyState title="No groups yet" description="Create an institution group to organise members." />}</Card>
      </div>
      <div className="space-y-5">{selectedGroup ? <>
        <Card className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Group settings</h2><Button variant="destructive" size="sm" loading={busy} onClick={() => setConfirmDelete(true)}>Delete group</Button></div><form key={selectedGroup.id} className="space-y-4" onSubmit={(event) => { void save(event); }}>
          <Input id="edit-group-name" name="groupName" label="Name" defaultValue={selectedGroup.name} required minLength={2} maxLength={80} />
          <Textarea id="edit-group-description" name="groupDescription" label="Description" defaultValue={selectedGroup.description ?? ''} maxLength={500} />
          <Button type="submit" loading={busy}>Save group</Button>
        </form></Card>
        <Card className="space-y-4"><h2 className="text-lg font-semibold">Group members</h2><form className="grid gap-3 sm:grid-cols-[1fr_0.7fr_auto] sm:items-end" onSubmit={(event) => { void addMember(event); }}>
          <Select id="group-add-member" label="Workspace member" options={workspaceMembers.filter((member) => !groupMembers.some((entry) => entry.userId === member.userId)).map((member) => ({ value: member.userId, label: `${member.name} · ${member.email}` }))} value={memberId} onChange={(event) => setMemberId(event.target.value)} placeholder="Select member" />
          <Select id="group-member-role" label="Group role" options={[{ value: 'MEMBER', label: 'Member' }, { value: 'LEAD', label: 'Lead' }]} value={memberRole} onChange={(event) => setMemberRole(event.target.value as 'LEAD' | 'MEMBER')} />
          <Button type="submit" loading={busy} disabled={!memberId}>Add member</Button>
        </form>
        {groupMembers.length ? <ul className="divide-y divide-[var(--color-border)]">{groupMembers.map((entry) => {
          const member = workspaceMembers.find((candidate) => candidate.userId === entry.userId);
          return <li key={entry.userId} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block truncate text-sm font-medium">{member?.name ?? 'Workspace member'}</span><span className="block truncate text-xs text-[var(--color-text-secondary)]">{member?.email ?? 'Profile unavailable'}</span></span><div className="flex items-center gap-2"><Select id={`role-${entry.userId}`} label="Role" srOnlyLabel options={[{ value: 'MEMBER', label: 'Member' }, { value: 'LEAD', label: 'Lead' }]} value={entry.role} onChange={(event) => { void perform(() => updateInstitutionGroupMember(activeWorkspace.id, selectedGroup.id, entry.userId, event.target.value as 'LEAD' | 'MEMBER'), 'Member role updated.'); }} /><Button size="sm" variant="ghost" disabled={busy} onClick={() => setMemberToRemove({ userId: entry.userId, name: member?.name ?? 'this member' })}>Remove</Button></div></li>;
        })}</ul> : <p className="text-sm text-[var(--color-text-secondary)]">No members are assigned to this group.</p>}</Card>
      </> : <Card><EmptyState title="Select a group" description="Choose a group to manage its details and members." /></Card>}</div>
    </div>}
    {selectedGroup && <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete institution group?" description={`Delete ${selectedGroup.name} and its group membership records? Workspace memberships are not affected.`} confirmLabel="Delete group" destructive loading={busy} onConfirm={() => { void perform(() => deleteInstitutionGroup(activeWorkspace.id, selectedGroup.id), 'Group deleted.').then((succeeded) => { if (succeeded) setConfirmDelete(false); }); }} />}
    {selectedGroup && memberToRemove && <ConfirmDialog open onClose={() => setMemberToRemove(null)} title="Remove group member?" description={`Remove ${memberToRemove.name} from ${selectedGroup.name}? Their workspace membership will not change.`} confirmLabel="Remove member" destructive loading={busy} onConfirm={() => { void perform(() => removeInstitutionGroupMember(activeWorkspace.id, selectedGroup.id, memberToRemove.userId), 'Member removed from group.').then((succeeded) => { if (succeeded) setMemberToRemove(null); }); }} />}
  </div>;
}
