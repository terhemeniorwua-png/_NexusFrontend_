'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
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
import { ApiRequestError } from '@/lib/api';
import {
  listEvents,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  listEventInvitations,
  addEventInvitee,
  removeEventInvitee,
  respondToEventInvitation,
  type EventSummary,
  type EventStatus,
  type EventVisibility,
  type EventInvitation,
  type InvitationStatus,
} from '@/services/events';
import { listWorkspaceMembers, type WorkspaceMember } from '@/services/workspaces';

// ─── Calendar helpers ─────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday
  const result = new Date(d);
  result.setDate(d.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}
function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function formatDateTimeLocal(iso: string): string {
  // Convert ISO to datetime-local input format: YYYY-MM-DDTHH:mm
  return iso.slice(0, 16);
}
function toISOWithOffset(localStr: string): string {
  // datetime-local gives YYYY-MM-DDTHH:mm — convert to full ISO with Z offset
  return new Date(localStr).toISOString();
}
function formatDisplayTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function calendarRangeFor(view: ViewMode, anchor: Date): { startAfter: string; startBefore: string } {
  if (view === 'month') {
    const start = startOfMonth(anchor);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59);
    return { startAfter: start.toISOString(), startBefore: end.toISOString() };
  }
  if (view === 'week') {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    end.setHours(23, 59, 59);
    return { startAfter: start.toISOString(), startBefore: end.toISOString() };
  }
  if (view === 'agenda') {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 30);
    end.setHours(23, 59, 59);
    return { startAfter: start.toISOString(), startBefore: end.toISOString() };
  }
  // day
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(anchor);
  end.setHours(23, 59, 59);
  return { startAfter: start.toISOString(), startBefore: end.toISOString() };
}

function statusBadgeVariant(status: EventStatus): 'default' | 'warning' | 'error' {
  if (status === 'TENTATIVE') return 'warning';
  if (status === 'CANCELLED') return 'error';
  return 'default';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Month grid ───────────────────────────────────────────────────────────────

function buildMonthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const startPad = first.getDay(); // pad before the 1st
  const endPad = 6 - last.getDay(); // pad after the last
  const cells: Date[] = [];
  for (let i = startPad; i > 0; i--) cells.push(addDays(first, -i));
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));
  for (let i = 1; i <= endPad; i++) cells.push(addDays(last, i));
  return cells;
}

// ─── Event form ───────────────────────────────────────────────────────────────

interface EventFormState {
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  status: EventStatus;
  visibility: EventVisibility;
}

function defaultFormState(prefillDate?: string): EventFormState {
  const base = prefillDate ? new Date(prefillDate) : new Date();
  base.setHours(9, 0, 0, 0);
  const end = new Date(base);
  end.setHours(10, 0, 0, 0);
  return {
    title: '',
    description: '',
    location: '',
    startAt: formatDateTimeLocal(base.toISOString()),
    endAt: formatDateTimeLocal(end.toISOString()),
    allDay: false,
    status: 'CONFIRMED',
    visibility: 'PUBLIC',
  };
}

interface EventFormProps {
  initial: EventFormState;
  saving: boolean;
  error: string | null;
  onSubmit: (state: EventFormState) => void;
  onCancel: () => void;
  submitLabel?: string;
}

function EventForm({ initial, saving, error, onSubmit, onCancel, submitLabel = 'Create event' }: EventFormProps) {
  const [form, setForm] = useState<EventFormState>(initial);

  function set<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
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
        id="evt-title"
        label="Title"
        required
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        maxLength={300}
        autoFocus
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="evt-start" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Start{form.allDay ? ' (date)' : ''}
          </label>
          <input
            id="evt-start"
            type={form.allDay ? 'date' : 'datetime-local'}
            value={form.allDay ? form.startAt.slice(0, 10) : form.startAt}
            onChange={(e) => set('startAt', form.allDay ? `${e.target.value}T00:00` : e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <div>
          <label htmlFor="evt-end" className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            End{form.allDay ? ' (date)' : ''}
          </label>
          <input
            id="evt-end"
            type={form.allDay ? 'date' : 'datetime-local'}
            value={form.allDay ? form.endAt.slice(0, 10) : form.endAt}
            onChange={(e) => set('endAt', form.allDay ? `${e.target.value}T23:59` : e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      <Checkbox
        id="evt-allday"
        label="All-day event"
        checked={form.allDay}
        onChange={(e) => set('allDay', e.target.checked)}
      />

      <Textarea
        id="evt-description"
        label="Description (optional)"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={3}
        maxLength={5000}
      />

      <Input
        id="evt-location"
        label="Location (optional)"
        value={form.location}
        onChange={(e) => set('location', e.target.value)}
        maxLength={300}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          id="evt-status"
          label="Status"
          value={form.status}
          onChange={(e) => set('status', e.target.value as EventStatus)}
          options={[
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'TENTATIVE', label: 'Tentative' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
        />
        <Select
          id="evt-visibility"
          label="Visibility"
          value={form.visibility}
          onChange={(e) => set('visibility', e.target.value as EventVisibility)}
          options={[
            { value: 'PUBLIC', label: 'Public (workspace members)' },
            { value: 'PRIVATE', label: 'Private (creator only)' },
          ]}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={saving} disabled={saving}>{submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Event detail panel ───────────────────────────────────────────────────────

interface DetailPanelProps {
  workspaceId: string;
  event: EventSummary;
  currentUserId: string;
  onUpdated: (evt: EventSummary) => void;
  onDeleted: (eventId: string) => void;
  onClose: () => void;
}

function DetailPanel({ workspaceId, event, currentUserId, onUpdated, onDeleted, onClose }: DetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<Array<EventInvitation & { name?: string }>>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const loadedInvitations = useRef(false);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [responding, setResponding] = useState<'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [showInvitePicker, setShowInvitePicker] = useState(false);
  const [selectedInvitee, setSelectedInvitee] = useState('');
  const [addingInvitee, setAddingInvitee] = useState(false);
  const [removingInviteeId, setRemovingInviteeId] = useState<string | null>(null);
  const [participantError, setParticipantError] = useState<string | null>(null);

  const isCreator = event.createdById === currentUserId;
  const myInvitation = invitations.find((invitation) => invitation.userId === currentUserId);
  const availableInvitees = members.filter(
    (member) => !invitations.some((invitation) => invitation.userId === member.userId),
  );

  useEffect(() => {
    if (!loadedInvitations.current) {
      loadedInvitations.current = true;
      void (async () => {
        setLoadingInvitations(true);
        try {
          setInvitations(await listEventInvitations(workspaceId, event.id));
        } catch (err) {
          setInvitationError(err instanceof ApiRequestError ? err.message : 'Could not load invitations.');
        } finally {
          setLoadingInvitations(false);
        }
      })();
    }
  }, [workspaceId, event.id]);

  // Reset editing state when event changes
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setEditing(false);
      setSaveError(null);
      loadedInvitations.current = false;
    });
    return () => { active = false; };
  }, [event.id]);

  async function handleSave(formState: ReturnType<typeof defaultFormState>) {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateEvent(workspaceId, event.id, {
        title: formState.title,
        description: formState.description || null,
        location: formState.location || null,
        startAt: toISOWithOffset(formState.startAt),
        endAt: toISOWithOffset(formState.endAt),
        allDay: formState.allDay,
        status: formState.status,
        visibility: formState.visibility,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? err.message : 'Could not update event.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelEvent(workspaceId, event.id);
      onUpdated({ ...event, status: 'CANCELLED' });
      setConfirmCancel(false);
    } catch (err) {
      setCancelError(err instanceof ApiRequestError ? err.message : 'Could not cancel event.');
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEvent(workspaceId, event.id);
      onDeleted(event.id);
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Could not delete event.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleRespond(status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE') {
    setResponding(status);
    setResponseError(null);
    try {
      await respondToEventInvitation(workspaceId, event.id, status);
      setInvitations((prev) => prev.map((invitation) =>
        invitation.userId === currentUserId
          ? { ...invitation, status: status as InvitationStatus }
          : invitation,
      ));
    } catch (err) {
      setResponseError(err instanceof ApiRequestError ? err.message : 'Could not save your response.');
    } finally {
      setResponding(null);
    }
  }

  async function toggleInvitePicker() {
    const next = !showInvitePicker;
    setShowInvitePicker(next);
    setParticipantError(null);
    if (!next || members.length > 0) return;
    try {
      setMembers(await listWorkspaceMembers(workspaceId));
    } catch (err) {
      setParticipantError(err instanceof ApiRequestError ? err.message : 'Could not load workspace members.');
    }
  }

  async function handleAddInvitee() {
    if (!selectedInvitee || addingInvitee) return;
    setAddingInvitee(true);
    setParticipantError(null);
    try {
      await addEventInvitee(workspaceId, event.id, selectedInvitee);
      const member = members.find((item) => item.userId === selectedInvitee);
      setInvitations((prev) => [
        ...prev,
        {
          userId: selectedInvitee,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          name: member?.name,
        },
      ]);
      setSelectedInvitee('');
    } catch (err) {
      setParticipantError(err instanceof ApiRequestError ? err.message : 'Could not add the participant.');
    } finally {
      setAddingInvitee(false);
    }
  }

  async function handleRemoveInvitee(userId: string) {
    setRemovingInviteeId(userId);
    setParticipantError(null);
    try {
      await removeEventInvitee(workspaceId, event.id, userId);
      setInvitations((prev) => prev.filter((invitation) => invitation.userId !== userId));
    } catch (err) {
      setParticipantError(err instanceof ApiRequestError ? err.message : 'Could not remove the participant.');
    } finally {
      setRemovingInviteeId(null);
    }
  }

  const editInitial: ReturnType<typeof defaultFormState> = {
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    startAt: formatDateTimeLocal(event.startAt),
    endAt: formatDateTimeLocal(event.endAt),
    allDay: event.allDay,
    status: event.status,
    visibility: event.visibility,
  };

  return (
    <Card className="p-5">
      {editing ? (
        <>
          <h2 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">Edit event</h2>
          <EventForm
            initial={editInitial}
            saving={saving}
            error={saveError}
            onSubmit={(s) => { void handleSave(s); }}
            onCancel={() => { setEditing(false); setSaveError(null); }}
            submitLabel="Save changes"
          />
        </>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-semibold text-[var(--color-text-primary)]">{event.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariant(event.status)}>{event.status}</Badge>
                <Badge variant="outline">{event.visibility === 'PRIVATE' ? '🔒 Private' : '🌐 Public'}</Badge>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {isCreator && event.status !== 'CANCELLED' && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmCancel(true)}>Cancel event</Button>
                </>
              )}
              {isCreator && (
                <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(true)}>Delete</Button>
              )}
              <Button size="sm" variant="secondary" onClick={onClose}>✕</Button>
            </div>
          </div>

          {cancelError && <Alert variant="error" className="mt-3">{cancelError}</Alert>}
          {deleteError && <Alert variant="error" className="mt-3">{deleteError}</Alert>}

          {/* Date/time */}
          <div className="mt-4 space-y-1 text-sm text-[var(--color-text-secondary)]">
            <p>
              <span className="font-medium">When: </span>
              {event.allDay
                ? `${formatDisplayDate(event.startAt)} (all day)`
                : `${formatDisplayDate(event.startAt)} ${formatDisplayTime(event.startAt)} – ${formatDisplayTime(event.endAt)}`}
            </p>
            {event.location && (
              <p><span className="font-medium">Where: </span>{event.location}</p>
            )}
            {event.projectId && (
              <p><span className="font-medium">Project: </span>{event.projectId}</p>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="mt-4">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{event.description}</p>
            </div>
          )}

          {/* Invitations */}
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">Participants</p>
              {isCreator && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { void toggleInvitePicker(); }}
                  aria-expanded={showInvitePicker}
                >
                  {showInvitePicker ? 'Done' : 'Add participant'}
                </Button>
              )}
            </div>

            {loadingInvitations ? (
              <div className="mt-2 space-y-1">
                {[1, 2].map((i) => <Skeleton key={i} className="h-6 w-48" />)}
              </div>
            ) : invitationError ? (
              <Alert variant="error" className="mt-2">{invitationError}</Alert>
            ) : invitations.length === 0 ? (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">No invitations sent yet.</p>
            ) : (
              <ul className="mt-2 space-y-1" aria-label="Event participants">
                {invitations.map((inv) => (
                  <li key={inv.userId} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">
                      {inv.name ?? `${inv.userId.slice(0, 8)}…`}
                    </span>
                    {inv.userId === currentUserId && <Badge variant="outline">You</Badge>}
                    <Badge
                      variant={inv.status === 'ACCEPTED' ? 'success' : inv.status === 'DECLINED' ? 'error' : 'warning'}
                    >
                      {inv.status}
                    </Badge>
                    {isCreator && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { void handleRemoveInvitee(inv.userId); }}
                        loading={removingInviteeId === inv.userId}
                        disabled={removingInviteeId === inv.userId}
                        aria-label={`Remove participant ${inv.name ?? inv.userId}`}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* The current user's response controls */}
            {myInvitation && (
              <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Your response: <span className="text-[var(--color-text-primary)]">{myInvitation.status}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={myInvitation.status === 'ACCEPTED' ? 'primary' : 'secondary'}
                    onClick={() => { void handleRespond('ACCEPTED'); }}
                    loading={responding === 'ACCEPTED'}
                    disabled={responding !== null}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant={myInvitation.status === 'TENTATIVE' ? 'primary' : 'secondary'}
                    onClick={() => { void handleRespond('TENTATIVE'); }}
                    loading={responding === 'TENTATIVE'}
                    disabled={responding !== null}
                  >
                    Maybe
                  </Button>
                  <Button
                    size="sm"
                    variant={myInvitation.status === 'DECLINED' ? 'primary' : 'secondary'}
                    onClick={() => { void handleRespond('DECLINED'); }}
                    loading={responding === 'DECLINED'}
                    disabled={responding !== null}
                  >
                    Decline
                  </Button>
                </div>
                {responseError && <p className="mt-2 text-xs text-[var(--color-error)]">{responseError}</p>}
              </div>
            )}

            {/* Creator-only invitee picker */}
            {isCreator && showInvitePicker && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <Select
                    id="event-invitee"
                    label="Add participant"
                    value={selectedInvitee}
                    onChange={(e) => setSelectedInvitee(e.target.value)}
                    options={[
                      { value: '', label: availableInvitees.length === 0 ? 'No available members' : 'Select a member' },
                      ...availableInvitees.map((member) => ({
                        value: member.userId,
                        label: member.name,
                      })),
                    ]}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => { void handleAddInvitee(); }}
                  loading={addingInvitee}
                  disabled={!selectedInvitee || addingInvitee}
                >
                  Add
                </Button>
              </div>
            )}

            {participantError && <p className="mt-2 text-xs text-[var(--color-error)]">{participantError}</p>}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel event"
        description={`Cancel "${event.title}"? The event status will be set to Cancelled. Participants will not be automatically notified.`}
        confirmLabel="Cancel event"
        destructive
        onConfirm={() => { void handleCancel(); }}
        onClose={() => setConfirmCancel(false)}
        loading={cancelling}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete event"
        description={`Permanently delete "${event.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { void handleDelete(); }}
        onClose={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </Card>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  anchor,
  events,
  onDayClick,
  onEventClick,
}: {
  anchor: Date;
  events: EventSummary[];
  onDayClick: (date: Date) => void;
  onEventClick: (evt: EventSummary) => void;
}) {
  const cells = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const today = new Date();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventSummary[]>();
    for (const evt of events) {
      const key = formatDate(new Date(evt.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(evt);
    }
    return map;
  }, [events]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
        {DAY_NAMES.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isCurrentMonth = cell.getMonth() === anchor.getMonth();
          const isToday = isSameDay(cell, today);
          const dateKey = formatDate(cell);
          const dayEvents = eventsByDate.get(dateKey) ?? [];

          return (
            <div
              key={i}
              role="gridcell"
              aria-label={cell.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              className={[
                'min-h-[80px] border-b border-r border-[var(--color-border)] p-1 transition-colors last:border-r-0',
                isCurrentMonth ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-secondary)] opacity-50',
                'hover:bg-[var(--color-surface-secondary)] cursor-pointer',
              ].join(' ')}
              onClick={() => onDayClick(cell)}
            >
              <span
                className={[
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)]',
                ].join(' ')}
              >
                {cell.getDate()}
              </span>

              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((evt) => (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                    className={[
                      'w-full truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight',
                      evt.status === 'CANCELLED'
                        ? 'bg-[var(--color-error-soft)] text-[var(--color-error)] line-through'
                        : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
                    ].join(' ')}
                    aria-label={evt.title}
                  >
                    {!evt.allDay && <span className="mr-0.5 opacity-70">{formatDisplayTime(evt.startAt)}</span>}
                    {evt.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-[var(--color-text-muted)]">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  anchor,
  events,
  onDayClick,
  onEventClick,
}: {
  anchor: Date;
  events: EventSummary[];
  onDayClick: (date: Date) => void;
  onEventClick: (evt: EventSummary) => void;
}) {
  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const today = new Date();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventSummary[]>();
    for (const evt of events) {
      const key = formatDate(new Date(evt.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(evt);
    }
    return map;
  }, [events]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={[
                'px-2 py-3 text-center',
                isToday ? 'bg-[var(--color-primary-soft)]' : '',
              ].join(' ')}
            >
              <p className="text-xs text-[var(--color-text-muted)]">{DAY_NAMES[day.getDay()]}</p>
              <p className={[
                'mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                isToday ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-primary)]',
              ].join(' ')}>{day.getDate()}</p>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-7 divide-x divide-[var(--color-border)]">
        {days.map((day) => {
          const dateKey = formatDate(day);
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          return (
            <div key={day.toISOString()} className="min-h-[200px] p-1.5 space-y-1">
              {dayEvents.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">—</p>
              ) : dayEvents.map((evt) => (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => onEventClick(evt)}
                  className={[
                    'w-full rounded px-2 py-1.5 text-left text-xs',
                    evt.status === 'CANCELLED'
                      ? 'bg-[var(--color-error-soft)] text-[var(--color-error)] line-through'
                      : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
                  ].join(' ')}
                >
                  {!evt.allDay && <p className="font-medium">{formatDisplayTime(evt.startAt)}</p>}
                  <p className="truncate">{evt.title}</p>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  anchor,
  events,
  onEventClick,
}: {
  anchor: Date;
  events: EventSummary[];
  onEventClick: (evt: EventSummary) => void;
}) {
  const today = new Date();
  const isToday = isSameDay(anchor, today);
  const dayEvents = useMemo(
    () => events.filter((e) => isSameDay(new Date(e.startAt), anchor)),
    [events, anchor],
  );

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className={['mb-4 text-base font-semibold', isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
        {anchor.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        {isToday && <span className="ml-2 text-sm font-normal">(Today)</span>}
      </p>
      {dayEvents.length === 0 ? (
        <EmptyState title="No events" description="No events scheduled for this day." />
      ) : (
        <ul className="space-y-2" aria-label="Events for this day">
          {dayEvents.map((evt) => (
            <li key={evt.id}>
              <button
                type="button"
                onClick={() => onEventClick(evt)}
                className={[
                  'w-full rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors',
                  evt.status === 'CANCELLED'
                    ? 'border-[var(--color-error)] bg-[var(--color-error-soft)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={['truncate text-sm font-medium', evt.status === 'CANCELLED' ? 'line-through text-[var(--color-error)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
                      {evt.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {evt.allDay ? 'All day' : `${formatDisplayTime(evt.startAt)} – ${formatDisplayTime(evt.endAt)}`}
                      {evt.location ? ` · ${evt.location}` : ''}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(evt.status)}>{evt.status}</Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Agenda view ──────────────────────────────────────────────────────────────

function AgendaView({
  events,
  onEventClick,
}: {
  events: EventSummary[];
  onEventClick: (evt: EventSummary) => void;
}) {
  const today = new Date();

  const groups = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
    const map = new Map<string, EventSummary[]>();
    for (const evt of sorted) {
      const key = formatDate(new Date(evt.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(evt);
    }
    return [...map.entries()];
  }, [events]);

  if (groups.length === 0) {
    return (
      <EmptyState
        title="No upcoming events"
        description="Nothing is scheduled in the next 30 days."
      />
    );
  }

  return (
    <div className="space-y-5" aria-label="Agenda">
      {groups.map(([dateKey, dayEvents]) => {
        const date = new Date(`${dateKey}T00:00:00`);
        const isToday = isSameDay(date, today);
        return (
          <section key={dateKey} aria-label={date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}>
            <h3 className={[
              'mb-2 text-sm font-semibold',
              isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]',
            ].join(' ')}>
              {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {isToday && <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">Today</span>}
            </h3>
            <ul className="space-y-2">
              {dayEvents.map((evt) => (
                <li key={evt.id}>
                  <button
                    type="button"
                    onClick={() => onEventClick(evt)}
                    className={[
                      'flex w-full flex-wrap items-start justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors',
                      evt.status === 'CANCELLED'
                        ? 'border-[var(--color-error)] bg-[var(--color-error-soft)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]',
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={[
                        'truncate text-sm font-medium',
                        evt.status === 'CANCELLED' ? 'line-through text-[var(--color-error)]' : 'text-[var(--color-text-primary)]',
                      ].join(' ')}>
                        {evt.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        {evt.allDay
                          ? 'All day'
                          : `${formatDisplayTime(evt.startAt)} – ${formatDisplayTime(evt.endAt)}`}
                        {evt.location ? ` · ${evt.location}` : ''}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(evt.status)}>{evt.status}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { activeWorkspace, user } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const currentUserId = user?.id ?? '';

  const [view, setView] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefillDate, setCreatePrefillDate] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const latestLoad = useRef(0);

  const load = useCallback(async (wsId: string, v: ViewMode, a: Date, cursor?: string, append = false) => {
    if (!wsId) return;
    const seq = ++latestLoad.current;
    const range = calendarRangeFor(v, a);
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }
    try {
      const result = await listEvents(wsId, {
        ...range,
        cursor,
        limit: 100, // large limit for calendar since we need all events in range
      });
      if (seq !== latestLoad.current) return;
      if (append) setEvents((prev) => [...prev, ...result.items]);
      else setEvents(result.items);
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      setError(err instanceof ApiRequestError ? err.message : 'Could not load events.');
    } finally {
      if (seq === latestLoad.current) { setLoading(false); setLoadingMore(false); }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load(workspaceId, view, anchor) : undefined);
    return () => { active = false; };
  }, [workspaceId, view, anchor, load]);

  function navigate(direction: -1 | 1) {
    setAnchor((prev) => {
      if (view === 'month') return addMonths(prev, direction);
      if (view === 'week') return addDays(prev, direction * 7);
      if (view === 'agenda') return addDays(prev, direction * 30);
      return addDays(prev, direction);
    });
  }

  function headingFor(): string {
    if (view === 'month') return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (view === 'week') {
      const ws = startOfWeek(anchor);
      const we = addDays(ws, 6);
      return `${ws.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (view === 'agenda') {
      const end = addDays(anchor, 30);
      return `${anchor.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return anchor.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function handleDayClick(date: Date) {
    if (view === 'month' || view === 'week') {
      setAnchor(date);
      setView('day');
    }
  }

  async function handleCreate(formState: ReturnType<typeof defaultFormState>) {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const evt = await createEvent(workspaceId, {
        title: formState.title,
        description: formState.description || null,
        location: formState.location || null,
        startAt: toISOWithOffset(formState.startAt),
        endAt: toISOWithOffset(formState.endAt),
        allDay: formState.allDay,
        status: formState.status,
        visibility: formState.visibility,
      });
      setEvents((prev) => [...prev, evt]);
      setCreateOpen(false);
      setSelectedEvent(evt);
    } catch (err) {
      setCreateError(err instanceof ApiRequestError ? err.message : 'Could not create event.');
    } finally {
      setCreating(false);
    }
  }

  function handleUpdated(updated: EventSummary) {
    setEvents((prev) => prev.map((e) => e.id === updated.id ? updated : e));
    setSelectedEvent(updated);
  }

  function handleDeleted(eventId: string) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setSelectedEvent(null);
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Calendar" />
        <EmptyState title="No workspace selected" description="Select a workspace to view your calendar." />
      </PageContainer>
    );
  }

  const statusFilterLabel = `${events.length} event${events.length !== 1 ? 's' : ''}`;

  return (
    <PageContainer>
      <PageHeader
        title="Calendar"
        description="Schedule and manage workspace events."
        actions={
          <Button onClick={() => { setCreatePrefillDate(undefined); setCreateOpen(true); }}>
            New event
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setAnchor(new Date()); }}
          >
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(-1)}
            aria-label="Previous"
          >
            ‹
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(1)}
            aria-label="Next"
          >
            ›
          </Button>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{headingFor()}</h2>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
          {(['month', 'week', 'day', 'agenda'] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={[
                'rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                view === v
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]',
              ].join(' ')}
              aria-pressed={view === v}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Status count */}
      {!loading && !error && (
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">{statusFilterLabel}</p>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load(workspaceId, view, anchor); }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading events">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Calendar grid */}
          {view === 'month' && (
            <MonthView
              anchor={anchor}
              events={events}
              onDayClick={(date) => { handleDayClick(date); }}
              onEventClick={setSelectedEvent}
            />
          )}
          {view === 'week' && (
            <WeekView
              anchor={anchor}
              events={events}
              onDayClick={(date) => { handleDayClick(date); }}
              onEventClick={setSelectedEvent}
            />
          )}
          {view === 'day' && (
            <DayView
              anchor={anchor}
              events={events}
              onEventClick={setSelectedEvent}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              events={events}
              onEventClick={setSelectedEvent}
            />
          )}

          {/* Load more */}
          {nextCursor && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => { void load(workspaceId, view, anchor, nextCursor, true); }}
              loading={loadingMore}
              disabled={loadingMore}
            >
              Load more events
            </Button>
          )}

          {/* Event detail panel */}
          {selectedEvent && (
            <DetailPanel
              workspaceId={workspaceId}
              event={selectedEvent}
              currentUserId={currentUserId}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </div>
      )}

      {/* Create event modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(null); }}
        title="New event"
        maxWidth="lg"
      >
        <EventForm
          initial={defaultFormState(createPrefillDate)}
          saving={creating}
          error={createError}
          onSubmit={(s) => { void handleCreate(s); }}
          onCancel={() => { setCreateOpen(false); setCreateError(null); }}
        />
      </Modal>
    </PageContainer>
  );
}
