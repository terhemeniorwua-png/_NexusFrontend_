'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import {
  listForms,
  createForm,
  updateForm,
  deleteForm,
  type FormSummary,
  type FormStatus,
} from '@/services/forms';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(
  status: FormStatus,
): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'PUBLISHED': return 'success';
    case 'DRAFT': return 'default';
    case 'CLOSED': return 'warning';
    case 'ARCHIVED': return 'error';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Create form modal ────────────────────────────────────────────────────────

interface CreateFormState {
  title: string;
  description: string;
  isPublic: boolean;
}

interface CreateFormModalProps {
  saving: boolean;
  error: string | null;
  onSubmit: (s: CreateFormState) => void;
  onCancel: () => void;
}

function CreateFormModal({ saving, error, onSubmit, onCancel }: CreateFormModalProps) {
  const [form, setForm] = useState<CreateFormState>({
    title: '',
    description: '',
    isPublic: false,
  });

  function set<K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <Input
        id="cf-title"
        label="Form title"
        required
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        maxLength={300}
        autoFocus
      />

      <Textarea
        id="cf-description"
        label="Description (optional)"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={3}
        maxLength={5000}
      />

      <div className="flex items-center gap-2">
        <input
          id="cf-public"
          type="checkbox"
          checked={form.isPublic}
          onChange={(e) => set('isPublic', e.target.checked)}
          className="rounded border-[var(--color-border)]"
        />
        <label htmlFor="cf-public" className="text-sm text-[var(--color-text-secondary)]">
          Make this form publicly accessible
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={saving} disabled={saving}>Create form</Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Form card ────────────────────────────────────────────────────────────────

interface FormCardProps {
  form: FormSummary;
  currentUserId: string;
  onPublish: (form: FormSummary) => void;
  onArchive: (form: FormSummary) => void;
  onDelete: (form: FormSummary) => void;
}

function FormCard({
  form,
  currentUserId,
  onPublish,
  onArchive,
  onDelete,
}: FormCardProps) {
  const isCreator = form.createdById === currentUserId;
  const canPublish = isCreator && form.status === 'DRAFT';
  const canArchive = isCreator && (form.status === 'PUBLISHED' || form.status === 'CLOSED');
  const canDelete = isCreator && form.status !== 'PUBLISHED';

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/forms/${form.id}`}
              className="truncate font-medium text-[var(--color-text-primary)] hover:underline"
            >
              {form.title}
            </Link>
            <Badge variant={statusVariant(form.status)}>{form.status}</Badge>
            {form.isPublic && <Badge variant="outline">Public</Badge>}
          </div>

          {form.description && (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
              {form.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)]">
            <span>📝 {form._count.responses} response{form._count.responses !== 1 ? 's' : ''}</span>
            <span>Updated {formatDate(form.updatedAt)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1">
          <Link href={`/app/forms/${form.id}`}>
            <Button size="sm" variant="secondary">Open</Button>
          </Link>
          {canPublish && (
            <Button size="sm" variant="secondary" onClick={() => onPublish(form)}>
              Publish
            </Button>
          )}
          {canArchive && (
            <Button size="sm" variant="secondary" onClick={() => onArchive(form)}>
              Archive
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="secondary" onClick={() => onDelete(form)}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const { activeWorkspace, user } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const currentUserId = user?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [statusFilter, setStatusFilter] = useState<FormStatus | 'ALL'>('ALL');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [publishTarget, setPublishTarget] = useState<FormSummary | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<FormSummary | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FormSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const latestLoad = useRef(0);

  const load = useCallback(
    async (wsId: string, status: FormStatus | 'ALL', cursor?: string, append = false) => {
      if (!wsId) return;
      const seq = ++latestLoad.current;
      if (append) setLoadingMore(true);
      else { setLoading(true); setError(null); setAccessError(null); }
      try {
        const result = await listForms(wsId, {
          limit: 25,
          ...(status !== 'ALL' ? { status } : {}),
          ...(cursor ? { cursor } : {}),
        });
        if (seq !== latestLoad.current) return;
        if (append) setForms((prev) => [...prev, ...result.items]);
        else setForms(result.items);
        setNextCursor(result.nextCursor);
      } catch (err) {
        if (seq !== latestLoad.current) return;
        if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
          setAccessError(err.status);
        } else {
          setError(err instanceof ApiRequestError ? err.message : 'Could not load forms.');
        }
      } finally {
        if (seq === latestLoad.current) { setLoading(false); setLoadingMore(false); }
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load(workspaceId, statusFilter) : undefined);
    return () => { active = false; };
  }, [workspaceId, statusFilter, load]);

  async function handleCreate(state: CreateFormState) {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createForm(workspaceId, {
        title: state.title.trim(),
        description: state.description.trim() || null,
        isPublic: state.isPublic,
      });
      // Add to list if status filter matches
      const newSummary: FormSummary = {
        id: created.id, workspaceId: created.workspaceId, createdById: created.createdById,
        title: created.title, description: created.description, status: created.status,
        isPublic: created.isPublic, createdAt: created.createdAt, updatedAt: created.updatedAt,
        _count: { responses: 0 },
      };
      if (statusFilter === 'ALL' || statusFilter === 'DRAFT') {
        setForms((prev) => [newSummary, ...prev]);
      }
      setCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof ApiRequestError ? err.message : 'Could not create form.');
    } finally {
      setCreating(false);
    }
  }

  async function handlePublish() {
    if (!publishTarget || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const updated = await updateForm(workspaceId, publishTarget.id, { status: 'PUBLISHED' });
      const updated_summary: FormSummary = {
        id: updated.id, workspaceId: updated.workspaceId, createdById: updated.createdById,
        title: updated.title, description: updated.description, status: updated.status,
        isPublic: updated.isPublic, createdAt: updated.createdAt, updatedAt: updated.updatedAt,
        _count: updated._count,
      };
      setForms((prev) => prev.map((f) => f.id === publishTarget.id ? updated_summary : f));
      setPublishTarget(null);
    } catch (err) {
      setPublishError(err instanceof ApiRequestError ? err.message : 'Could not publish form.');
      setPublishing(false);
    } finally {
      setPublishing(false);
    }
  }

  async function handleArchive() {
    if (!archiveTarget || archiving) return;
    setArchiving(true);
    try {
      const updated = await updateForm(workspaceId, archiveTarget.id, { status: 'ARCHIVED' });
      const updated_summary: FormSummary = {
        id: updated.id, workspaceId: updated.workspaceId, createdById: updated.createdById,
        title: updated.title, description: updated.description, status: updated.status,
        isPublic: updated.isPublic, createdAt: updated.createdAt, updatedAt: updated.updatedAt,
        _count: updated._count,
      };
      setForms((prev) => prev.map((f) => f.id === archiveTarget.id ? updated_summary : f));
      setArchiveTarget(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not archive form.');
    } finally {
      setArchiving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteForm(workspaceId, deleteTarget.id);
      setForms((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Could not delete form.');
      setDeleting(false);
    }
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Forms" />
        <EmptyState title="No workspace selected" description="Select a workspace to view forms." />
      </PageContainer>
    );
  }

  if (accessError) {
    return (
      <PageContainer>
        <PageHeader title="Forms" />
        <AccessState status={accessError as 401 | 403} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Forms"
        description="Create and manage forms and surveys."
        actions={
          <Button onClick={() => { setCreateOpen(true); setCreateError(null); }}>
            New form
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          id="form-status-filter"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FormStatus | 'ALL')}
          options={[
            { value: 'ALL', label: 'All statuses' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'CLOSED', label: 'Closed' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
        />
      </div>

      {publishError && <Alert variant="error" className="mb-3">{publishError}</Alert>}
      {deleteError && <Alert variant="error" className="mb-3">{deleteError}</Alert>}

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => void load(workspaceId, statusFilter)}
          >
            Retry
          </Button>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading forms">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : forms.length === 0 ? (
        <EmptyState
          title="No forms found"
          description={
            statusFilter !== 'ALL'
              ? `No ${statusFilter.toLowerCase()} forms in this workspace.`
              : 'No forms yet. Create one to get started.'
          }
        />
      ) : (
        <div className="space-y-3">
          {forms.map((f) => (
            <FormCard
              key={f.id}
              form={f}
              currentUserId={currentUserId}
              onPublish={setPublishTarget}
              onArchive={setArchiveTarget}
              onDelete={setDeleteTarget}
            />
          ))}

          {nextCursor && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void load(workspaceId, statusFilter, nextCursor, true)}
              loading={loadingMore}
              disabled={loadingMore}
            >
              Load more
            </Button>
          )}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(null); }}
        title="New form"
        maxWidth="md"
      >
        <CreateFormModal
          saving={creating}
          error={createError}
          onSubmit={(s) => { void handleCreate(s); }}
          onCancel={() => { setCreateOpen(false); setCreateError(null); }}
        />
      </Modal>

      {/* Publish confirm */}
      <ConfirmDialog
        open={!!publishTarget}
        title="Publish form"
        description={`Publish "${publishTarget?.title ?? ''}"? It will start accepting responses.`}
        confirmLabel="Publish"
        onConfirm={() => { void handlePublish(); }}
        onClose={() => { setPublishTarget(null); setPublishError(null); }}
        loading={publishing}
      />

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive form"
        description={`Archive "${archiveTarget?.title ?? ''}"? It will stop accepting responses.`}
        confirmLabel="Archive"
        onConfirm={() => { void handleArchive(); }}
        onClose={() => setArchiveTarget(null)}
        loading={archiving}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete form"
        description={`Delete "${deleteTarget?.title ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { void handleDelete(); }}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        loading={deleting}
      />
    </PageContainer>
  );
}
