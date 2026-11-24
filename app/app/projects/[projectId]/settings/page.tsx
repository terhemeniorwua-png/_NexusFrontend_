'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { AccessState } from '@/components/shared/AccessState';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { ApiRequestError } from '@/lib/api';
import {
  normaliseProjectType,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  type ProjectType,
} from '@/lib/project-type';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import {
  archiveProject,
  deleteProject,
  getProject,
  restoreProject,
  transferProjectOwnership,
  updateProject,
  updateProjectOrganizationAccess,
  type ProjectCommentPolicy,
  type ProjectStatus,
  type ProjectSummary,
  type ProjectVisibility,
} from '@/services/projects';
import {
  listDepartments,
  listTeams,
  type Department,
  type Team,
} from '@/services/organization-structure';
import { listWorkspaceMembers, type WorkspaceMember } from '@/services/workspaces';
import {
  listDevConnections,
  listAvailableRepositories,
  listProjectRepositories,
  listRepositoryMembers,
  linkProjectRepository,
  repositoryAccessLabel,
  removeRepositoryMemberOverride,
  setRepositoryMemberOverride,
  unlinkProjectRepository,
  type DevConnectionSummary,
  type DevRepositorySummary,
  type LinkedProjectRepository,
  type RepositoryAccessMember,
  type RepositoryAccessLevel,
} from '@/services/dev-integrations';

const editSchema = z.object({
  name: z.string().trim().min(2).max(100),
  key: z.string().trim().min(2).max(16).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']),
  type: z.enum(PROJECT_TYPES),
  visibility: z.enum(['WORKSPACE', 'DEPARTMENT_TEAM', 'PRIVATE']),
  startDate: z.string().trim().max(10).optional().or(z.literal('')),
  dueDate: z.string().trim().max(10).optional().or(z.literal('')),
}).refine(
  (data) => {
    if (!data.startDate || !data.dueDate) return true;
    return data.dueDate >= data.startDate;
  },
  {
    message: 'Due date must be on or after the start date.',
    path: ['dueDate'],
  },
);

// Visibility change warnings: when changing from one visibility to another, show a warning
const VISIBILITY_CHANGE_WARNINGS: Partial<Record<ProjectVisibility, Partial<Record<ProjectVisibility, string>>>> = {
  WORKSPACE: {
    DEPARTMENT_TEAM: 'Changing to department/team visibility will remove access for workspace members outside the linked team or department.',
    PRIVATE: 'Changing to private will remove access for all workspace members who are not explicitly added as project members.',
  },
  DEPARTMENT_TEAM: {
    WORKSPACE: 'Changing to organisation-wide will grant all workspace members access to this project.',
    PRIVATE: 'Changing to private will remove access for team/department members who are not explicitly added.',
  },
  PRIVATE: {
    WORKSPACE: 'Changing to organisation-wide will grant all workspace members access to this project.',
    DEPARTMENT_TEAM: 'Changing to department/team will grant access to team/department members.',
  },
};

function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action. Project manager permission is required.';
  if (cause.status === 409) return cause.message;
  return cause.message;
}

/** Workflow errors must surface the backend message for 403/404/409. */
function workflowRequestError(cause: unknown, fallback: string): string {
  if (cause instanceof ApiRequestError && [403, 404, 409].includes(cause.status)) {
    return cause.message;
  }
  return requestError(cause, fallback);
}

function workflowConfirmDescription(openTaskCount: number | null): string {
  const completionSentence = 'Confirming will complete it and move its unfinished tasks to the backlog.';
  if (typeof openTaskCount !== 'number' || openTaskCount <= 0) return completionSentence;
  const taskLabel = openTaskCount === 1 ? 'task' : 'tasks';
  return `This project has an active sprint with ${openTaskCount} unfinished ${taskLabel}. ${completionSentence}`;
}

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const router = useRouter();
  useWorkspaceRedirect();
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [type, setType] = useState<ProjectType>('GENERAL');
  const [visibility, setVisibility] = useState<ProjectVisibility>('WORKSPACE');
  const [commentPolicy, setCommentPolicy] = useState<ProjectCommentPolicy>('ASSIGNEES_ONLY');
  const [startDate, setStartDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Workflow mode (sprints on/off)
  const [workflowMode, setWorkflowMode] = useState<'SPRINTS' | 'BACKLOG_ONLY'>('SPRINTS');
  const [pendingWorkflowMode, setPendingWorkflowMode] = useState<'SPRINTS' | 'BACKLOG_ONLY'>('SPRINTS');
  const [workflowConfirmOpen, setWorkflowConfirmOpen] = useState(false);
  const [workflowOpenTaskCount, setWorkflowOpenTaskCount] = useState<number | null>(null);

  // Visibility change confirmation
  const [pendingVisibility, setPendingVisibility] = useState<ProjectVisibility | null>(null);
  const [visibilityWarning, setVisibilityWarning] = useState('');

  // Archive / restore
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Organizational access (department/team association for DEPARTMENT_TEAM visibility)
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [orgTeamId, setOrgTeamId] = useState<string>('');
  const [orgDepartmentId, setOrgDepartmentId] = useState<string>('');
  const [orgNotice, setOrgNotice] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgBusy, setOrgBusy] = useState(false);

  // Ownership transfer
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  // Source control / linked repositories (Feature A)
  const [devConnections, setDevConnections] = useState<DevConnectionSummary[]>([]);
  const [linkedRepos, setLinkedRepos] = useState<LinkedProjectRepository[]>([]);
  const [availableRepos, setAvailableRepos] = useState<DevRepositorySummary[]>([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoNotice, setRepoNotice] = useState<string | null>(null);
  const [repoBusy, setRepoBusy] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedProjectRepository | null>(null);

  // Repository access management (FE-8)
  const [accessRepoId, setAccessRepoId] = useState('');
  const [accessMembers, setAccessMembers] = useState<RepositoryAccessMember[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);
  const [accessBusyUserId, setAccessBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true); setError(null); setAccessStatus(null);
    try {
      const [data, deptList, teamList, wsMembers, linked, connections] = await Promise.all([
        getProject(activeWorkspace.id, projectId),
        activeWorkspace.type === 'INSTITUTION' ? listDepartments(activeWorkspace.id) : Promise.resolve([]),
        listTeams(activeWorkspace.id),
        listWorkspaceMembers(activeWorkspace.id),
        listProjectRepositories(activeWorkspace.id, projectId).catch(() => [] as LinkedProjectRepository[]),
        listDevConnections(activeWorkspace.id).catch(() => [] as DevConnectionSummary[]),
      ]);
      setProject(data);
      setName(data.name);
      setKey(data.key);
      setDescription(data.description ?? '');
      setStatus(data.status === 'ARCHIVED' ? 'ACTIVE' : data.status);
      setType(normaliseProjectType(data.type));
      setVisibility(data.visibility);
      setCommentPolicy(data.commentPolicy ?? 'ASSIGNEES_ONLY');
      setWorkflowMode(data.workflowMode);
      setStartDate(data.startDate ? new Date(data.startDate).toISOString().slice(0, 10) : '');
      setDueDate(data.dueDate ? new Date(data.dueDate).toISOString().slice(0, 10) : '');
      setOrgTeamId(data.teamId ?? '');
      setOrgDepartmentId(data.departmentId ?? '');
      setDepartments(deptList);
      setTeams(teamList);
      setWorkspaceMembers(wsMembers.filter((m) => m.membershipStatus === 'ACTIVE' && !m.owner));
      setLinkedRepos(linked);
      setDevConnections(connections);
    } catch (cause) {
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else if (cause instanceof ApiRequestError && cause.status === 404) {
        setError('This project is not available or you do not have access.');
      } else {
        setError(requestError(cause, 'Project settings could not be loaded.'));
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, projectId]);

  useEffect(() => { let active = true; void Promise.resolve().then(() => active ? load() : undefined); return () => { active = false; }; }, [load]);

  const activeGithubConnection = devConnections.find((c) => c.provider === 'GITHUB' && c.status === 'ACTIVE') ?? null;

  async function loadAvailableRepos() {
    if (!activeWorkspace || !activeGithubConnection) return;
    setRepoLoading(true); setRepoError(null);
    try {
      const repos = await listAvailableRepositories(activeWorkspace.id, activeGithubConnection.id);
      setAvailableRepos(repos);
    } catch (cause) {
      setRepoError(requestError(cause, 'Could not load available repositories.'));
      setAvailableRepos([]);
    } finally {
      setRepoLoading(false);
    }
  }

  async function handleLinkRepo() {
    if (!activeWorkspace || !activeGithubConnection || !selectedRepoId) return;
    const repo = availableRepos.find((r) => r.externalRepoId === selectedRepoId);
    if (!repo) return;
    setRepoBusy(true); setRepoError(null); setRepoNotice(null);
    try {
      const linked = await linkProjectRepository(activeWorkspace.id, projectId, {
        connectionId: activeGithubConnection.id,
        externalRepoId: repo.externalRepoId,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch ?? null,
      });
      setLinkedRepos((prev) => [linked, ...prev.filter((r) => r.id !== linked.id)]);
      setSelectedRepoId('');
      setRepoNotice(`Linked ${linked.fullName}.`);
    } catch (cause) {
      setRepoError(requestError(cause, 'Could not link repository.'));
    } finally {
      setRepoBusy(false);
    }
  }

  async function handleUnlinkRepo() {
    if (!activeWorkspace || !unlinkTarget) return;
    setRepoBusy(true); setRepoError(null); setRepoNotice(null);
    try {
      await unlinkProjectRepository(activeWorkspace.id, projectId, unlinkTarget.id);
      setLinkedRepos((prev) => prev.filter((r) => r.id !== unlinkTarget.id));
      setRepoNotice(`Unlinked ${unlinkTarget.fullName}.`);
      setUnlinkTarget(null);
    } catch (cause) {
      setRepoError(requestError(cause, 'Could not unlink repository.'));
    } finally {
      setRepoBusy(false);
    }
  }

  useEffect(() => {
    if (!accessRepoId && linkedRepos[0]) setAccessRepoId(linkedRepos[0].id);
    if (accessRepoId && !linkedRepos.some((r) => r.id === accessRepoId)) {
      setAccessRepoId(linkedRepos[0]?.id ?? '');
    }
  }, [accessRepoId, linkedRepos]);

  const repositoryAccessError = (cause: unknown, fallback: string): string => {
    if (cause instanceof ApiRequestError && cause.code === 'PROJECT_MEMBER_NOT_FOUND') {
      return 'That project member does not exist or no longer has project access.';
    }
    return requestError(cause, fallback);
  };

  const loadRepositoryAccess = useCallback(async (repoId: string) => {
    if (!activeWorkspace || !repoId) return;
    setAccessLoading(true);
    setAccessError(null);
    try {
      const members = await listRepositoryMembers(activeWorkspace.id, projectId, repoId);
      setAccessMembers(members);
    } catch (cause) {
      setAccessMembers([]);
      setAccessError(repositoryAccessError(cause, 'Could not load repository access.'));
    } finally {
      setAccessLoading(false);
    }
  }, [activeWorkspace, projectId]);

  useEffect(() => {
    if (!accessRepoId) {
      setAccessMembers([]);
      return;
    }
    void loadRepositoryAccess(accessRepoId);
  }, [accessRepoId, loadRepositoryAccess]);

  async function handleAccessLevelChange(userId: string, level: RepositoryAccessLevel) {
    if (!activeWorkspace || !accessRepoId) return;
    setAccessBusyUserId(userId);
    setAccessError(null);
    setAccessNotice(null);
    try {
      await setRepositoryMemberOverride(activeWorkspace.id, projectId, accessRepoId, userId, level);
      await loadRepositoryAccess(accessRepoId);
      setAccessNotice('Repository access updated.');
    } catch (cause) {
      setAccessError(repositoryAccessError(cause, 'Could not update repository access.'));
    } finally {
      setAccessBusyUserId(null);
    }
  }

  async function handleAccessReset(userId: string) {
    if (!activeWorkspace || !accessRepoId) return;
    setAccessBusyUserId(userId);
    setAccessError(null);
    setAccessNotice(null);
    try {
      await removeRepositoryMemberOverride(activeWorkspace.id, projectId, accessRepoId, userId);
      await loadRepositoryAccess(accessRepoId);
      setAccessNotice('Repository access reset to default.');
    } catch (cause) {
      setAccessError(repositoryAccessError(cause, 'Could not reset repository access.'));
    } finally {
      setAccessBusyUserId(null);
    }
  }

  function handleVisibilityChange(newVisibility: ProjectVisibility) {
    if (!project) return;
    const warning = VISIBILITY_CHANGE_WARNINGS[project.visibility]?.[newVisibility];
    if (warning) {
      setPendingVisibility(newVisibility);
      setVisibilityWarning(warning);
    } else {
      setVisibility(newVisibility);
    }
  }

  function confirmVisibilityChange() {
    if (pendingVisibility) setVisibility(pendingVisibility);
    setPendingVisibility(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !project) return;
    const parsed = editSchema.safeParse({ name, key, description: description.trim() || undefined, status, type, visibility });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFormErrors(errors);
      return;
    }
    setBusy(true); setError(null); setFormErrors({});
    try {
      const updated = await updateProject(activeWorkspace.id, project.id, {
        name: parsed.data.name,
        key: parsed.data.key,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        type: parsed.data.type,
        visibility: parsed.data.visibility,
        commentPolicy,
      });
      setProject(updated);
      setNotice('Project settings saved.');
    } catch (cause) {
      setError(requestError(cause, 'Settings could not be saved.'));
    } finally { setBusy(false); }
  }

  async function handleWorkflowModeChange(nextMode: 'SPRINTS' | 'BACKLOG_ONLY') {
    if (!activeWorkspace || !project) return;
    setError(null);
    setPendingWorkflowMode(nextMode);
    try {
      await updateProject(activeWorkspace.id, project.id, { workflowMode: nextMode });
      setWorkflowMode(nextMode);
      setProject((current) => current ? { ...current, workflowMode: nextMode } : current);
      setNotice('Workflow mode updated.');
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 409 && cause.code === 'ACTIVE_SPRINT_EXISTS') {
        const details = cause.details as { sprintId?: string; openTaskCount?: number } | undefined;
        setWorkflowOpenTaskCount(typeof details?.openTaskCount === 'number' ? details.openTaskCount : null);
        setError(null);
        setWorkflowConfirmOpen(true);
      } else {
        setPendingWorkflowMode(workflowMode);
        setError(workflowRequestError(cause, 'Workflow mode could not be changed.'));
      }
    }
  }

  function cancelWorkflowModeChange() {
    setError(null);
    setWorkflowOpenTaskCount(null);
    setWorkflowConfirmOpen(false);
    setPendingWorkflowMode(workflowMode);
  }

  async function confirmWorkflowModeChange() {
    if (!activeWorkspace || !project) return;
    setBusy(true);
    try {
      await updateProject(activeWorkspace.id, project.id, {
        workflowMode: pendingWorkflowMode,
        confirmActiveSprintCompletion: true,
      });
      setWorkflowMode(pendingWorkflowMode);
      setProject((current) => current ? { ...current, workflowMode: pendingWorkflowMode } : current);
      setNotice('Workflow mode updated.');
    } catch (cause) {
      setError(workflowRequestError(cause, 'Workflow mode could not be changed.'));
    } finally {
      setWorkflowConfirmOpen(false);
      setWorkflowOpenTaskCount(null);
      setPendingWorkflowMode(workflowMode);
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!activeWorkspace || !project) return;
    setBusy(true); setError(null);
    try {
      await archiveProject(activeWorkspace.id, project.id);
      setConfirmArchive(false);
      setNotice('Project archived.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Project could not be archived.')); }
    finally { setBusy(false); }
  }

  async function handleRestore() {
    if (!activeWorkspace || !project) return;
    setBusy(true); setError(null);
    try {
      await restoreProject(activeWorkspace.id, project.id);
      setConfirmRestore(false);
      setNotice('Project restored.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Project could not be restored.')); }
    finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!activeWorkspace || !project) return;
    setBusy(true); setError(null);
    try {
      await deleteProject(activeWorkspace.id, project.id);
      setConfirmDelete(false);
      router.push('/app/projects');
    } catch (cause) {
      setError(requestError(cause, 'Project could not be deleted.'));
      setBusy(false);
    }
  }

  async function handleOrgAccess() {
    if (!activeWorkspace || !project) return;
    setOrgBusy(true); setOrgError(null); setOrgNotice(null);
    try {
      const result = await updateProjectOrganizationAccess(activeWorkspace.id, project.id, {
        teamId: orgTeamId || null,
        departmentId: orgDepartmentId || null,
      });
      setProject((current) => current ? { ...current, teamId: result.teamId, departmentId: result.departmentId } : current);
      setOrgNotice('Organizational access updated.');
    } catch (cause) {
      setOrgError(requestError(cause, 'Organizational access could not be updated.'));
    } finally { setOrgBusy(false); }
  }

  async function handleTransfer() {
    if (!activeWorkspace || !project || !transferTargetId) return;
    setBusy(true); setError(null);
    try {
      await transferProjectOwnership(activeWorkspace.id, project.id, { newOwnerId: transferTargetId });
      setConfirmTransfer(false); setTransferTargetId('');
      setNotice('Project ownership transferred.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Ownership could not be transferred.')); }
    finally { setBusy(false); }
  }

  if (loading || permissionsLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading settings">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;
  if (!can('project.settings.manage')) {
    return (
      <PageAccessState
        description="Project settings are limited to project managers. Your project role can still view the overview, tasks, and members."
        backHref={`/app/projects/${encodeURIComponent(projectId)}`}
      />
    );
  }
  if (!project) return <Alert variant="error">{error ?? 'Project not found.'}</Alert>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Project settings</h2>
      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      {/* Visibility notice */}
      {project.visibility === 'PRIVATE' && (
        <Alert variant="info" title="Private project">
          This project is private. Only explicitly added members can see it. Changing visibility will affect who has access.
        </Alert>
      )}

      <Card className="p-5">
        <form className="space-y-5" onSubmit={(event) => void handleSave(event)}>
          <Input
            id="settings-name"
            label="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={100}
            errorMessage={formErrors.name}
          />
          <Input
            id="settings-key"
            label="Project key"
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            required
            minLength={2}
            maxLength={16}
            errorMessage={formErrors.key}
            helperText="Short uppercase identifier used in task references."
          />
          <Textarea
            id="settings-description"
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
            rows={3}
          />
          <div>
            <Select
              id="settings-status"
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus)}
              options={[
                { value: 'PLANNING', label: 'Planning' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ON_HOLD', label: 'On hold' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
              helperText="Archived status is set using the Archive button below, not through this field."
            />
          </div>
          {can('project.update') && (
            <div>
              <Select
                id="settings-type"
                label="Type"
                value={type}
                onChange={(event) => setType(event.target.value as ProjectType)}
                options={PROJECT_TYPES.map((value) => ({ value, label: PROJECT_TYPE_LABELS[value] }))}
                helperText="Classification only. It does not grant access or change permissions. Changing it never deletes or hides work."
              />
            </div>
          )}
          <div>
            <Select
              id="settings-visibility"
              label="Visibility"
              value={visibility}
              onChange={(event) => handleVisibilityChange(event.target.value as ProjectVisibility)}
              options={[
                { value: 'WORKSPACE', label: 'Organisation-wide' },
                { value: 'DEPARTMENT_TEAM', label: 'Department / team' },
                { value: 'PRIVATE', label: 'Private (invitation only)' },
              ]}
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]" aria-live="polite">
              Current: <Badge variant={visibility === 'WORKSPACE' ? 'success' : visibility === 'DEPARTMENT_TEAM' ? 'warning' : 'outline'} className="text-xs">
                {visibility === 'WORKSPACE' ? 'Organisation-wide' : visibility === 'DEPARTMENT_TEAM' ? 'Department / team' : 'Private'}
              </Badge>
            </p>
          </div>
          <div>
            <Select
              id="settings-comment-policy"
              label="Who can comment on tasks"
              value={commentPolicy}
              onChange={(event) => setCommentPolicy(event.target.value as ProjectCommentPolicy)}
              options={[
                { value: 'ASSIGNEES_ONLY', label: 'Assignees and project members only' },
                { value: 'TEAM_MEMBERS', label: 'Also members of the linked team or department' },
                { value: 'ALL_VIEWERS', label: 'Anyone who can view the project' },
              ]}
              helperText="Everyone who can see a task can read its discussion. This controls who can add comments."
            />
          </div>
          {can('project.update') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  Workflow mode
                </span>
                <span className="text-xs font-medium px-2 py-1 rounded bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">
                  {workflowMode === 'SPRINTS' ? 'Sprints enabled' : 'Sprints disabled (backlog only)'}
                </span>
              </div>
              <Select
                id="settings-workflow-mode"
                label="Project workflow mode"
                value={workflowMode}
                onChange={(event) => void handleWorkflowModeChange(event.target.value as 'SPRINTS' | 'BACKLOG_ONLY')}
                options={[
                  { value: 'SPRINTS', label: 'Sprints (plan and track work in sprints)' },
                  { value: 'BACKLOG_ONLY', label: 'Backlog only (no sprints)' },
                ]}
                helperText={
                  workflowMode === 'SPRINTS'
                    ? 'Switching to backlog only completes the active sprint and moves its unfinished tasks to the backlog.'
                    : 'Sprints are disabled. All tasks live in the backlog. Switching to sprints does not start any sprint.'
                }
                disabled={busy}
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Changing the workflow mode requires project manager permission. Switching from sprints to backlog only with an active sprint will complete that sprint and move unfinished tasks to the backlog.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-start-date" className="block text-sm font-medium mb-1">
                Start date
              </label>
              <input
                id="settings-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
              {formErrors.startDate && (
                <p className="mt-1 text-xs text-[var(--color-error)]">{formErrors.startDate}</p>
              )}
            </div>
            <div>
              <label htmlFor="settings-due-date" className="block text-sm font-medium mb-1">
                Due date
              </label>
              <input
                id="settings-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
              {formErrors.dueDate && (
                <p className="mt-1 text-xs text-[var(--color-error)]">{formErrors.dueDate}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <PermissionButton
              type="submit"
              permission="project.update"
              loading={busy}
              deniedReason="Your project role cannot edit project details."
            >
              Save settings
            </PermissionButton>
          </div>
        </form>
      </Card>

      {/* Organizational access (department/team association) */}
      {project.visibility === 'DEPARTMENT_TEAM' && (
        <Card className="p-5">
          <h3 className="font-semibold">Organizational access</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Associate this project with a team and{' '}
            {activeWorkspace?.type === 'INSTITUTION' ? 'department' : 'team'} so their members can access it.
            Department-bound teams must use the same department.
          </p>
          {orgError && <Alert className="mt-3" variant="error">{orgError}</Alert>}
          {orgNotice && <Alert className="mt-3" variant="success">{orgNotice}</Alert>}
          <div className="mt-4 space-y-4">
            <Select
              id="org-team"
              label="Team"
              value={orgTeamId}
              onChange={(event) => setOrgTeamId(event.target.value)}
              options={[
                { value: '', label: 'No team' },
                ...teams.map((team) => ({ value: team.id, label: team.name })),
              ]}
            />
            {activeWorkspace?.type === 'INSTITUTION' && (
              <Select
                id="org-department"
                label="Department"
                value={orgDepartmentId}
                onChange={(event) => setOrgDepartmentId(event.target.value)}
                options={[
                  { value: '', label: 'No department' },
                  ...departments.map((dept) => ({ value: dept.id, label: dept.name })),
                ]}
              />
            )}
            <Button onClick={() => void handleOrgAccess()} loading={orgBusy} disabled={orgBusy}>
              Save organizational access
            </Button>
            {project.teamId && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Current: {teams.find((t) => t.id === project.teamId)?.name ?? 'Unknown team'}
                {project.departmentId && departments.find((d) => d.id === project.departmentId)
                  ? ` · ${departments.find((d) => d.id === project.departmentId)?.name}`
                  : ''}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Source control / linked repositories (Feature A) */}
      <Card className="p-5">
        <h3 className="font-semibold">Source control</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Link a GitHub repository to this project. Nexus shows development status inside task workspaces; it does not host or edit code.
        </p>
        {repoError && <Alert className="mt-3" variant="error">{repoError}</Alert>}
        {repoNotice && <Alert className="mt-3" variant="success">{repoNotice}</Alert>}

        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium">Linked repositories</h4>
            {linkedRepos.length === 0 ? (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">No repositories linked to this project.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {linkedRepos.map((repo) => (
                  <li key={repo.id} className="flex items-center justify-between gap-3 rounded border border-[var(--color-border)] p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-text-primary)]">{repo.fullName}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {repo.provider}{repo.defaultBranch ? ` · default: ${repo.defaultBranch}` : ''}
                      </p>
                    </div>
                    {can('project.update') && (
                      <Button size="sm" variant="secondary" onClick={() => setUnlinkTarget(repo)} disabled={repoBusy}>
                        Unlink
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {can('project.update') ? (
            <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
              <h4 className="text-sm font-medium">Link a repository</h4>
              {!activeGithubConnection ? (
                <Alert variant="info">
                  No active GitHub workspace connection. A workspace manager must connect GitHub in <Link className="underline" href="/app/integrations">Integrations</Link> first.
                </Alert>
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[260px] flex-1">
                      <Select
                        id="repo-select"
                        label="Repository"
                        value={selectedRepoId}
                        onChange={(event) => setSelectedRepoId(event.target.value)}
                        options={[
                          { value: '', label: availableRepos.length ? 'Select a repository…' : 'Load repositories to select' },
                          ...availableRepos
                            .filter((r) => !linkedRepos.some((lr) => lr.externalRepoId === r.externalRepoId && lr.provider === 'GITHUB'))
                            .map((r) => ({ value: r.externalRepoId, label: r.fullName })),
                        ]}
                        disabled={repoLoading || repoBusy}
                      />
                    </div>
                    <Button variant="secondary" onClick={() => void loadAvailableRepos()} loading={repoLoading} disabled={repoBusy}>
                      {availableRepos.length ? 'Refresh repositories' : 'Load repositories'}
                    </Button>
                    <Button onClick={() => void handleLinkRepo()} disabled={!selectedRepoId || repoBusy} loading={repoBusy}>
                      Link repository
                    </Button>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">Connected as {activeGithubConnection.externalAccount.login ?? activeGithubConnection.externalAccount.name ?? 'GitHub account'}.</p>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Your project role cannot link or unlink repositories.</p>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={() => void handleUnlinkRepo()}
        title="Unlink repository?"
        description={`Unlink ${unlinkTarget?.fullName ?? 'this repository'} from ${project.name}? This does not affect the repository in GitHub.`}
        confirmLabel="Unlink"
        destructive
        loading={repoBusy}
      />

      {/* Repository access (FE-8) */}
      {can('project.update') && (
        <Card className="p-5">
          <h3 className="font-semibold">Repository access</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Control who can see repository metadata, browse code activity, or link development work for each linked repository.
          </p>
          {accessError && <Alert className="mt-3" variant="error">{accessError}</Alert>}
          {accessNotice && <Alert className="mt-3" variant="success">{accessNotice}</Alert>}

          {linkedRepos.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">Link a repository first to manage repository access.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <Select
                id="access-repo"
                label="Repository"
                value={accessRepoId}
                onChange={(e) => setAccessRepoId(e.target.value)}
                options={linkedRepos.map((repo) => ({ value: repo.id, label: repo.fullName }))}
              />

              {accessLoading ? (
                <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading repository access…</p>
              ) : accessError ? null : accessMembers.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No project members found for this repository.</p>
              ) : (
                <ul className="space-y-2" role="list">
                  {accessMembers.map((member) => {
                    const level = member.effectiveAccessLevel;
                    const busy = accessBusyUserId === member.userId;
                    return (
                      <li key={member.userId} className="flex flex-col gap-3 rounded border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--color-text-primary)]">{member.user.name ?? member.user.email ?? member.userId}</p>
                          <p className="truncate text-xs text-[var(--color-text-muted)]">{member.user.email || 'Project member'}</p>
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            Default: {repositoryAccessLabel(member.defaultLevel)} · {member.isOverride ? `Override: ${repositoryAccessLabel(member.overrideLevel)}` : 'Using default'}
                          </p>
                          {member.inheritedWorkspaceAccess && (
                            <p className="text-xs text-[var(--color-text-muted)]">Has inherited workspace access.</p>
                          )}
                        </div>
                        <div className="w-full sm:w-64">
                          <Select
                            id={`repo-access-${member.userId}`}
                            label="Access level"
                            value={level}
                            disabled={busy}
                            onChange={(e) => void handleAccessLevelChange(member.userId, e.target.value as RepositoryAccessLevel)}
                            options={[
                              { value: 'NONE', label: 'No access - cannot see repository' },
                              { value: 'METADATA', label: 'Metadata only - name only, no code' },
                              { value: 'READ', label: 'Read access - can browse code/PRs' },
                              { value: 'LINK', label: 'Link access - can link/unlink dev work' },
                            ]}
                          />
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-xs text-[var(--color-text-muted)]">{repositoryAccessLabel(level)}</p>
                            <Button size="sm" variant="secondary" onClick={() => void handleAccessReset(member.userId)} disabled={busy || !member.isOverride}>
                              Reset to default
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-xs text-[var(--color-text-muted)]">
                Metadata only shows repository name. Read allows browsing. Link allows linking/unlinking development work.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Ownership transfer */}
      {workspaceMembers.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold">Transfer ownership</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Transfer this project to another workspace member. The new owner becomes the project manager.
            The previous owner keeps their membership with the selected role.
          </p>
          <div className="mt-4 space-y-3">
            <Select
              id="transfer-target"
              label="New owner"
              value={transferTargetId}
              onChange={(event) => setTransferTargetId(event.target.value)}
              options={[
                { value: '', label: 'Select a member…' },
                ...workspaceMembers.map((m) => ({ value: m.userId, label: `${m.name} · ${m.email}` })),
              ]}
            />
            <Button
              variant="destructive"
              disabled={!transferTargetId || busy}
              onClick={() => setConfirmTransfer(true)}
            >
              Transfer ownership
            </Button>
          </div>
        </Card>
      )}

      {/* Archive / restore */}
      <Card className="p-5 border-[var(--color-warning)] border">
        <h3 className="font-semibold">Danger zone</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {project.status === 'ARCHIVED'
            ? 'This project is archived. Restore it to allow edits and activity again.'
            : 'Archiving hides the project from the default view. Existing data is preserved. The project can be restored.'}
        </p>
        <div className="mt-3">
          {can('project.archive') ? (
            project.status === 'ARCHIVED' ? (
              <Button variant="secondary" disabled={busy} onClick={() => setConfirmRestore(true)}>
                Restore project
              </Button>
            ) : (
              <Button variant="destructive" disabled={busy} onClick={() => setConfirmArchive(true)}>
                Archive project
              </Button>
            )
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Your project role cannot archive or restore this project.
            </p>
          )}
        </div>
      </Card>

      {can('project.delete') && (
        <Card className="p-5 border-[var(--color-error)] border">
          <h3 className="font-semibold">Delete project</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Permanently delete this project and its data. This cannot be undone.
          </p>
          <div className="mt-3">
            <Button variant="destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete project
            </Button>
          </div>
        </Card>
      )}

      {/* Visibility change confirmation */}
      <ConfirmDialog
        open={Boolean(pendingVisibility)}
        onClose={() => setPendingVisibility(null)}
        onConfirm={confirmVisibilityChange}
        title="Change project visibility?"
        description={visibilityWarning}
        confirmLabel="Change visibility"
        destructive={pendingVisibility === 'PRIVATE'}
      />

      {/* Archive confirmation */}
      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => void handleArchive()}
        title="Archive project?"
        description={`Archive ${project.name}? The project will be hidden from the default list. All data is preserved and the project can be restored.`}
        confirmLabel="Archive project"
        destructive
        loading={busy}
      />

      {/* Restore confirmation */}
      <ConfirmDialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={() => void handleRestore()}
        title="Restore project?"
        description={`Restore ${project.name} to its previous status?`}
        confirmLabel="Restore project"
        loading={busy}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        title="Delete project?"
        description={`Delete ${project.name} permanently? This cannot be undone.`}
        confirmLabel="Delete project"
        destructive
        loading={busy}
      />

      {/* Ownership transfer confirmation */}
      <ConfirmDialog
        open={confirmTransfer}
        onClose={() => setConfirmTransfer(false)}
        onConfirm={() => void handleTransfer()}
        title="Transfer project ownership?"
        description={`Transfer ${project.name} to ${workspaceMembers.find((m) => m.userId === transferTargetId)?.name ?? 'the selected member'}? This action is immediate and cannot be undone. The new owner becomes the project manager.`}
        confirmLabel="Transfer ownership"
        destructive
        loading={busy}
      />

      {/* Workflow mode change confirmation (409 active sprint exists) */}
      <ConfirmDialog
        open={workflowConfirmOpen}
        onClose={cancelWorkflowModeChange}
        onConfirm={() => void confirmWorkflowModeChange()}
        title="Confirm workflow mode change?"
        description={workflowConfirmDescription(workflowOpenTaskCount)}
        confirmLabel="Confirm"
        loading={busy}
      />
    </div>
  );
}
