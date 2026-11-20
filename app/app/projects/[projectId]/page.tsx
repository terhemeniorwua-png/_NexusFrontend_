'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { Can } from '@/components/shared/Can';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import {
  archiveProject,
  deleteProject,
  getProject,
  type ProjectSummary,
  type ProjectVisibility,
} from '@/services/projects';
import { getOverview } from '@/services/resources';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { CreateDocDialog } from '@/components/dashboard/CreateDocDialog';
import { CreateFolderDialog } from '@/components/dashboard/CreateFolderDialog';
import { BookmarkDialog } from '@/components/resources/BookmarkDialog';
import { UploadDialog } from '@/components/resources/ResourcesPage';
import { Modal } from '@/components/ui/Modal';

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

function requestError(cause: unknown, fallback: string): string {
  return cause instanceof ApiRequestError ? cause.message : fallback;
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const [docOpen, setDocOpen] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { can, isLoading: permissionsLoading } = usePermissions();
  const router = useRouter();
  useWorkspaceRedirect();
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Dashboard data per card
  const [dashboardData, setDashboardData] = useState<{
    recentItems: Array<{ id: string; type: string; title: string; url: string; updatedAt: string }>;
    docs: Array<{ id: string; title: string; updatedAt: string; url: string }>;
    bookmarks: Array<{ id: string; title: string; url: string }>;
    folders: Array<{ id: string; name: string; itemCount: number }>;
    files: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: string;
      uploadedById: string;
    }>;
    lists: Array<{
      id: string;
      name: string;
      taskCount: number;
      completedCount: number;
      url: string;
    }>;
    workload: Array<{
      userId: string;
      user: { id: string; name: string };
      statusCounts: Record<string, number>;
      total: number;
    }>;
  } | null>(null);
  const [cardLoading, setCardLoading] = useState<Record<string, boolean>>({});
  const [cardErrors, setCardErrors] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    setAccessStatus(null);
    setProject(null);
    try {
      const data = await getProject(activeWorkspace.id, projectId);
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
  }, [activeWorkspace, projectId]);

  const loadDashboard = useCallback(async () => {
    if (!activeWorkspace || !project) return;
    setCardLoading({});
    setCardErrors({});
    try {
      const data = await getOverview(activeWorkspace.id, project.id);
      setDashboardData({
        recentItems: data.recentItems.map((i) => ({
          id: i.id,
          type: i.type,
          title: i.title,
          url: i.url,
          updatedAt: i.updatedAt,
        })),
        docs: data.docs.map((d) => ({
          id: d.id,
          title: d.title,
          updatedAt: d.updatedAt,
          url: `/app/projects/${encodeURIComponent(projectId)}/tasks`, // link to tasks/work documents
        })),
        bookmarks: data.bookmarks.map((b) => ({
          id: b.id,
          title: b.title,
          url: b.url,
        })),
        folders: data.folders.map((f) => ({
          id: f.id,
          name: f.name,
          itemCount: f.itemCount,
        })),
        files: data.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          createdAt: f.createdAt,
          uploadedById: f.uploadedById,
        })),
        lists: data.lists.map((l) => ({
          id: l.id,
          name: l.name,
          taskCount: l.taskCount,
          completedCount: l.completedCount,
          url: `/app/projects/${encodeURIComponent(projectId)}/tasks`,
        })),
        workload: data.workload.map((w) => ({
          userId: w.userId,
          user: w.user,
          statusCounts: w.statusCounts,
          total: w.total,
        })),
      });
    } catch (cause) {
      const message = cause instanceof ApiRequestError ? cause.message : 'Dashboard could not be loaded.';
      setCardErrors({ overview: message });
    }
  }, [activeWorkspace, project, projectId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load() : undefined);
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    let active = true;
    if (project) {
      void Promise.resolve().then(() => active ? loadDashboard() : undefined);
    }
    return () => { active = false; };
  }, [project, loadDashboard]);

  async function handleArchive() {
    if (!activeWorkspace || !project) return;
    setBusy(true);
    setError(null);
    try {
      await archiveProject(activeWorkspace.id, project.id);
      setConfirmArchive(false);
      setNotice('Project archived.');
      await load();
    } catch (cause) {
      setError(requestError(cause, 'Project could not be archived.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!activeWorkspace || !project) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProject(activeWorkspace.id, project.id);
      setConfirmDelete(false);
      router.push('/app/projects');
    } catch (cause) {
      setError(requestError(cause, 'Project could not be deleted.'));
      setBusy(false);
    }
  }

  const projectHref = `/app/projects/${encodeURIComponent(projectId)}`;

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="Choose a workspace"
        description="Select a workspace to view this project."
        action={<Link href="/app/workspaces" className="text-[var(--color-primary)] underline">Manage workspaces</Link>}
      />
    );
  }

  if (loading || permissionsLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading project">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;
  if (!can('project.view')) {
    return (
      <PageAccessState
        title="Project not found or no access"
        description="This project may have been deleted, or it is private and you are not a member."
        backHref="/app/projects"
        backLabel="Back to projects"
      />
    );
  }
  if (error && !project) return <Alert variant="error" title="Project unavailable">{error}</Alert>;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
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
                <Badge variant="default">My role: {project.myRole.replaceAll('_', ' ').toLowerCase()}</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Can permission="project.update">
              <Link
                href={`${projectHref}/settings`}
                className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                Edit project
              </Link>
            </Can>
            {project.status !== 'ARCHIVED' && (
              <Can permission="project.archive">
                <Button variant="secondary" onClick={() => setConfirmArchive(true)} disabled={busy}>
                  Archive
                </Button>
              </Can>
            )}
            <Can permission="project.delete">
              <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={busy}>
                Delete
              </Button>
            </Can>
          </div>
        </div>
        {project.description && (
          <p className="mt-3 text-[var(--color-text-secondary)]">{project.description}</p>
        )}
      </div>

      {notice && <Alert variant="success">{notice}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Project summary cards */}
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

      {/* Dashboard grid */}
      <DashboardGrid
        workspaceId={activeWorkspace.id}
        projectId={project.id}
        recentItems={dashboardData?.recentItems ?? []}
        docs={dashboardData?.docs ?? []}
        bookmarks={dashboardData?.bookmarks ?? []}
        folders={dashboardData?.folders ?? []}
        files={dashboardData?.files ?? []}
        lists={dashboardData?.lists ?? []}
        workload={dashboardData?.workload ?? []}
        loading={{
          recent: cardLoading.recent ?? false,
          docs: cardLoading.docs ?? false,
          bookmarks: cardLoading.bookmarks ?? false,
          folders: cardLoading.folders ?? false,
          files: cardLoading.files ?? false,
          lists: cardLoading.lists ?? false,
          workload: cardLoading.workload ?? false,
        }}
        errors={{
          recent: cardErrors.recent ?? null,
          docs: cardErrors.docs ?? null,
          bookmarks: cardErrors.bookmarks ?? null,
          folders: cardErrors.folders ?? null,
          files: cardErrors.files ?? null,
          lists: cardErrors.lists ?? null,
          workload: cardErrors.workload ?? null,
        }}
        onRetry={() => {
          void loadDashboard();
        }}
        onAddDoc={() => setDocOpen(true)}
        onAddBookmark={() => setBookmarkOpen(true)}
        onAddFolder={() => setFolderOpen(true)}
        onUploadFiles={() => setUploadOpen(true)}
      />

      <CreateDocDialog
        open={docOpen}
        onClose={() => setDocOpen(false)}
        workspaceId={activeWorkspace.id}
        onCreated={() => { void loadDashboard(); }}
      />

      <BookmarkDialog
        open={bookmarkOpen}
        onClose={() => setBookmarkOpen(false)}
        workspaceId={activeWorkspace.id}
        onAdded={() => { void loadDashboard(); }}
      />

      <CreateFolderDialog
        open={folderOpen}
        onClose={() => setFolderOpen(false)}
        workspaceId={activeWorkspace.id}
        onCreated={() => { void loadDashboard(); }}
      />

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload files"
        maxWidth="lg"
      >
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          workspaceId={activeWorkspace.id}
          onUploaded={() => { void loadDashboard(); }}
        />
      </Modal>

      <Card className="p-4">
        <p className="text-xs text-[var(--color-text-muted)]">Created</p>
        <p className="mt-1 text-sm">{dateLabel(project.createdAt)}</p>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">Last updated</p>
        <p className="mt-1 text-sm">{dateLabel(project.updatedAt)}</p>
      </Card>

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => void handleArchive()}
        title="Archive project?"
        description={`Archive ${project.name}? The project will be hidden from the default list. All data is preserved and the project can be restored from settings.`}
        confirmLabel="Archive project"
        destructive
        loading={busy}
      />

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
    </div>
  );
}
