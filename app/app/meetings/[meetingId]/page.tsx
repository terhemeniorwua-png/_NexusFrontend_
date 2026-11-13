'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
import { MeetingRoom } from '@/components/meetings/MeetingRoom';
import {
  getMeeting,
  updateMeeting,
  deleteMeeting,
  listParticipants,
  addParticipant,
  removeParticipant,
  type MeetingSummary,
  type MeetingStatus,
  type MeetingParticipant,
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

function participantStatusVariant(
  status: string,
): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'JOINED') return 'success';
  if (status === 'LEFT') return 'warning';
  if (status === 'DECLINED') return 'error';
  return 'default';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Edit form ────────────────────────────────────────────────────────────────

interface EditFormState {
  title: string;
  description: string;
  scheduledAt: string;
  status: MeetingStatus;
}

interface EditFormProps {
  initial: EditFormState;
  saving: boolean;
  error: string | null;
  onSubmit: (state: EditFormState) => void;
  onCancel: () => void;
}

function EditMeetingForm({ initial, saving, error, onSubmit, onCancel }: EditFormProps) {
  const [form, setForm] = useState<EditFormState>(initial);

  function set<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
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
        id="edit-m-title"
        label="Title"
        required
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        maxLength={300}
        autoFocus
      />

      <Textarea
        id="edit-m-description"
        label="Description (optional)"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={3}
        maxLength={5000}
      />

      <div>
        <label
          htmlFor="edit-m-scheduled-at"
          className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
        >
          Scheduled for
        </label>
        <input
          id="edit-m-scheduled-at"
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => set('scheduledAt', e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      <Select
        id="edit-m-status"
        label="Status"
        value={form.status}
        onChange={(e) => set('status', e.target.value as MeetingStatus)}
        options={[
          { value: 'SCHEDULED', label: 'Scheduled' },
          { value: 'LIVE', label: 'Live' },
          { value: 'ENDED', label: 'Ended' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ]}
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={saving} disabled={saving}>Save changes</Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meetingId as string;

  const { activeWorkspace, user } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const currentUserId = user?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<MeetingSummary | null>(null);

  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const participantsLoaded = useRef(false);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [addUserId, setAddUserId] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [addParticipantError, setAddParticipantError] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removingParticipant, setRemovingParticipant] = useState(false);

  // Redirect when workspace changes
  const prevWorkspaceId = useRef(workspaceId);
  useEffect(() => {
    if (prevWorkspaceId.current && workspaceId && prevWorkspaceId.current !== workspaceId) {
      router.push('/app/meetings');
    }
    prevWorkspaceId.current = workspaceId;
  }, [workspaceId, router]);

  const loadMeeting = useCallback(async (wsId: string, mId: string) => {
    if (!wsId || !mId) return;
    setLoading(true);
    setError(null);
    setAccessError(null);
    try {
      const m = await getMeeting(wsId, mId);
      setMeeting(m);
    } catch (err) {
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        setAccessError(err.status);
      } else if (err instanceof ApiRequestError && err.status === 404) {
        setError('Meeting not found.');
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Could not load meeting.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadParticipants = useCallback(async (wsId: string, mId: string) => {
    if (!wsId || !mId) return;
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      setParticipants(await listParticipants(wsId, mId));
    } catch (err) {
      setParticipantsError(
        err instanceof ApiRequestError ? err.message : 'Could not load participants.',
      );
    } finally {
      setParticipantsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      participantsLoaded.current = false;
      void loadMeeting(workspaceId, meetingId);
    });
    return () => { active = false; };
  }, [workspaceId, meetingId, loadMeeting]);

  // Load participants once after the meeting loads
  useEffect(() => {
    if (meeting && !participantsLoaded.current) {
      participantsLoaded.current = true;
      void loadParticipants(workspaceId, meetingId);
    }
  }, [meeting, workspaceId, meetingId, loadParticipants]);

  async function handleSave(form: EditFormState) {
    if (!meeting) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateMeeting(workspaceId, meetingId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        status: form.status,
      });
      setMeeting(updated);
      setEditOpen(false);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!meeting || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMeeting(workspaceId, meetingId);
      router.push('/app/meetings');
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Could not delete meeting.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    const uid = addUserId.trim();
    if (!uid || addingParticipant) return;
    setAddingParticipant(true);
    setAddParticipantError(null);
    try {
      await addParticipant(workspaceId, meetingId, uid);
      setAddUserId('');
      // Refresh participants and participant count
      participantsLoaded.current = false;
      await loadParticipants(workspaceId, meetingId);
      if (meeting) setMeeting({ ...meeting, participantCount: meeting.participantCount + 1 });
    } catch (err) {
      setAddParticipantError(
        err instanceof ApiRequestError ? err.message : 'Could not add participant.',
      );
    } finally {
      setAddingParticipant(false);
    }
  }

  async function handleRemoveParticipant() {
    if (!removeTarget || removingParticipant) return;
    setRemovingParticipant(true);
    try {
      await removeParticipant(workspaceId, meetingId, removeTarget);
      setParticipants((prev) => prev.filter((p) => p.userId !== removeTarget));
      if (meeting) setMeeting({ ...meeting, participantCount: Math.max(0, meeting.participantCount - 1) });
      setRemoveTarget(null);
    } catch (err) {
      setAddParticipantError(
        err instanceof ApiRequestError ? err.message : 'Could not remove participant.',
      );
    } finally {
      setRemovingParticipant(false);
    }
  }

  const isCreator = meeting?.createdById === currentUserId;

  // ── Render ──

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Meeting" />
        <Alert variant="error">No workspace selected.</Alert>
      </PageContainer>
    );
  }

  if (accessError) {
    return (
      <PageContainer>
        <PageHeader title="Meeting" />
        <AccessState status={accessError as 401 | 403} />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Meeting" />
        <div className="space-y-4" aria-busy="true" aria-label="Loading meeting">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !meeting) {
    return (
      <PageContainer>
        <PageHeader title="Meeting" />
        <Alert variant="error">
          {error ?? 'Meeting not found.'}
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => void loadMeeting(workspaceId, meetingId)}
          >
            Retry
          </Button>
        </Alert>
      </PageContainer>
    );
  }

  const editInitial: EditFormState = {
    title: meeting.title,
    description: meeting.description ?? '',
    scheduledAt: meeting.scheduledAt ? meeting.scheduledAt.slice(0, 16) : '',
    status: meeting.status,
  };

  return (
    <PageContainer>
      <PageHeader
        title={meeting.title}
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
            <Link href="/app/meetings" className="hover:underline">Meetings</Link>
            <span>/</span>
            <span className="text-[var(--color-text-secondary)]">{meeting.title}</span>
          </nav>
        }
        actions={
          <div className="flex gap-2">
            {isCreator && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        }
      />

      {deleteError && <Alert variant="error" className="mb-3">{deleteError}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main details */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(meeting.status)}>{meeting.status}</Badge>
              {meeting.projectId && <Badge variant="outline">Project linked</Badge>}
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">Scheduled</dt>
                <dd className="mt-0.5 text-[var(--color-text-primary)]">
                  {formatDate(meeting.scheduledAt)}
                </dd>
              </div>
              {meeting.startedAt && (
                <div>
                  <dt className="font-medium text-[var(--color-text-secondary)]">Started</dt>
                  <dd className="mt-0.5 text-[var(--color-text-primary)]">
                    {formatDate(meeting.startedAt)}
                  </dd>
                </div>
              )}
              {meeting.endedAt && (
                <div>
                  <dt className="font-medium text-[var(--color-text-secondary)]">Ended</dt>
                  <dd className="mt-0.5 text-[var(--color-text-primary)]">
                    {formatDate(meeting.endedAt)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">Participants</dt>
                <dd className="mt-0.5 text-[var(--color-text-primary)]">
                  {meeting.participantCount}
                </dd>
              </div>
            </dl>

            {meeting.description && (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
                  {meeting.description}
                </p>
              </div>
            )}
          </Card>

          <section id="meeting-room" aria-label="Meeting room">
            {meeting.status === 'ENDED' || meeting.status === 'CANCELLED' ? (
              <Card className="p-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  This meeting is {meeting.status.toLowerCase()} and can no longer be joined.
                </p>
              </Card>
            ) : (
              <MeetingRoom
                workspaceId={workspaceId}
                meetingId={meetingId}
                title={meeting.title}
                onParticipationChange={() => {
                  participantsLoaded.current = false;
                  void loadParticipants(workspaceId, meetingId);
                }}
              />
            )}
          </section>
        </div>

        {/* Participants panel */}
        <div>
          <Card className="p-5">
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
              Participants
            </h2>

            {participantsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : participantsError ? (
              <Alert variant="error">{participantsError}</Alert>
            ) : participants.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">No participants yet.</p>
            ) : (
              <ul className="space-y-2" aria-label="Meeting participants">
                {participants.map((p) => (
                  <li
                    key={p.userId}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm hover:bg-[var(--color-surface-secondary)]"
                  >
                    <div className="min-w-0">
                      <span className="block truncate font-mono text-xs text-[var(--color-text-muted)]">
                        {p.userId.slice(0, 12)}…
                      </span>
                      <Badge variant={participantStatusVariant(p.status)}>
                        {p.status}
                      </Badge>
                    </div>
                    {isCreator && p.userId !== currentUserId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setRemoveTarget(p.userId)}
                        aria-label={`Remove participant ${p.userId}`}
                      >
                        ✕
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add participant (creator only) */}
            {isCreator && meeting.status !== 'ENDED' && meeting.status !== 'CANCELLED' && (
              <form
                onSubmit={(e) => { void handleAddParticipant(e); }}
                className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4"
              >
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Add participant by user ID
                </p>
                {addParticipantError && (
                  <Alert variant="error">{addParticipantError}</Alert>
                )}
                <div className="flex gap-2">
                  <Input
                    id="add-participant-id"
                    label="User ID"
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    placeholder="User ID (UUID)"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    loading={addingParticipant}
                    disabled={addingParticipant || !addUserId.trim()}
                  >
                    Add
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setSaveError(null); }}
        title="Edit meeting"
        maxWidth="md"
      >
        <EditMeetingForm
          initial={editInitial}
          saving={saving}
          error={saveError}
          onSubmit={(s) => { void handleSave(s); }}
          onCancel={() => { setEditOpen(false); setSaveError(null); }}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete meeting"
        description={`Delete "${meeting.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { void handleDelete(); }}
        onClose={() => setConfirmDelete(false)}
        loading={deleting}
      />

      {/* Remove participant confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove participant"
        description="Remove this participant from the meeting?"
        confirmLabel="Remove"
        destructive
        onConfirm={() => { void handleRemoveParticipant(); }}
        onClose={() => setRemoveTarget(null)}
        loading={removingParticipant}
      />
    </PageContainer>
  );
}
