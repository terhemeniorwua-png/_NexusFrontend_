'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import { getProject, type ProjectSummary, type ProjectVisibility } from '@/services/projects';

function visibilityLabel(v: ProjectVisibility): string {
  if (v === 'WORKSPACE') return 'Organisation-wide';
  if (v === 'DEPARTMENT_TEAM') return 'Department / team';
  return 'Private (invitation only)';
}

function visibilityVariant(v: ProjectVisibility): 'success' | 'warning' | 'outline' {
  if (v === 'WORKSPACE') return 'success';
  if (v === 'DEPARTMENT_TEAM') return 'warning';
  return 'outline';
}

function dateLabel(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

export default function ProjectOverviewPage({ params }: { params: { projectId: string } }) {
  const { activeWorkspace } = useWorkspaceContext();
  useWorkspaceRedirect();
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true); setError(null); setAccessStatus(null); setProject(null);
    try {
      const data = await getProject(activeWorkspace.id, params.projectId);
      setProject(data);
    } catch (cause) {
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else if (cause instanceof ApiRequestError && cause.status === 404) {
        setError('This project is not available. It may have been deleted or you may not have access to it.');
      } else {
        setError(cause instanceof ApiRequestError ? cause.message : 'Project could not be loaded.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, params.projectId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load() : undefined);
    return () => { active = false; };
  }, [load]);

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="Choose a workspace"
        description="Select a workspace to view this project."
        action={<Link href="/app/workspaces" className="text-[var(--color-primary)] underline">Manage workspaces</Link>}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading project">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;
  if (error) return <Alert variant="error" title="Project unavailable">{error}</Alert>;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <span className="text-sm text-[var(--color-text-muted)] font-mono bg-[var(--color-surface-secondary)] px-1.5 py-0.5 rounded">
            {project.key}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant={visibilityVariant(project.visibility)}>{visibilityLabel(project.visibility)}</Badge>
          <Badge variant={project.status === 'ACTIVE' ? 'success' : 'outline'}>
            {project.status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
          </Badge>
          {project.myRole && (
            <Badge variant="default">My role: {project.myRole.replace('_', ' ').toLowerCase()}</Badge>
          )}
        </div>
        {project.description && (
          <p className="mt-3 text-[var(--color-text-secondary)]">{project.description}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Owner</p>
          <p className="mt-1 font-medium">{project.owner?.name ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Members</p>
          <p className="mt-1 font-medium">{project.memberCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Start date</p>
          <p className="mt-1 font-medium">{dateLabel(project.startDate)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Due date</p>
          <p className="mt-1 font-medium">{dateLabel(project.dueDate)}</p>
        </Card>
      </div>

      {/* Organizational access display */}
      {project.visibility === 'DEPARTMENT_TEAM' && (project.teamId || project.departmentId) && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Organizational access</h2>
          <div className="flex flex-wrap gap-4">
            {project.teamId && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Team</p>
                <p className="mt-1 text-sm font-medium">{project.teamId}</p>
              </div>
            )}
            {project.departmentId && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Department</p>
                <p className="mt-1 text-sm font-medium">{project.departmentId}</p>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Members of the associated team or department can access this project.
            Manage associations in <Link href={`/app/projects/${encodeURIComponent(project.id)}/settings`} className="text-[var(--color-primary)] underline">settings</Link>.
          </p>
        </Card>
      )}

      {project.labels.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Labels</h2>
          <div className="flex flex-wrap gap-2">
            {project.labels.map((label) => (
              <Badge key={label} variant="outline">{label}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Entry points for not-yet-implemented features */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 opacity-60">
          <h3 className="font-semibold mb-1">Tasks</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Task management is not yet available. The backend task API is not currently registered.
          </p>
        </Card>
        <Card className="p-4 opacity-60">
          <h3 className="font-semibold mb-1">Discussions</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Project discussions are not yet available. No backend message/channel contract is registered for projects.
          </p>
        </Card>
        <Card className="p-4 opacity-60">
          <h3 className="font-semibold mb-1">Files</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Project file management is not yet available. The backend file/attachment API is not currently registered.
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-xs text-[var(--color-text-muted)]">Created</p>
        <p className="mt-1 text-sm">{dateLabel(project.createdAt)}</p>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">Last updated</p>
        <p className="mt-1 text-sm">{dateLabel(project.updatedAt)}</p>
      </Card>
    </div>
  );
}
