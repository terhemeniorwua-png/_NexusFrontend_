'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import { permissionDiff, permissionLabel, projectRoleLabel } from '@/lib/permissions';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
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

function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action.';
  if (cause.status === 409) return cause.message;
  return cause.message;
}

interface PendingRoleChange {
  member: ProjectMember;
  role: ProjectRole;
}

export default function ProjectMembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace, user } = useWorkspaceContext();
  const {
    can,
    isLoading: permissionsLoading,
    assignableRoles,
    roleDefinitions,
  } = usePermissions();
  useWorkspaceRedirect();
  const roleHintId = useId();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<ProjectRole | ''>('');
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);

  const canManage = can('project.member.manage');

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
    if (!activeWorkspace || !addUserId || !addRole) return;
    setBusy(true); setError(null);
    try {
      await addProjectMember(activeWorkspace.id, projectId, addUserId, addRole);
      setAddUserId('');
      setAddRole('');
      setNotice('Member added.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Member could not be added.')); }
    finally { setBusy(false); }
  }

  async function handleRoleChange() {
    if (!activeWorkspace || !pendingRoleChange) return;
    const { member, role } = pendingRoleChange;
    setBusy(true); setError(null);
    try {
      await updateProjectMember(activeWorkspace.id, projectId, member.userId, role);
      setPendingRoleChange(null);
      setNotice('Role updated.');
      await load();
    } catch (cause) {
      setError(requestError(cause, 'Role could not be updated.'));
      setPendingRoleChange(null);
    } finally { setBusy(false); }
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
  const addRoleOptions = assignableRoles.map((role) => ({ value: role, label: projectRoleLabel(role) }));

  const roleChangeDiff = (() => {
    if (!pendingRoleChange) return { gained: [], lost: [] };
    const current = roleDefinitions.find((entry) => entry.role === pendingRoleChange.member.role)?.permissions ?? [];
    const next = roleDefinitions.find((entry) => entry.role === pendingRoleChange.role)?.permissions ?? [];
    return permissionDiff(current, next);
  })();

  if (loading || permissionsLoading) {
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
      {!canManage && (
        <Alert variant="info">
          You can view the member list, but only project managers can add, remove, or change member roles.
        </Alert>
      )}

      {canManage && (
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
                  { value: '', label: 'Select a role…' },
                  ...addRoleOptions,
                ]}
                disabled={addRoleOptions.length === 0}
                helperText={addRoleOptions.length === 0 ? 'Your role cannot grant any project role.' : undefined}
              />
            </div>
            <Button type="submit" loading={busy} disabled={!addUserId || !addRole}>Add member</Button>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Current members</h3>
        {members.length === 0 ? (
          <EmptyState title="No members" description="Add workspace members to this project." />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]" aria-label="Project member list">
            {members.map((member) => {
              const isSelf = member.userId === user?.id;
              const currentRoleIncluded = assignableRoles.includes(member.role);
              const roleOptions = [
                ...(currentRoleIncluded
                  ? []
                  : [{ value: member.role, label: `${projectRoleLabel(member.role)} (current)`, disabled: true }]),
                ...assignableRoles.map((role) => ({ value: role, label: projectRoleLabel(role) })),
              ];

              return (
                <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium">{member.user.name}{isSelf ? ' (you)' : ''}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{member.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{projectRoleLabel(member.role)}</Badge>
                    {canManage && (
                      isSelf ? (
                        <>
                          <Select
                            id={`role-${member.userId}`}
                            label="Change role"
                            srOnlyLabel
                            value={member.role}
                            onChange={() => undefined}
                            disabled
                            aria-describedby={roleHintId}
                            options={roleOptions.length > 0 ? roleOptions : [{ value: member.role, label: projectRoleLabel(member.role) }]}
                          />
                          <span id={roleHintId} className="sr-only">You cannot change your own project role.</span>
                          <span className="text-xs text-[var(--color-text-muted)]" title="You cannot change your own project role.">
                            You cannot change your own role.
                          </span>
                        </>
                      ) : (
                        <Select
                          id={`role-${member.userId}`}
                          label="Change role"
                          srOnlyLabel
                          value={member.role}
                          onChange={(event) => {
                            const role = event.target.value as ProjectRole;
                            if (role === member.role) return;
                            setPendingRoleChange({ member, role });
                          }}
                          disabled={busy || roleOptions.length === 0}
                          options={roleOptions.length > 0 ? roleOptions : [{ value: member.role, label: projectRoleLabel(member.role) }]}
                        />
                      )
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setRemoveTarget(member)}
                        aria-label={`Remove ${member.user.name}`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
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

      <Modal
        open={Boolean(pendingRoleChange)}
        onClose={() => setPendingRoleChange(null)}
        title={`Change ${pendingRoleChange?.member.user.name ?? 'member'}'s role?`}
        description={
          pendingRoleChange
            ? `${projectRoleLabel(pendingRoleChange.member.role)} → ${projectRoleLabel(pendingRoleChange.role)}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingRoleChange(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void handleRoleChange()} loading={busy}>
              Change role
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {roleChangeDiff.gained.length === 0 && roleChangeDiff.lost.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              This change does not add or remove any permissions.
            </p>
          ) : (
            <>
              <section aria-labelledby="privileges-gained">
                <h3 id="privileges-gained" className="text-sm font-semibold text-[var(--color-success)]">
                  Privileges gained
                </h3>
                {roleChangeDiff.gained.length === 0 ? (
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">None</p>
                ) : (
                  <ul className="mt-1 list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
                    {roleChangeDiff.gained.map((permission) => (
                      <li key={permission}>{permissionLabel(permission)}</li>
                    ))}
                  </ul>
                )}
              </section>
              <section aria-labelledby="privileges-lost">
                <h3 id="privileges-lost" className="text-sm font-semibold text-[var(--color-error)]">
                  Privileges lost
                </h3>
                {roleChangeDiff.lost.length === 0 ? (
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">None</p>
                ) : (
                  <ul className="mt-1 list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
                    {roleChangeDiff.lost.map((permission) => (
                      <li key={permission}>{permissionLabel(permission)}</li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
          {roleDefinitions.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              The full role permission catalogue is not available, so only the role change is shown.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
