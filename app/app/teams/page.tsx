'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
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
  addTeamMember, archiveTeam, assignDepartmentMember, createDepartment, createTeam,
  listDepartments, listTeamMembers, listTeams, removeTeamMember, renameDepartment,
  setTeamLead, updateTeam, type Department, type Team, type TeamMember,
} from '@/services/organization-structure';

type Section = 'teams' | 'departments';

function requestMessage(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 401) return 'Your session could not be verified. Sign in again and retry.';
  if (cause.status === 403) return 'Your current role does not allow this operation. Ask a workspace administrator if you need access.';
  return cause.message;
}

export default function TeamsPage() {
  const { activeWorkspace, loading: workspaceLoading } = useWorkspaceContext();
  const [section, setSection] = useState<Section>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [visibleTeamMembersState, setVisibleTeamMembersState] = useState<{ workspaceId: string; members: TeamMember[] } | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberId, setMemberId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [departmentMemberId, setDepartmentMemberId] = useState('');
  const [departmentMemberRole, setDepartmentMemberRole] = useState<'HEAD' | 'MEMBER'>('MEMBER');
  const [departmentName, setDepartmentName] = useState('');
  const [departmentNames, setDepartmentNames] = useState<Record<string, string>>({});
  const [teamDepartmentId, setTeamDepartmentId] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const latestLoad = useRef(0);
  const activeWorkspaceIdRef = useRef<string | undefined>(activeWorkspace?.id);
  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspace?.id;
  }, [activeWorkspace?.id]);

  const isInstitution = activeWorkspace?.type === 'INSTITUTION';
  const selectedTeam = loadedWorkspaceId === activeWorkspace?.id ? teams.find((team) => team.id === selectedTeamId) ?? null : null;
  const visibleTeamMembers = useMemo(
    () => visibleTeamMembersState && visibleTeamMembersState.workspaceId === activeWorkspace?.id
      ? visibleTeamMembersState.members
      : [],
    [visibleTeamMembersState, activeWorkspace?.id],
  );
  const teamMembers = visibleTeamMembers.filter((member) => member.teamId === selectedTeamId);

  const load = useCallback(async () => {
    if (activeWorkspace && activeWorkspace.id !== activeWorkspaceIdRef.current) return;
    const loadId = ++latestLoad.current;
    setTeams([]); setMembers([]); setDepartments([]); setVisibleTeamMembersState(null); setLoadedWorkspaceId('');
    if (!activeWorkspace || !['COMPANY', 'INSTITUTION'].includes(activeWorkspace.type)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [teamList, workspaceMembers, departmentList] = await Promise.all([
        listTeams(activeWorkspace.id),
        listWorkspaceMembers(activeWorkspace.id),
        activeWorkspace.type === 'INSTITUTION' ? listDepartments(activeWorkspace.id) : Promise.resolve([]),
      ]);
      const membershipResults = await Promise.allSettled(teamList.map((team) => listTeamMembers(activeWorkspace.id, team.id)));
      if (loadId !== latestLoad.current) return;
      const memberships = membershipResults.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
      setTeams(teamList);
      setLoadedWorkspaceId(activeWorkspace.id);
      setVisibleTeamMembersState({ workspaceId: activeWorkspace.id, members: memberships });
      setMembers(workspaceMembers.filter((member) => member.membershipStatus === 'ACTIVE'));
      setDepartments(departmentList);
      setSelectedTeamId((current) => teamList.some((team) => team.id === current) ? current : teamList[0]?.id ?? '');
      setSelectedDepartmentId((current) => departmentList.some((department) => department.id === current) ? current : departmentList[0]?.id ?? '');
    } catch (cause) {
      if (loadId !== latestLoad.current) return;
      setTeams([]); setMembers([]); setDepartments([]); setVisibleTeamMembersState({ workspaceId: activeWorkspace.id, members: [] });
      setLoadedWorkspaceId(activeWorkspace.id);
      setError(requestMessage(cause, 'The workspace structure could not be loaded.'));
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load() : undefined);
    return () => { active = false; };
  }, [load]);

  const assignmentsByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    const names = new Map(teams.map((team) => [team.id, team.name]));
    for (const member of visibleTeamMembers) {
      const teamName = names.get(member.teamId);
      if (teamName) map.set(member.userId, [...(map.get(member.userId) ?? []), teamName]);
    }
    return map;
  }, [teams, visibleTeamMembers]);
  const unassignedMembers = members.filter((member) => !assignmentsByUser.has(member.userId));
  const multiTeamMembers = members.filter((member) => (assignmentsByUser.get(member.userId)?.length ?? 0) > 1);

  async function perform(action: () => Promise<unknown>, success: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true); setError(null); setNotice(null);
    try { await action(); setNotice(success); await load(); return true; }
    catch (cause) { setError(requestMessage(cause, 'The requested change could not be completed.')); return false; }
    finally { setBusy(false); }
  }

  async function submitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) return;
    const selectedMember = leadId || undefined;
    await perform(async () => {
      await createTeam(activeWorkspace.id, {
        name: name.trim(), description: description.trim() || null,
        ...(isInstitution ? { departmentId: teamDepartmentId || null } : {}),
        ...(selectedMember ? { leadId: selectedMember } : {}),
      });
      setName(''); setDescription(''); setLeadId(''); setTeamDepartmentId('');
    }, 'Team created.');
  }

  async function submitDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) return;
    await perform(async () => { await createDepartment(activeWorkspace.id, departmentName.trim()); setDepartmentName(''); }, 'Department created.');
  }

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !selectedTeam) return;
    const form = new FormData(event.currentTarget);
    const nextName = String(form.get('teamName') ?? '').trim();
    const nextDescription = String(form.get('teamDescription') ?? '').trim() || null;
    const nextDepartmentId = String(form.get('teamDepartmentId') ?? '') || null;
    const nextLeadId = String(form.get('teamLeadId') ?? '') || null;
    await perform(async () => {
      const updated = await updateTeam(activeWorkspace.id, selectedTeam.id, {
        name: nextName, description: nextDescription,
        ...(isInstitution ? { departmentId: nextDepartmentId } : {}),
      });
      if (nextLeadId !== selectedTeam.leadId) await setTeamLead(activeWorkspace.id, selectedTeam.id, nextLeadId);
      setTeams((current) => current.map((team) => team.id === updated.id ? updated : team));
    }, 'Team details updated.');
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !selectedTeam || !memberId) return;
    await perform(async () => { await addTeamMember(activeWorkspace.id, selectedTeam.id, memberId); setMemberId(''); }, 'Member added to the team.');
  }

  async function assignDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !selectedDepartmentId || !departmentMemberId) return;
    await perform(async () => { await assignDepartmentMember(activeWorkspace.id, selectedDepartmentId, departmentMemberId, departmentMemberRole); setDepartmentMemberId(''); }, 'Department assignment saved.');
  }

  if (workspaceLoading) {
    return <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8"><p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading workspace…</p></div>;
  }

  if (!activeWorkspace || activeWorkspace.type === 'INDIVIDUAL') {
    return <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8"><EmptyState title="Organisation workspace required" description="Teams and departments are available in company and institution workspaces." /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8">
      <PageHeader title="Teams and structure" description={`Manage teams${isInstitution ? ' and departments' : ''} in ${activeWorkspace.name}. The backend enforces permissions for every change.`} />
      {error && <Alert variant="error" title="Could not complete request">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Organisation structure">
        <Button variant={section === 'teams' ? 'primary' : 'secondary'} onClick={() => setSection('teams')} role="tab" aria-selected={section === 'teams'}>Teams</Button>
        {isInstitution && <Button variant={section === 'departments' ? 'primary' : 'secondary'} onClick={() => setSection('departments')} role="tab" aria-selected={section === 'departments'}>Departments</Button>}
      </div>
      {loading || loadedWorkspaceId !== activeWorkspace.id ? <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading organisation structure…</p> : section === 'teams' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-5">
            <Card className="space-y-4">
              <h2 className="text-lg font-semibold">Create a team</h2>
              <form className="space-y-4" onSubmit={(event) => { void submitTeam(event); }}>
                <Input id="team-name" label="Team name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
                <Textarea id="team-description" label="Description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
                {isInstitution && <Select id="team-department" label="Department" options={[{ value: '', label: 'No department' }, ...departments.map((department) => ({ value: department.id, label: department.name }))]} value={teamDepartmentId} onChange={(event) => setTeamDepartmentId(event.target.value)} />}
                <Select id="team-lead" label="Initial team lead (optional)" options={[{ value: '', label: 'No lead' }, ...members.map((member) => ({ value: member.userId, label: member.name }))]} value={leadId} onChange={(event) => setLeadId(event.target.value)} />
                <Button type="submit" loading={busy}>Create team</Button>
              </form>
            </Card>
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold">Workspace teams</h2>
              {teams.length === 0 ? <EmptyState title="No teams yet" description="Create a team to organise workspace members." /> : <ul className="space-y-2">{teams.map((team) => <li key={team.id}>
                <button type="button" onClick={() => setSelectedTeamId(team.id)} aria-pressed={team.id === selectedTeamId} className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] p-3 text-left hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                  <span className="min-w-0"><span className="block truncate font-medium">{team.name}</span><span className="text-xs text-[var(--color-text-secondary)]">{team.memberCount} members{team.lead ? ` · Lead: ${team.lead.name}` : ''}</span></span><Badge variant={team.status === 'ACTIVE' ? 'success' : 'default'}>{team.status}</Badge>
                </button>
              </li>)}</ul>}
            </Card>
          </div>
          <div className="space-y-5">
            {selectedTeam ? <>
              <Card className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Team details</h2><div className="flex flex-wrap gap-2"><Link href={`/app/teams/${encodeURIComponent(selectedTeam.id)}`} className="inline-flex h-8 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-surface-secondary)]">Open details</Link>{selectedTeam.status === 'ACTIVE' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirmArchive(true)}>Archive team</Button>}</div></div>
                <form key={selectedTeam.id} className="space-y-4" onSubmit={(event) => { void saveTeam(event); }}>
                  <Input id="edit-team-name" name="teamName" label="Name" defaultValue={selectedTeam.name} required minLength={2} maxLength={80} />
                  <Textarea id="edit-team-description" name="teamDescription" label="Description" defaultValue={selectedTeam.description ?? ''} maxLength={500} />
                  {isInstitution && <Select id="edit-team-department" name="teamDepartmentId" label="Department" options={[{ value: '', label: 'No department' }, ...departments.map((department) => ({ value: department.id, label: department.name }))]} defaultValue={selectedTeam.departmentId ?? ''} />}
                  <Select id="team-lead-change" name="teamLeadId" label="Team lead" options={[{ value: '', label: 'No lead' }, ...members.map((member) => ({ value: member.userId, label: member.name }))]} defaultValue={selectedTeam.leadId ?? ''} />
                  <Button type="submit" loading={busy}>Save team details and lead</Button>
                </form>
              </Card>
              <Card className="space-y-4">
                <h2 className="text-lg font-semibold">Team members</h2>
                <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { void addMember(event); }}>
                  <div className="min-w-0 flex-1"><Select id="add-team-member" label="Add an active workspace member" options={members.filter((member) => !teamMembers.some((teamMember) => teamMember.userId === member.userId)).map((member) => ({ value: member.userId, label: `${member.name} · ${member.email}` }))} value={memberId} onChange={(event) => setMemberId(event.target.value)} placeholder="Select a member" /></div><Button type="submit" loading={busy} disabled={!memberId}>Add member</Button>
                </form>
                {teamMembers.length ? <ul className="divide-y divide-[var(--color-border)]">{teamMembers.map((member) => <li key={member.userId} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block truncate text-sm font-medium">{member.name}</span><span className="block truncate text-xs text-[var(--color-text-secondary)]">{member.email}</span></span><div className="flex items-center gap-2"><Badge>{member.role === 'TEAM_LEAD' ? 'Lead' : 'Member'}</Badge><Button size="sm" variant="ghost" disabled={busy} onClick={() => setMemberToRemove(member)}>Remove</Button></div></li>)}</ul> : <p className="text-sm text-[var(--color-text-secondary)]">{selectedTeam.memberCount > 0 ? 'The backend did not provide a readable roster for this team.' : 'No team members are assigned yet.'}</p>}
              </Card>
            </> : <Card><EmptyState title="Select a team" description="Choose a team to view its members and settings." /></Card>}
            <Card className="space-y-3"><div><h2 className="font-semibold">Team assignment overview</h2><p className="text-sm text-[var(--color-text-secondary)]">Membership details are shown only where the backend grants access to that team. These totals cover visible team rosters.</p></div><div><p className="text-sm font-medium">No assignment in visible teams ({unassignedMembers.length})</p><div className="mt-2 flex flex-wrap gap-2">{unassignedMembers.slice(0, 10).map((member) => <Badge key={member.userId}>{member.name}</Badge>)}</div></div><div><p className="text-sm font-medium">Members in multiple visible teams ({multiTeamMembers.length})</p><ul className="mt-2 space-y-1">{multiTeamMembers.slice(0, 10).map((member) => <li key={member.userId} className="text-sm"><span className="font-medium">{member.name}</span><span className="text-[var(--color-text-secondary)]"> — {assignmentsByUser.get(member.userId)?.join(', ')}</span></li>)}</ul></div></Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="space-y-4"><h2 className="text-lg font-semibold">Departments</h2><form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { void submitDepartment(event); }}><div className="min-w-0 flex-1"><Input id="department-name" label="New department name" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} required minLength={2} maxLength={80} /></div><Button type="submit" loading={busy}>Create department</Button></form>{departments.length ? <ul className="space-y-3">{departments.map((department) => <li key={department.id} className="rounded-lg border border-[var(--color-border)] p-3"><form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); const nextName = (departmentNames[department.id] ?? department.name).trim(); void perform(async () => { await renameDepartment(activeWorkspace.id, department.id, nextName); setDepartmentNames((current) => ({ ...current, [department.id]: nextName })); }, 'Department renamed.'); }}><div className="min-w-0 flex-1"><Input id={`department-${department.id}`} label="Name" value={departmentNames[department.id] ?? department.name} onChange={(event) => setDepartmentNames((current) => ({ ...current, [department.id]: event.target.value }))} required minLength={2} maxLength={80} /></div><Badge>{department.memberCount} assigned</Badge><Button type="submit" size="sm" variant="secondary" loading={busy}>Rename</Button></form></li>)}</ul> : <EmptyState title="No departments" description="Create departments to organise institution membership." />}</Card>
          <Card className="space-y-4"><h2 className="text-lg font-semibold">Assign a member</h2><p className="text-sm text-[var(--color-text-secondary)]">The backend supports assignment, but does not currently expose department member identities for listing or removal here.</p><form className="space-y-4" onSubmit={(event) => { void assignDepartment(event); }}><Select id="assign-department" label="Department" options={departments.map((department) => ({ value: department.id, label: department.name }))} value={selectedDepartmentId} onChange={(event) => setSelectedDepartmentId(event.target.value)} placeholder="Select department" required /><Select id="department-member" label="Workspace member" options={members.map((member) => ({ value: member.userId, label: `${member.name} · ${member.email}` }))} value={departmentMemberId} onChange={(event) => setDepartmentMemberId(event.target.value)} placeholder="Select member" required /><Select id="department-member-role" label="Department role" options={[{ value: 'MEMBER', label: 'Member' }, { value: 'HEAD', label: 'Head' }]} value={departmentMemberRole} onChange={(event) => setDepartmentMemberRole(event.target.value as 'HEAD' | 'MEMBER')} /><Button type="submit" loading={busy} disabled={!selectedDepartmentId || !departmentMemberId}>Assign member</Button></form></Card>
        </div>
      )}
    {selectedTeam && <ConfirmDialog open={confirmArchive} onClose={() => setConfirmArchive(false)} title="Archive team?" description={`Archive ${selectedTeam.name}? Team members and history remain retained, but the team will no longer be active.`} confirmLabel="Archive team" loading={busy} onConfirm={() => { void perform(() => archiveTeam(activeWorkspace.id, selectedTeam.id), 'Team archived.').then((succeeded) => { if (succeeded) setConfirmArchive(false); }); }} />}
    {selectedTeam && memberToRemove && <ConfirmDialog open onClose={() => setMemberToRemove(null)} onConfirm={() => { void perform(() => removeTeamMember(activeWorkspace.id, selectedTeam.id, memberToRemove.userId), 'Member removed from team.').then((succeeded) => { if (succeeded) setMemberToRemove(null); }); }} title="Remove team member?" description={`Remove ${memberToRemove.name} from ${selectedTeam.name}? They remain a member of the workspace.`} confirmLabel="Remove member" destructive loading={busy} />}
    </div>
  );
}
