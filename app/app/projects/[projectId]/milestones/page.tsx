'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  createProjectMilestone,
  deleteProjectMilestone,
  listProjectMilestones,
  updateProjectMilestone,
  type ProjectMilestone,
} from '@/services/projects';

const milestoneSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be at most 120 characters'),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.string().optional(),
});

function dateLabel(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action. Project manager permission is required.';
  return cause.message;
}

export default function ProjectMilestonesPage({ params }: { params: { projectId: string } }) {
  const { activeWorkspace } = useWorkspaceContext();
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ProjectMilestone | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true); setError(null); setAccessStatus(null);
    try {
      const data = await listProjectMilestones(activeWorkspace.id, params.projectId);
      setMilestones(data);
    } catch (cause) {
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else {
        setError(requestError(cause, 'Milestones could not be loaded.'));
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, params.projectId]);

  useEffect(() => { let active = true; void Promise.resolve().then(() => active ? load() : undefined); return () => { active = false; }; }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) return;
    const parsed = milestoneSchema.safeParse({ name, description: description.trim() || undefined, dueDate: dueDate || undefined });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFormErrors(errors);
      return;
    }
    setBusy(true); setError(null); setFormErrors({});
    try {
      await createProjectMilestone(activeWorkspace.id, params.projectId, {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null,
      });
      setName(''); setDescription(''); setDueDate('');
      setNotice('Milestone created.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Milestone could not be created.')); }
    finally { setBusy(false); }
  }

  async function handleToggleComplete(milestone: ProjectMilestone) {
    if (!activeWorkspace) return;
    setBusy(true); setError(null);
    try {
      await updateProjectMilestone(activeWorkspace.id, params.projectId, milestone.id, {
        completed: !milestone.completedAt,
      });
      setNotice(milestone.completedAt ? 'Milestone reopened.' : 'Milestone completed.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Milestone could not be updated.')); }
    finally { setBusy(false); }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !editId) return;
    const parsed = milestoneSchema.safeParse({ name: editName, description: editDescription.trim() || undefined, dueDate: editDueDate || undefined });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check milestone details.'); return; }
    setBusy(true); setError(null);
    try {
      await updateProjectMilestone(activeWorkspace.id, params.projectId, editId, {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null,
      });
      setEditId(null);
      setNotice('Milestone updated.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Milestone could not be updated.')); }
    finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!activeWorkspace || !deleteTarget) return;
    setBusy(true); setError(null);
    try {
      await deleteProjectMilestone(activeWorkspace.id, params.projectId, deleteTarget.id);
      setDeleteTarget(null);
      setNotice('Milestone deleted.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Milestone could not be deleted.')); }
    finally { setBusy(false); }
  }

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading milestones">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Milestones</h2>
      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Create milestone</h3>
        <form className="space-y-4" onSubmit={(event) => void handleCreate(event)}>
          <Input
            id="milestone-name"
            label="Milestone name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={120}
            errorMessage={formErrors.name}
          />
          <Textarea
            id="milestone-description"
            label="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
            rows={2}
          />
          <div>
            <label htmlFor="milestone-due-date" className="block text-sm font-medium mb-1">
              Due date <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
            </label>
            <input
              id="milestone-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            />
          </div>
          <Button type="submit" loading={busy}>Create milestone</Button>
        </form>
      </Card>

      {milestones.length === 0 ? (
        <EmptyState title="No milestones" description="Create milestones to track important project goals." />
      ) : (
        <Card className="p-4">
          <ul className="divide-y divide-[var(--color-border)]" aria-label="Milestone list">
            {milestones.map((milestone) => (
              <li key={milestone.id} className="py-4 first:pt-0 last:pb-0">
                {editId === milestone.id ? (
                  <form className="space-y-3" onSubmit={(event) => void handleEdit(event)}>
                    <Input id={`edit-name-${milestone.id}`} label="Name" value={editName} onChange={(event) => setEditName(event.target.value)} required maxLength={120} />
                    <Textarea id={`edit-desc-${milestone.id}`} label="Description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={2000} rows={2} />
                    <div>
                      <label htmlFor={`edit-due-${milestone.id}`} className="block text-sm font-medium mb-1">Due date</label>
                      <input id={`edit-due-${milestone.id}`} type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" loading={busy}>Save</Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={['font-medium', milestone.completedAt ? 'line-through text-[var(--color-text-muted)]' : ''].join(' ')}>
                          {milestone.name}
                        </p>
                        {milestone.completedAt && <Badge variant="success">Completed</Badge>}
                      </div>
                      {milestone.description && (
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{milestone.description}</p>
                      )}
                      {milestone.dueDate && (
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Due: {dateLabel(milestone.dueDate)}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void handleToggleComplete(milestone)}
                        aria-label={milestone.completedAt ? `Reopen ${milestone.name}` : `Complete ${milestone.name}`}
                      >
                        {milestone.completedAt ? 'Reopen' : 'Complete'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          setEditId(milestone.id);
                          setEditName(milestone.name);
                          setEditDescription(milestone.description ?? '');
                          setEditDueDate(milestone.dueDate ? milestone.dueDate.slice(0, 10) : '');
                        }}
                        aria-label={`Edit ${milestone.name}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setDeleteTarget(milestone)}
                        aria-label={`Delete ${milestone.name}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={`Delete milestone "${deleteTarget?.name}"?`}
        description="This milestone will be permanently deleted. This cannot be undone."
        confirmLabel="Delete milestone"
        destructive
        loading={busy}
      />
    </div>
  );
}
