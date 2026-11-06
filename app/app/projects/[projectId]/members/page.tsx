'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProjectMember,
  type ProjectMember,
  type ProjectRole,
} from '@/services/projects';
import { listWorkspaceMembers, type WorkspaceMember } from '@/services/workspaces';

const ROLE_LABELS: Record<ProjectRole, string> = {
  PROJECT_MANAGER: 'Manager',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action.';
  if (cause.status === 409) return cause.message;
  return cause.message;
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  useWorkspaceRedirect();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<ProjectRole>('MEMBER');
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true); setError(null); setAccessStatus(null);
    try {
      const [projectMembers, wsMembers] = await Promise.all([
        listProjectMembers(activeWorkspace.id, projectId),
        listWorkspaceMembers(activeWorkspace.id),
      ]);
      setMembers(projectMembers);
      setWorkspaceMembers(wsMembers.filter((m) => m.membershipStatus === 'ACTIVE'));
    } catch (cause) {
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else {
        setError(requestError(cause, 'Project members could not be loaded.'));
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, projectId]);

  useEffect(() => { let active = true; void Promise.resolve().then(() => active ? load() : undefined); return () => { active = false; }; }, [load]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !addUserId) return;
    setBusy(true); setError(null);
    try {
      await addProjectMember(activeWorkspace.id, projectId, addUserId, addRole);
      setAddUserId('');
      setNotice('Member added.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Member could not be added.')); }
    finally { setBusy(false); }
  }

  async function handleRoleChange(userId: string, role: ProjectRole) {
    if (!activeWorkspace) return;
    setBusy(true); setError(null);
    try {
      await updateProjectMember(activeWorkspace.id, projectId, userId, role);
      setNotice('Role updated.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Role could not be updated.')); }
    finally { setBusy(false); }
  }

  async function handleRemove() {
    if (!activeWorkspace || !removeTarget) return;
    setBusy(true); setError(null);
    try {
      await removeProjectMember(activeWorkspace.id, projectId, removeTarget.userId);
      setRemoveTarget(null);
      setNotice('Member removed.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Member could not be removed.')); }
    finally { setBusy(false); }
  }

  const addableMembers = workspaceMembers.filter((m) => !members.some((pm) => pm.userId === m.userId));

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading members">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Project members</h2>
      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Add member</h3>
        <form className="flex flex-wrap gap-3 items-end" onSubmit={(event) => void handleAdd(event)}>
          <div className="flex-1 min-w-48">
            <Select
              id="add-member-user"
              label="Workspace member"
              value={addUserId}
              onChange={(event) => setAddUserId(event.target.value)}
              options={[
                { value: '', label: 'Select a member…' },
                ...addableMembers.map((m) => ({ value: m.userId, label: `${m.name} · ${m.email}` })),
              ]}
              placeholder="Select a member…"
            />
          </div>
          <div className="min-w-36">
            <Select
              id="add-member-role"
              label="Role"
              value={addRole}
              onChange={(event) => setAddRole(event.target.value as ProjectRole)}
              options={[
                { value: 'MEMBER', label: 'Member' },
                { value: 'PROJECT_MANAGER', label: 'Manager' },
                { value: 'VIEWER', label: 'Viewer' },
              ]}
            />
          </div>
          <Button type="submit" loading={busy} disabled={!addUserId}>Add member</Button>
        </form>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Current members</h3>
        {members.length === 0 ? (
          <EmptyState title="No members" description="Add workspace members to this project." />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]" aria-label="Project member list">
            {members.map((member) => (
              <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
                  <Select
                    id={`role-${member.userId}`}
                    label="Change role"
                    srOnlyLabel
                    value={member.role}
                    onChange={(event) => void handleRoleChange(member.userId, event.target.value as ProjectRole)}
                    options={[
                      { value: 'PROJECT_MANAGER', label: 'Manager' },
                      { value: 'MEMBER', label: 'Member' },
                      { value: 'VIEWER', label: 'Viewer' },
                    ]}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setRemoveTarget(member)}
                    aria-label={`Remove ${member.user.name}`}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void handleRemove()}
        title={`Remove ${removeTarget?.user.name ?? 'member'}?`}
        description="This member will lose access to the project. The project owner cannot be removed."
        confirmLabel="Remove member"
        destructive
        loading={busy}
      />
    </div>
  );
}
