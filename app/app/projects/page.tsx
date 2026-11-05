'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  archiveProject,
  createProject,
  listProjects,
  restoreProject,
  type ProjectStatus,
  type ProjectSummary,
  type ProjectVisibility,
} from '@/services/projects';

// --- Validation schema (Zod) ---
const createSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  key: z.string().trim().min(2, 'Key must be at least 2 characters').max(16, 'Key must be at most 16 characters').regex(/^[A-Za-z0-9_-]+$/, 'Key may only contain letters, numbers, hyphens, and underscores'),
  description: z.string().trim().max(5000).optional(),
  visibility: z.enum(['WORKSPACE', 'DEPARTMENT_TEAM', 'PRIVATE']),
});

// --- Helpers ---
function visibilityLabel(v: ProjectVisibility): string {
  if (v === 'WORKSPACE') return 'Organisation-wide';
  if (v === 'DEPARTMENT_TEAM') return 'Department / team';
  return 'Private';
}

function visibilityVariant(v: ProjectVisibility): 'success' | 'warning' | 'outline' {
  if (v === 'WORKSPACE') return 'success';
  if (v === 'DEPARTMENT_TEAM') return 'warning';
  return 'outline';
}

function statusLabel(s: ProjectStatus): string {
  return s.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function statusVariant(s: ProjectStatus): 'success' | 'warning' | 'outline' | 'error' {
  if (s === 'ACTIVE') return 'success';
  if (s === 'ARCHIVED') return 'outline';
  if (s === 'COMPLETED') return 'warning';
  if (s === 'ON_HOLD') return 'warning';
  return 'outline';
}

function dateLabel(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action.';
  return cause.message;
}

// --- Visibility consequence descriptions ---
const VISIBILITY_CONSEQUENCES: Record<ProjectVisibility, string> = {
  WORKSPACE: 'All authorised members of this workspace can see this project.',
  DEPARTMENT_TEAM: 'Only members of the linked department or team can see this project.',
  PRIVATE: 'Only explicitly added project members can see this project.',
};

export default function ProjectsPage() {
  const { activeWorkspace, loading: workspaceLoading } = useWorkspaceContext();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState('');
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [visibilityFilter, setVisibilityFilter] = useState<ProjectVisibility | ''>('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createKey, setCreateKey] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createVisibility, setCreateVisibility] = useState<ProjectVisibility>('WORKSPACE');
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Archive/restore
  const [archiveTarget, setArchiveTarget] = useState<ProjectSummary | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ProjectSummary | null>(null);

  const latestLoad = useRef(0);
  const activeWorkspaceIdRef = useRef<string | undefined>(activeWorkspace?.id);
  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspace?.id; }, [activeWorkspace?.id]);

  const load = useCallback(async (append = false) => {
    if (!activeWorkspace) return;
    if (activeWorkspace.id !== activeWorkspaceIdRef.current) return;
    const loadId = ++latestLoad.current;
    if (!append) { setProjects([]); setNextCursor(null); setLoadedWorkspaceId(''); setAccessStatus(null); setError(null); }
    setLoading(true);
    try {
      const cursor = append ? nextCursor ?? undefined : undefined;
      const page = await listProjects(activeWorkspace.id, {
        cursor,
        limit: 25,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(visibilityFilter ? { visibility: visibilityFilter } : {}),
        includeArchived: includeArchived || undefined,
      });
      if (loadId !== latestLoad.current) return;
      setProjects((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
      setLoadedWorkspaceId(activeWorkspace.id);
    } catch (cause) {
      if (loadId !== latestLoad.current) return;
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else {
        setError(requestError(cause, 'Projects could not be loaded.'));
      }
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }, [activeWorkspace, search, statusFilter, visibilityFilter, includeArchived, nextCursor]);

  useEffect(() => {
    if (!activeWorkspace) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [activeWorkspace, load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) return;
    const parsed = createSchema.safeParse({
      name: createName, key: createKey,
      description: createDescription.trim() || undefined,
      visibility: createVisibility,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setCreateErrors(errors);
      return;
    }
    setBusy(true); setError(null); setCreateErrors({});
    try {
      await createProject(activeWorkspace.id, {
        name: parsed.data.name, key: parsed.data.key,
        description: parsed.data.description ?? null,
        visibility: parsed.data.visibility,
      });
      setShowCreate(false);
      setCreateName(''); setCreateKey(''); setCreateDescription(''); setCreateVisibility('WORKSPACE');
      setNotice('Project created.');
      await load();
    } catch (cause) {
      setError(requestError(cause, 'Project could not be created.'));
    } finally { setBusy(false); }
  }

  async function handleArchive() {
    if (!activeWorkspace || !archiveTarget) return;
    setBusy(true); setError(null);
    try {
      await archiveProject(activeWorkspace.id, archiveTarget.id);
      setArchiveTarget(null); setNotice(`${archiveTarget.name} archived.`);
      await load();
    } catch (cause) { setError(requestError(cause, 'Project could not be archived.')); }
    finally { setBusy(false); }
  }

  async function handleRestore() {
    if (!activeWorkspace || !restoreTarget) return;
    setBusy(true); setError(null);
    try {
      await restoreProject(activeWorkspace.id, restoreTarget.id);
      setRestoreTarget(null); setNotice(`${restoreTarget.name} restored.`);
      await load();
    } catch (cause) { setError(requestError(cause, 'Project could not be restored.')); }
    finally { setBusy(false); }
  }

  // Auto-generate key from name
  function handleNameChange(value: string) {
    setCreateName(value);
    if (!createKey || createKey === createName.toUpperCase().slice(0, 8).replace(/[^A-Za-z0-9]/g, '-')) {
      setCreateKey(value.toUpperCase().slice(0, 10).replace(/[^A-Za-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 16));
    }
  }

  if (workspaceLoading) {
    return <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8"><p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading workspace…</p></div>;
  }

  if (!activeWorkspace) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <EmptyState
          title="Choose a workspace"
          description="Select a workspace to view and manage its projects."
          action={<Link href="/app/workspaces" className="text-[var(--color-primary)] underline">Manage workspaces</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8 sm:px-8">
      <PageHeader
        title="Projects"
        description={`Projects in ${activeWorkspace.name}. Visibility determines who can see each project. The backend enforces access on every request.`}
        actions={
          <Button onClick={() => setShowCreate(true)}>New project</Button>
        }
      />

      {error && <Alert variant="error" title="Could not complete request">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {accessStatus && <AccessState status={accessStatus} onRetry={() => void load()} />}

      {/* Filters */}
      {!accessStatus && (
        <Card className="p-4">
          <form
            className="flex flex-wrap items-end gap-3"
            role="search"
            aria-label="Filter projects"
            onSubmit={(event) => { event.preventDefault(); void load(); }}
          >
            <div className="flex-1 min-w-40">
              <Input
                id="project-search"
                label="Search"
                placeholder="Project name or key…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="min-w-40">
              <Select
                id="status-filter"
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ProjectStatus | '')}
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'PLANNING', label: 'Planning' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'ON_HOLD', label: 'On hold' },
                  { value: 'COMPLETED', label: 'Completed' },
                  ...(includeArchived ? [{ value: 'ARCHIVED', label: 'Archived' }] : []),
                ]}
              />
            </div>
            <div className="min-w-44">
              <Select
                id="visibility-filter"
                label="Visibility"
                value={visibilityFilter}
                onChange={(event) => setVisibilityFilter(event.target.value as ProjectVisibility | '')}
                options={[
                  { value: '', label: 'All visibility' },
                  { value: 'WORKSPACE', label: 'Organisation-wide' },
                  { value: 'DEPARTMENT_TEAM', label: 'Department / team' },
                  { value: 'PRIVATE', label: 'Private' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                id="include-archived"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                className="h-4 w-4 rounded border border-[var(--color-border)]"
              />
              <label htmlFor="include-archived" className="text-sm text-[var(--color-text-secondary)] cursor-pointer select-none">
                Include archived
              </label>
            </div>
            <Button type="submit" variant="secondary" loading={loading && loadedWorkspaceId === activeWorkspace.id}>Search</Button>
          </form>
        </Card>
      )}

      {/* Project list */}
      {!accessStatus && (
        <>
          {loading && loadedWorkspaceId !== activeWorkspace.id ? (
            <div className="space-y-3" aria-label="Loading projects" role="status">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              title="No projects found"
              description={search || statusFilter || visibilityFilter ? 'No projects match the current filters.' : 'Create your first project to get started.'}
              action={
                !search && !statusFilter && !visibilityFilter
                  ? <Button onClick={() => setShowCreate(true)}>Create project</Button>
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3" role="list" aria-label="Projects">
              {projects.map((project) => (
                <div key={project.id} role="listitem">
                <Card
                  className="p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/app/projects/${encodeURIComponent(project.id)}`}
                          className="font-semibold hover:text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
                        >
                          {project.name}
                        </Link>
                        <span className="text-xs text-[var(--color-text-muted)] font-mono bg-[var(--color-surface-secondary)] px-1.5 py-0.5 rounded">
                          {project.key}
                        </span>
                        <Badge variant={visibilityVariant(project.visibility)}>
                          {visibilityLabel(project.visibility)}
                        </Badge>
                        <Badge variant={statusVariant(project.status)}>
                          {statusLabel(project.status)}
                        </Badge>
                      </div>
                      {project.description && (
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2">{project.description}</p>
                      )}
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {project.memberCount} member{project.memberCount !== 1 ? 's' : ''}
                        {project.dueDate ? ` · Due ${dateLabel(project.dueDate)}` : ''}
                        {project.myRole ? ` · My role: ${project.myRole.replace('_', ' ').toLowerCase()}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Link
                        href={`/app/projects/${encodeURIComponent(project.id)}`}
                        className="inline-flex h-8 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-surface-secondary)]"
                      >
                        Open
                      </Link>
                      {project.status !== 'ARCHIVED' && (project.myRole === 'PROJECT_MANAGER' || !project.myRole) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setArchiveTarget(project)}
                          aria-label={`Archive ${project.name}`}
                        >
                          Archive
                        </Button>
                      )}
                      {project.status === 'ARCHIVED' && (project.myRole === 'PROJECT_MANAGER' || !project.myRole) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setRestoreTarget(project)}
                          aria-label={`Restore ${project.name}`}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
                </div>
              ))}

              {nextCursor && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="secondary"
                    loading={loading}
                    onClick={() => void load(true)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create project modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New project">
        <form onSubmit={(event) => void handleCreate(event)} className="space-y-4">
          <Input
            id="create-project-name"
            label="Project name"
            value={createName}
            onChange={(event) => handleNameChange(event.target.value)}
            required
            minLength={2}
            maxLength={100}
            errorMessage={createErrors.name}
          />
          <Input
            id="create-project-key"
            label="Project key"
            value={createKey}
            onChange={(event) => setCreateKey(event.target.value.toUpperCase())}
            required
            minLength={2}
            maxLength={16}
            errorMessage={createErrors.key}
            helperText="Short identifier: letters, numbers, hyphens and underscores only."
          />
          <Textarea
            id="create-project-description"
            label="Description (optional)"
            value={createDescription}
            onChange={(event) => setCreateDescription(event.target.value)}
            maxLength={5000}
            rows={3}
          />
          <div>
            <Select
              id="create-project-visibility"
              label="Visibility"
              value={createVisibility}
              onChange={(event) => setCreateVisibility(event.target.value as ProjectVisibility)}
              options={[
                { value: 'WORKSPACE', label: 'Organisation-wide' },
                { value: 'DEPARTMENT_TEAM', label: 'Department / team' },
                { value: 'PRIVATE', label: 'Private (invitation only)' },
              ]}
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]" aria-live="polite">
              {VISIBILITY_CONSEQUENCES[createVisibility]}
            </p>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Create project</Button>
          </div>
        </form>
      </Modal>

      {/* Archive confirmation */}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void handleArchive()}
        title={`Archive ${archiveTarget?.name}?`}
        description="Archived projects are hidden from the default project list. Members can no longer update the project until it is restored. Existing data is preserved."
        confirmLabel="Archive project"
        destructive
        loading={busy}
      />

      {/* Restore confirmation */}
      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => void handleRestore()}
        title={`Restore ${restoreTarget?.name}?`}
        description="The project will become active again and appear in the project list."
        confirmLabel="Restore project"
        loading={busy}
      />
    </div>
  );
}
