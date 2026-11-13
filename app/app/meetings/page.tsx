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
import { StartCallButton } from '@/components/meetings/StartCallButton';
import {
  listMeetings,
  createMeeting,
  deleteMeeting,
  type MeetingSummary,
  type MeetingStatus,
} from '@/services/meetings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: MeetingStatus): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'LIVE': return 'success';
    case 'SCHEDULED': return 'default';
    case 'ENDED': return 'warning';
    case 'CANCELLED': return 'error';
  }
}

function formatScheduled(iso: string | null): string {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso);
  return d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Create meeting form ──────────────────────────────────────────────────────

interface CreateFormState {
  title: string;
  description: string;
  scheduledAt: string; // datetime-local
  instant: boolean;
}

interface CreateFormProps {
  saving: boolean;
  error: string | null;
  onSubmit: (state: CreateFormState) => void;
  onCancel: () => void;
}

function CreateMeetingForm({ saving, error, onSubmit, onCancel }: CreateFormProps) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30, 0, 0);
  const defaultAt = now.toISOString().slice(0, 16);

  const [form, setForm] = useState<CreateFormState>({
    title: '',
    description: '',
    scheduledAt: defaultAt,
    instant: false,
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
        id="m-title"
        label="Title"
        required
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        maxLength={300}
        autoFocus
      />

      <Textarea
        id="m-description"
        label="Description (optional)"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={3}
        maxLength={5000}
      />

      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={form.instant}
            onChange={(e) => set('instant', e.target.checked)}
            className="rounded border-[var(--color-border)]"
          />
          Start meeting instantly (now)
        </label>
      </div>

      {!form.instant && (
        <div>
          <label
            htmlFor="m-scheduled-at"
            className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Scheduled for
          </label>
          <input
            id="m-scheduled-at"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => set('scheduledAt', e.target.value)}
            required={!form.instant}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={saving} disabled={saving}>
          {form.instant ? 'Start meeting' : 'Schedule meeting'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Meeting card ─────────────────────────────────────────────────────────────

interface MeetingCardProps {
  meeting: MeetingSummary;
  currentUserId: string;
  onDelete: (meeting: MeetingSummary) => void;
}

function MeetingCard({ meeting, currentUserId, onDelete }: MeetingCardProps) {
  const isCreator = meeting.createdById === currentUserId;

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/meetings/${meeting.id}`}
            className="truncate font-medium text-[var(--color-text-primary)] hover:underline"
          >
            {meeting.title}
          </Link>
          <Badge variant={statusVariant(meeting.status)}>{meeting.status}</Badge>
        </div>

        {meeting.description && (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
            {meeting.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)]">
          <span>
            📅 {formatScheduled(meeting.scheduledAt)}
          </span>
          <span>👥 {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''}</span>
          {meeting.projectId && <span>📁 Project linked</span>}
          {meeting.status === 'LIVE' && (
            <Link
              href={`/app/meetings/${meeting.id}`}
              className="font-medium text-[var(--color-success)] hover:underline"
            >
              🔴 Live now — Join
            </Link>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Link href={`/app/meetings/${meeting.id}`}>
          <Button size="sm" variant="secondary">View</Button>
        </Link>
        {isCreator && meeting.status !== 'LIVE' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onDelete(meeting)}
          >
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const { activeWorkspace, user } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const currentUserId = user?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'ALL'>('ALL');

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MeetingSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const latestLoad = useRef(0);
  const loadedWorkspaceId = useRef('');

  const load = useCallback(
    async (wsId: string, status: MeetingStatus | 'ALL', cursor?: string, append = false) => {
      if (!wsId) return;
      const seq = ++latestLoad.current;
      if (append) setLoadingMore(true);
      else { setLoading(true); setError(null); setAccessError(null); }
      try {
        const result = await listMeetings(wsId, {
          limit: 25,
          ...(status !== 'ALL' ? { status } : {}),
          ...(cursor ? { cursor } : {}),
        });
        if (seq !== latestLoad.current) return;
        if (append) setMeetings((prev) => [...prev, ...result.items]);
        else setMeetings(result.items);
        setNextCursor(result.nextCursor);
        loadedWorkspaceId.current = wsId;
      } catch (err) {
        if (seq !== latestLoad.current) return;
        if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
          setAccessError(err.status);
        } else {
          setError(err instanceof ApiRequestError ? err.message : 'Could not load meetings.');
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

  async function handleCreate(form: CreateFormState) {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const scheduledAt = form.instant ? null : new Date(form.scheduledAt).toISOString();
      const status = form.instant ? 'LIVE' as MeetingStatus : undefined;
      const created = await createMeeting(workspaceId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduledAt,
      });
      // If instant, immediately update status to LIVE in the list
      if (status) {
        setMeetings((prev) => [{ ...created, status }, ...prev]);
      } else {
        setMeetings((prev) => [created, ...prev]);
      }
      setCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof ApiRequestError ? err.message : 'Could not create meeting.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMeeting(workspaceId, deleteTarget.id);
      setMeetings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Could not delete meeting.');
      setDeleting(false);
    }
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Meetings" />
        <EmptyState title="No workspace selected" description="Select a workspace to view meetings." />
      </PageContainer>
    );
  }

  if (accessError) {
    return (
      <PageContainer>
        <PageHeader title="Meetings" />
        <AccessState status={accessError as 401 | 403} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Meetings"
        description="Schedule, manage, and join workspace meetings."
        actions={
          <div className="flex items-center gap-2">
            <StartCallButton workspaceId={workspaceId} variant="button" />
            <Button onClick={() => { setCreateOpen(true); setCreateError(null); }}>
              New meeting
            </Button>
          </div>
        }
      />

      {/* Filter toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          id="meeting-status-filter"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MeetingStatus | 'ALL')}
          options={[
            { value: 'ALL', label: 'All statuses' },
            { value: 'SCHEDULED', label: 'Scheduled' },
            { value: 'LIVE', label: 'Live' },
            { value: 'ENDED', label: 'Ended' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
        />
      </div>

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
        <div className="space-y-3" aria-busy="true" aria-label="Loading meetings">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          title="No meetings found"
          description={
            statusFilter !== 'ALL'
              ? `No ${statusFilter.toLowerCase()} meetings in this workspace.`
              : 'No meetings yet. Create one to get started.'
          }
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              currentUserId={currentUserId}
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
        title="New meeting"
        maxWidth="md"
      >
        <CreateMeetingForm
          saving={creating}
          error={createError}
          onSubmit={(s) => { void handleCreate(s); }}
          onCancel={() => { setCreateOpen(false); setCreateError(null); }}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete meeting"
        description={`Delete "${deleteTarget?.title ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { void handleDelete(); }}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        loading={deleting}
      />
      {deleteError && (
        <Alert variant="error" className="mt-3">
          {deleteError}
        </Alert>
      )}
    </PageContainer>
  );
}
