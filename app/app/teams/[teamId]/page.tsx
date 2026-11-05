'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { getTeam, listTeamMembers, type Team, type TeamMember } from '@/services/organization-structure';

export default function TeamDetailPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;
  const { activeWorkspace } = useWorkspaceContext();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedScope, setLoadedScope] = useState('');
  const [error, setError] = useState<string | null>(null);
  const currentScope = activeWorkspace ? `${activeWorkspace.id}:${teamId}` : '';
  const displayedTeam = loadedScope === currentScope ? team : null;
  const displayedMembers = loadedScope === currentScope ? members : [];

  useEffect(() => {
    if (!activeWorkspace || !teamId || !['COMPANY', 'INSTITUTION'].includes(activeWorkspace.type)) {
      return;
    }
    let current = true;
    void Promise.resolve().then(() => Promise.all([getTeam(activeWorkspace.id, teamId), listTeamMembers(activeWorkspace.id, teamId)]))
      .then(([loadedTeam, loadedMembers]) => {
        if (!current) return;
        setError(null);
        setTeam(loadedTeam); setMembers(loadedMembers); setLoadedScope(`${activeWorkspace.id}:${teamId}`);
      })
      .catch((cause: unknown) => {
        if (current) { setTeam(null); setMembers([]); setError(cause instanceof ApiRequestError ? cause.message : 'Team details could not be loaded.'); setLoadedScope(`${activeWorkspace.id}:${teamId}`); }
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeWorkspace, teamId]);

  if (!activeWorkspace || activeWorkspace.type === 'INDIVIDUAL') {
    return <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8"><EmptyState title="Organisation workspace required" description="Teams are available in company and institution workspaces." /></div>;
  }

  return <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8">
    <PageHeader title={displayedTeam?.name ?? 'Team details'} description={displayedTeam?.description ?? 'Workspace team and its current membership.'} breadcrumb={<Link className="text-sm text-[var(--color-primary)] hover:underline" href="/app/teams">← Teams and structure</Link>} />
    {error && <Alert variant="error" title="Team unavailable">{error}</Alert>}
    {loading || loadedScope !== currentScope ? <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading team…</p> : displayedTeam ? <>
      <div className="flex flex-wrap gap-2"><Badge variant={displayedTeam.status === 'ACTIVE' ? 'success' : 'default'}>{displayedTeam.status}</Badge><Badge>{displayedMembers.length} visible members</Badge>{displayedTeam.lead && <Badge>Lead: {displayedTeam.lead.name}</Badge>}</div>
      <Card className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Members</h2><Link href="/app/teams" className="text-sm text-[var(--color-primary)] hover:underline">Manage team</Link></div>
        {displayedMembers.length ? <ul className="divide-y divide-[var(--color-border)]">{displayedMembers.map((member) => <li key={member.userId} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block truncate text-sm font-medium">{member.name}</span><span className="block truncate text-xs text-[var(--color-text-secondary)]">{member.email}</span></span><Badge>{member.role === 'TEAM_LEAD' ? 'Lead' : 'Member'}</Badge></li>)}</ul> : <EmptyState title="No visible team members" description="Members may be hidden when the backend denies roster access." />}
      </Card>
      <Card><h2 className="font-semibold">Activity</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Team activity is not available because the backend does not currently expose a team activity endpoint.</p></Card>
    </> : !error && <EmptyState title="Team not found" description="The team may have been removed or may not be available in this workspace." />}
  </div>;
}
