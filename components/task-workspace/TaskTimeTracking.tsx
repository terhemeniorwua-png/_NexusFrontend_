'use client';

import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { TaskTimeEntry } from '@/services/tasks';

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMinutes(total: number): string {
  if (total <= 0) return '0m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

interface EntryFormState {
  startedAt: string;
  durationMinutes: string;
  note: string;
}

function defaultForm(): EntryFormState {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return { startedAt: local, durationMinutes: '30', note: '' };
}

export function TaskTimeTracking({
  enabled,
  currentUserId,
  items,
  totalMinutes,
  loading,
  error,
  busy,
  onCreate,
  onUpdate,
  onDelete,
}: {
  enabled: boolean;
  currentUserId: string;
  items: TaskTimeEntry[];
  totalMinutes: number;
  loading: boolean;
  error: string | null;
  busy: boolean;
  onCreate: (input: { startedAt: string; durationMinutes: number; note?: string | null }) => Promise<void>;
  onUpdate: (entryId: string, input: { startedAt?: string; durationMinutes?: number; note?: string | null }) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
}) {
  const [form, setForm] = useState<EntryFormState>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EntryFormState | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const sorted = useMemo(() => items, [items]);

  if (!enabled) {
    return (
      <Card className="p-4 sm:p-5">
        <h2 className="mb-2 text-base font-semibold">Time tracking</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">Time tracking is disabled for this workspace.</p>
      </Card>
    );
  }

  async function submitCreate() {
    setFormError(null);
    const minutes = Number(form.durationMinutes);
    if (!form.startedAt || !Number.isInteger(minutes) || minutes < 1) {
      setFormError('Provide a valid start time and duration (minutes).');
      return;
    }
    try {
      await onCreate({
        startedAt: new Date(form.startedAt).toISOString(),
        durationMinutes: minutes,
        note: form.note.trim() || null,
      });
      setForm(defaultForm());
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to log time.');
    }
  }

  function startEdit(entry: TaskTimeEntry) {
    setEditingId(entry.id);
    setRowError(null);
    setEditForm({
      startedAt: toLocalDateTimeInput(entry.startedAt),
      durationMinutes: String(entry.durationMinutes),
      note: entry.note ?? '',
    });
  }

  async function submitEdit(entryId: string) {
    if (!editForm) return;
    setRowError(null);
    const minutes = Number(editForm.durationMinutes);
    if (!editForm.startedAt || !Number.isInteger(minutes) || minutes < 1) {
      setRowError('Provide a valid start time and duration (minutes).');
      return;
    }
    try {
      await onUpdate(entryId, {
        startedAt: new Date(editForm.startedAt).toISOString(),
        durationMinutes: minutes,
        note: editForm.note.trim() || null,
      });
      setEditingId(null);
      setEditForm(null);
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Failed to update time entry.');
    }
  }

  async function handleDelete(entryId: string) {
    setRowError(null);
    try {
      await onDelete(entryId);
      if (editingId === entryId) {
        setEditingId(null);
        setEditForm(null);
      }
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Failed to delete time entry.');
    }
  }

  return (
    <section aria-labelledby="time-tracking-heading" className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="time-tracking-heading" className="text-base font-semibold">Time tracking</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Total: <span className="font-medium text-[var(--color-text-primary)]">{formatMinutes(totalMinutes)}</span></p>
        </div>

        <div className="rounded border border-[var(--color-border)] p-3">
          <h3 className="mb-2 text-sm font-semibold">Log time</h3>
          {formError ? <Alert variant="error" className="mb-2">{formError}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="time-started-at" className="text-sm font-medium text-[var(--color-text-primary)]">Started at</label>
              <input
                id="time-started-at"
                type="datetime-local"
                value={form.startedAt}
                onChange={(e) => setForm((f) => ({ ...f, startedAt: e.target.value }))}
                className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>
            <Input
              id="time-duration"
              label="Duration (minutes)"
              type="number"
              min={1}
              max={1440}
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            />
          </div>
          <div className="mt-3">
            <Textarea
              id="time-note"
              label="Note (optional)"
              rows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
          <div className="mt-3">
            <Button size="sm" onClick={() => void submitCreate()} disabled={busy}>Log time</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold">Logged entries</h3>
        {error ? <Alert variant="error" className="mb-3">{error}</Alert> : null}
        {rowError ? <Alert variant="error" className="mb-3">{rowError}</Alert> : null}
        {loading ? <p className="text-sm text-[var(--color-text-secondary)]">Loading time entries…</p> : null}
        {!loading && sorted.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">No time logged yet.</p> : null}
        <ul className="space-y-3" role="list">
          {sorted.map((entry) => {
            const own = entry.userId === currentUserId;
            const editing = editingId === entry.id && editForm;
            return (
              <li key={entry.id} className="rounded border border-[var(--color-border)] p-3">
                {editing ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`edit-start-${entry.id}`} className="text-sm font-medium text-[var(--color-text-primary)]">Started at</label>
                        <input
                          id={`edit-start-${entry.id}`}
                          type="datetime-local"
                          value={editForm.startedAt}
                          onChange={(e) => setEditForm((f) => f ? { ...f, startedAt: e.target.value } : f)}
                          className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        />
                      </div>
                      <Input id={`edit-dur-${entry.id}`} label="Duration (minutes)" type="number" min={1} max={1440} value={editForm.durationMinutes} onChange={(e) => setEditForm((f) => f ? { ...f, durationMinutes: e.target.value } : f)} />
                    </div>
                    <Textarea id={`edit-note-${entry.id}`} label="Note" rows={2} value={editForm.note} onChange={(e) => setEditForm((f) => f ? { ...f, note: e.target.value } : f)} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void submitEdit(entry.id)} disabled={busy}>Save</Button>
                      <Button size="sm" variant="secondary" onClick={() => { setEditingId(null); setEditForm(null); }} disabled={busy}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{formatMinutes(entry.durationMinutes)} <span className="font-normal text-[var(--color-text-secondary)]">by {entry.user?.name ?? 'Unknown'}</span></p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Started {new Date(entry.startedAt).toLocaleString()}</p>
                      </div>
                      {own ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(entry)} disabled={busy}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => void handleDelete(entry.id)} disabled={busy}>Delete</Button>
                        </div>
                      ) : null}
                    </div>
                    {entry.note ? <p className="mt-2 whitespace-pre-wrap text-sm">{entry.note}</p> : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
