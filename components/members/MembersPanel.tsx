'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ApiRequestError } from '@/lib/api';
import { AccessState } from '@/components/shared/AccessState';
import {
  assignableRoleOptions,
  canManageMember,
  isOrganizationRole,
  roleLabel,
} from '@/lib/permissions';
import {
  listWorkspaceMembers,
  removeWorkspaceMember,
  restoreWorkspaceMember,
  suspendWorkspaceMember,
  updateWorkspaceMemberRole,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceRole,
} from '@/services/workspaces';
import type { OrganizationRole } from '@/types/workspace';

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function joinedLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

interface MembersPanelProps {
  workspace: Workspace;
  canManage: boolean;
  onAccessChanged?: () => void;
}

/**
 * Member list and membership management for the active workspace.
 *
 * Every control is presentation-gated by the shared role matrix, but the
 * backend re-evaluates each mutation. A member whose role cannot manage a
 * particular target sees no action menu for that target.
 */
export function MembersPanel({ workspace, canManage, onAccessChanged }: MembersPanelProps) {
  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null);
  const [roleTarget, setRoleTarget] = useState<WorkspaceMember | null>(null);
  const [roleValue, setRoleValue] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<401 | 403 | null>(null);
  const [confirmRole, setConfirmRole] = useState(false);
  const [membershipTarget, setMembershipTarget] = useState<{ member: WorkspaceMember; action: 'suspend' | 'restore' } | null>(null);

  const roleOptions = assignableRoleOptions(workspace);

  const loadMembers = useCallback(async () => {
    try {
      const loaded = await listWorkspaceMembers(workspace.id);
      setMembers(loaded);
    } catch (cause) {
      setError(errorText(cause, 'Workspace members could not be loaded.'));
      setAccessStatus(cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403) ? cause.status : null);
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const loaded = await listWorkspaceMembers(workspace.id);
        if (active) setMembers(loaded);
      } catch (cause) {
        if (active) setError(errorText(cause, 'Workspace members could not be loaded.'));
        if (active) setAccessStatus(cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403) ? cause.status : null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [workspace.id]);

  function openRoleDialog(member: WorkspaceMember) {
    const current = member.organizationRole ?? member.role;
    setRoleTarget(member);
    setRoleValue(roleOptions.some((option) => option.value === current) ? current : roleOptions[0]?.value ?? '');
    setRoleError(null);
  }

  async function saveRole() {
    if (!roleTarget || !roleValue) return;
    setBusyMemberId(roleTarget.userId);
    setRoleError(null);
    try {
      const updated = await updateWorkspaceMemberRole(
        workspace.id,
        roleTarget.userId,
        isOrganizationRole(roleValue)
          ? { organizationRole: roleValue as OrganizationRole }
          : { role: roleValue as WorkspaceRole },
      );
      setMembers((current) => current?.map((member) => member.userId === updated.userId ? updated : member) ?? null);
      setNotice(`${updated.name} is now ${roleLabel(updated.role, updated.organizationRole)}.`);
      setRoleTarget(null);
      setConfirmRole(false);
      onAccessChanged?.();
    } catch (cause) {
      setRoleError(errorText(cause, 'The member role could not be changed.'));
    } finally {
      setBusyMemberId(null);
    }
  }

  async function changeMembershipState(member: WorkspaceMember, action: 'suspend' | 'restore') {
    setBusyMemberId(member.userId);
    setError(null);
    setNotice(null);
    try {
      const updated = action === 'suspend'
        ? await suspendWorkspaceMember(workspace.id, member.userId)
        : await restoreWorkspaceMember(workspace.id, member.userId);
      setMembers((current) => current?.map((item) => item.userId === updated.userId ? updated : item) ?? null);
      setNotice(action === 'suspend'
        ? `${updated.name}’s membership is suspended.`
        : `${updated.name}’s membership is active again.`);
      setMembershipTarget(null);
      onAccessChanged?.();
    } catch (cause) {
      setError(errorText(cause, 'The membership could not be updated.'));
    } finally {
      setBusyMemberId(null);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    const member = removeTarget;
    setBusyMemberId(member.userId);
    setError(null);
    setNotice(null);
    try {
      await removeWorkspaceMember(workspace.id, member.userId);
      setMembers((current) => current?.filter((item) => item.userId !== member.userId) ?? null);
      setNotice(`${member.name} was removed from ${workspace.name}.`);
      setRemoveTarget(null);
    } catch (cause) {
      setError(errorText(cause, 'The member could not be removed.'));
    } finally {
      setBusyMemberId(null);
    }
  }

  function actionItems(member: WorkspaceMember): DropdownItem[] {
    const allowed = canManage && canManageMember({
      actor: workspace,
      targetRole: member.role,
      targetOrganizationRole: member.organizationRole,
      targetIsOwner: member.owner,
    });
    if (!allowed) return [];

    const items: DropdownItem[] = [];
    if (roleOptions.length > 0 && member.membershipStatus === 'ACTIVE') {
      items.push({ id: 'role', label: 'Change role', onSelect: () => openRoleDialog(member) });
    }
    if (member.membershipStatus === 'ACTIVE') {
      items.push({
        id: 'suspend',
        label: 'Suspend membership',
        onSelect: () => setMembershipTarget({ member, action: 'suspend' }),
      });
    } else {
      items.push({
        id: 'restore',
        label: 'Restore membership',
        onSelect: () => setMembershipTarget({ member, action: 'restore' }),
      });
    }
    items.push({
      id: 'remove',
      label: 'Remove from workspace',
      destructive: true,
      separatorBefore: true,
      onSelect: () => setRemoveTarget(member),
    });
    return items;
  }

  if (loading) {
    return <Card className="p-5 sm:p-7"><p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading members…</p></Card>;
  }

  if (error && !members) {
    return (
      accessStatus ? <AccessState status={accessStatus} onRetry={() => { setLoading(true); setError(null); void loadMembers(); }} /> :
      <Card className="p-5 sm:p-7">
        <Alert variant="error" title="Members unavailable">{error}</Alert>
        <Button className="mt-4" onClick={() => { setLoading(true); setError(null); void loadMembers(); }}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {notice && <Alert variant="success" title="Membership updated">{notice}</Alert>}
      {error && <Alert variant="error" title="Membership action failed">{error}</Alert>}

      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Members</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              People who belong to {workspace.name}. Roles are enforced by the backend.
            </p>
          </div>
          <Badge variant="info">{members?.length ?? 0}</Badge>
        </div>

        {members && members.length === 0 ? (
          <EmptyState title="No members found" description="The backend returned no members for this workspace." />
        ) : (
          <ul className="mt-5 divide-y divide-[var(--color-border)]">
            {members?.map((member) => {
              const items = actionItems(member);
              return (
                <li key={member.userId} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={member.name} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                        {member.owner && <span className="ml-2 text-xs font-medium text-[var(--color-primary)]">Owner</span>}
                      </p>
                      <p className="truncate text-xs text-[var(--color-text-secondary)]">{member.email}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        Joined {joinedLabel(member.joinedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge variant="outline">{roleLabel(member.role, member.organizationRole)}</Badge>
                    {member.membershipStatus === 'SUSPENDED'
                      ? <Badge variant="warning">Suspended</Badge>
                      : <Badge variant="success">Active</Badge>}
                    {member.status !== member.membershipStatus && <Badge variant={member.status === 'ACTIVE' ? 'success' : 'outline'}>{member.status.replaceAll('_', ' ').toLowerCase()}</Badge>}
                    {items.length > 0 && (
                      <Dropdown
                        items={items}
                        label={`Manage ${member.name}`}
                        triggerLabel={`Manage ${member.name}`}
                        align="end"
                        triggerClassName="h-8 px-2.5 text-sm"
                      >
                        Manage
                      </Dropdown>
                    )}
                    {busyMemberId === member.userId && <span role="status" className="text-xs text-[var(--color-text-secondary)]">Saving…</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => { void confirmRemove(); }}
        title="Remove member"
        description={removeTarget
          ? `Remove ${removeTarget.name} from ${workspace.name}? Their Nexus account and personal workspace are not deleted. Any tasks assigned to them must be reassigned by the backend rules or the request will be rejected.`
          : undefined}
        confirmLabel="Remove member"
        destructive
        loading={removeTarget !== null && busyMemberId === removeTarget.userId}
      />

      <Modal
        open={roleTarget !== null}
        onClose={() => setRoleTarget(null)}
        title={`Change role for ${roleTarget?.name ?? 'member'}`}
        description="Only roles your own role may grant are listed. The backend confirms the change."
        footer={(
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRoleTarget(null)}>Cancel</Button>
            <Button loading={roleTarget !== null && busyMemberId === roleTarget.userId} onClick={() => setConfirmRole(true)}>Save role</Button>
          </div>
        )}
      >
        {roleError && <Alert variant="error" title="Role not changed" className="mb-4">{roleError}</Alert>}
        <Select
          id="member-role"
          label="Role"
          value={roleValue}
          onChange={(event) => setRoleValue(event.target.value)}
          options={roleOptions.map((option) => ({ value: option.value, label: option.label }))}
          disabled={roleOptions.length === 0}
        />
      </Modal>
      <ConfirmDialog open={confirmRole} onClose={() => setConfirmRole(false)} onConfirm={() => { void saveRole(); }} title="Change member role?" description={roleTarget ? `Change ${roleTarget.name} from ${roleLabel(roleTarget.role, roleTarget.organizationRole)} to ${roleLabel(roleValue, isOrganizationRole(roleValue) ? roleValue as OrganizationRole : null)}? Their available actions and workspace navigation will change.` : undefined} confirmLabel="Change role" loading={roleTarget !== null && busyMemberId === roleTarget.userId} />
      <ConfirmDialog open={membershipTarget !== null} onClose={() => setMembershipTarget(null)} onConfirm={() => { if (membershipTarget) void changeMembershipState(membershipTarget.member, membershipTarget.action); }} title={membershipTarget?.action === 'suspend' ? 'Suspend member?' : 'Restore member?'} description={membershipTarget ? `${membershipTarget.action === 'suspend' ? 'Suspend' : 'Restore'} ${membershipTarget.member.name}’s membership in ${workspace.name}. Their access to workspace resources will ${membershipTarget.action === 'suspend' ? 'be disabled' : 'be restored'} according to backend permissions.` : undefined} confirmLabel={membershipTarget?.action === 'suspend' ? 'Suspend member' : 'Restore member'} destructive={membershipTarget?.action === 'suspend'} loading={membershipTarget !== null && busyMemberId === membershipTarget.member.userId} />
    </div>
  );
}
