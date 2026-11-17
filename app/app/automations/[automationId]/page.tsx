'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import {
  getAutomation,
  listAutomationRuns,
  retryAutomationRun,
  updateAutomation,
  deleteAutomation,
  type Automation,
  type AutomationRun,
} from '@/services/automations';

const TRIGGER_LABELS: Record<string, string> = {
  EVENT_TASK_CREATED: 'Task created',
  EVENT_TASK_COMPLETED: 'Task completed',
  EVENT_MEMBER_JOINED: 'Member joined workspace',
  EVENT_TASK_STATUS_CHANGED: 'Task status changed',
  EVENT_TASK_ASSIGNED: 'Task assigned',
  EVENT_TASK_DUE_DATE_PASSED: 'Task due date passed',
  EVENT_FORM_SUBMITTED: 'Form submitted',
  SCHEDULED_DAILY: 'Daily schedule',
  SCHEDULED_WEEKLY: 'Weekly schedule',
};

const ACTION_LABELS: Record<string, string> = {
  SEND_NOTIFICATION: 'Send notification',
  CREATE_TASK: 'Create a task',
  SEND_WEBHOOK: 'Send webhook',
  SET_FIELD: 'Set field',
  ASSIGN: 'Assign user(s)',
  POST_MESSAGE: 'Post message',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function runStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FAILED') return 'error';
  if (status === 'RUNNING') return 'info';
  if (status === 'PENDING') return 'warning';
  return 'default';
}

// ─── Run history ──────────────────────────────────────────────────────────────

function RunHistory({
  runs,
  loading,
  onRetry,
  retryingId,
}: {
  runs: AutomationRun[];
  loading: boolean;
  onRetry: (run: AutomationRun) => void;
  retryingId: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading run history">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (runs.length === 0) {
    return <EmptyState title="No runs yet" description="This automation has not run yet." />;
  }

  const failedCount = runs.filter((r) => r.status === 'FAILED').length;

  return (
    <div className="space-y-2">
      {failedCount > 0 && (
        <Alert variant="warning" className="mb-2">
          {failedCount} failed run{failedCount === 1 ? '' : 's'} in this history. Failed runs show their error reason and can be retried.
        </Alert>
      )}
      {runs.map((run) => (
        <div
          key={run.id}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={runStatusVariant(run.status)}>{run.status}</Badge>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {run.attempts} attempt{run.attempts !== 1 ? 's' : ''}
                </span>
                {run.eventKey && (
                  <span className="max-w-full truncate text-xs text-[var(--color-text-muted)]" title={run.eventKey}>
                    event {run.eventKey}
                  </span>
                )}
              </div>
              {run.error ? (
                <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--color-error)]">
                  <span className="font-medium">Failure reason:</span> {run.error}
                </p>
              ) : run.status === 'FAILED' ? (
                <p className="mt-1 text-xs text-[var(--color-error)]">Failure reason unavailable.</p>
              ) : null}
              <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)] sm:grid-cols-2">
                <div><dt className="inline font-medium text-[var(--color-text-secondary)]">Started: </dt><dd className="inline">{formatDate(run.startedAt)}</dd></div>
                <div><dt className="inline font-medium text-[var(--color-text-secondary)]">Completed: </dt><dd className="inline">{formatDate(run.completedAt)}</dd></div>
                <div><dt className="inline font-medium text-[var(--color-text-secondary)]">Created: </dt><dd className="inline">{formatDate(run.createdAt)}</dd></div>
                {run.nextAttemptAt && <div><dt className="inline font-medium text-[var(--color-text-secondary)]">Next attempt: </dt><dd className="inline">{formatDate(run.nextAttemptAt)}</dd></div>}
              </dl>
            </div>
            {run.status === 'FAILED' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRetry(run)}
                loading={retryingId === run.id}
                disabled={retryingId !== null}
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const automationId = params.automationId as string;

  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Redirect when workspace changes
  const prevWorkspaceId = useRef(workspaceId);
  useEffect(() => {
    if (prevWorkspaceId.current && workspaceId && prevWorkspaceId.current !== workspaceId) {
      router.push('/app/automations');
    }
    prevWorkspaceId.current = workspaceId;
  }, [workspaceId, router]);

  const loadRuns = useCallback(async (wsId: string, aId: string) => {
    setRunsLoading(true);
    setRunsError(null);
    try {
      const history = await listAutomationRuns(wsId, aId, { limit: 50 });
      setRuns(history);
    } catch (err) {
      setRunsError(err instanceof ApiRequestError ? err.message : 'Could not load run history.');
      // fall back to runs included on automation if available
    } finally {
      setRunsLoading(false);
    }
  }, []);

  const loadAutomation = useCallback(async (wsId: string, aId: string) => {
    if (!wsId || !aId) return;
    setLoading(true);
    setError(null);
    setAccessError(null);
    try {
      const a = await getAutomation(wsId, aId);
      setAutomation(a);
      if (a.runs && a.runs.length > 0) setRuns(a.runs);
      void loadRuns(wsId, aId);
    } catch (err) {
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        setAccessError(err.status);
      } else if (err instanceof ApiRequestError && err.status === 404) {
        setError('Automation not found.');
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Could not load automation.');
      }
    } finally {
      setLoading(false);
    }
  }, [loadRuns]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? loadAutomation(workspaceId, automationId) : undefined);
    return () => { active = false; };
  }, [workspaceId, automationId, loadAutomation]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!automation || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateAutomation(workspaceId, automationId, { name: editName.trim() });
      setAutomation((prev) => prev ? { ...prev, ...updated } : updated);
      setEditOpen(false);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!automation || toggling) return;
    setToggling(true);
    setToggleError(null);
    try {
      const updated = await updateAutomation(workspaceId, automationId, { enabled: !automation.enabled });
      setAutomation((prev) => prev ? { ...prev, ...updated } : updated);
    } catch (err) {
      setToggleError(err instanceof ApiRequestError ? err.message : 'Could not update.');
    } finally {
      setToggling(false);
    }
  }

  async function handleRetry(run: AutomationRun) {
    if (!automation || retryingId) return;
    setRetryingId(run.id);
    setRetryError(null);
    try {
      const updated = await retryAutomationRun(workspaceId, automationId, run.id);
      setRuns((prev) => prev.map((r) => (r.id === run.id ? { ...r, ...updated } : r)));
    } catch (err) {
      setRetryError(err instanceof ApiRequestError ? err.message : 'Could not retry run.');
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDelete() {
    if (!automation || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAutomation(workspaceId, automationId);
      router.push('/app/automations');
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Could not delete.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Automation" />
        <Alert variant="error">No workspace selected.</Alert>
      </PageContainer>
    );
  }

  if (accessError) {
    return (
      <PageContainer>
        <PageHeader title="Automation" />
        <AccessState status={accessError as 401 | 403} />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Automation" />
        <div className="space-y-4" aria-busy="true" aria-label="Loading automation">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !automation) {
    return (
      <PageContainer>
        <PageHeader title="Automation" />
        <Alert variant="error">
          {error ?? 'Automation not found.'}
          <Button variant="secondary" size="sm" className="mt-2"
            onClick={() => void loadAutomation(workspaceId, automationId)}>Retry</Button>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={automation.name}
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
            <Link href="/app/automations" className="hover:underline">Automations</Link>
            <span>/</span>
            <span className="text-[var(--color-text-secondary)]">{automation.name}</span>
          </nav>
        }
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setEditName(automation.name); setEditOpen(true); }}>
              Rename
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { void handleToggle(); }}
              loading={toggling}
              disabled={toggling}
            >
              {automation.enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        }
      />

      {toggleError && <Alert variant="error" className="mb-3">{toggleError}</Alert>}
      {deleteError && <Alert variant="error" className="mb-3">{deleteError}</Alert>}
      {retryError && <Alert variant="error" className="mb-3">{retryError}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Details */}
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-[var(--color-text-primary)]">Configuration</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-[var(--color-text-secondary)]">Status</dt>
              <dd className="mt-0.5">
                <Badge variant={automation.enabled ? 'success' : 'default'}>
                  {automation.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-secondary)]">Trigger</dt>
              <dd className="mt-0.5 text-[var(--color-text-primary)]">
                {TRIGGER_LABELS[automation.trigger] ?? automation.trigger}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-secondary)]">Action</dt>
              <dd className="mt-0.5 text-[var(--color-text-primary)]">
                {ACTION_LABELS[automation.action] ?? automation.action}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-secondary)]">Action config</dt>
              <dd className="mt-1">
                {Object.keys(automation.actionConfig ?? {}).length === 0 ? (
                  <span className="text-sm text-[var(--color-text-muted)]">No configuration</span>
                ) : (
                  <dl className="space-y-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] p-2 text-xs">
                    {Object.entries(automation.actionConfig).map(([key, value]) => (
                      <div key={key} className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-[var(--color-text-secondary)]">{key}:</dt>
                        <dd className="break-all text-[var(--color-text-primary)]">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </dd>
            </div>
            {automation.condition && Object.keys(automation.condition).length > 0 && (
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">Conditions</dt>
                <dd className="mt-1">
                  <dl className="space-y-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] p-2 text-xs">
                    {Object.entries(automation.condition).map(([key, value]) => (
                      <div key={key} className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-[var(--color-text-secondary)]">{key}:</dt>
                        <dd className="break-all text-[var(--color-text-primary)]">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-[var(--color-text-secondary)]">Max retries</dt>
              <dd className="mt-0.5 text-[var(--color-text-primary)]">{automation.maxRetries}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-secondary)]">Created</dt>
              <dd className="mt-0.5 text-[var(--color-text-primary)]">{formatDate(automation.createdAt)}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] p-2 text-xs text-[var(--color-text-muted)]">
            The trigger, conditions and action are fixed after creation. To change them, delete this
            automation and create a new one. You can still rename it and enable or disable it here.
          </p>
        </Card>

        {/* Run history */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-[var(--color-text-primary)]">Run history</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void loadRuns(workspaceId, automationId)}
              disabled={runsLoading}
            >
              Refresh
            </Button>
          </div>
          {runsError && <Alert variant="warning" className="mb-3">{runsError}</Alert>}
          <RunHistory
            runs={runs}
            loading={runsLoading && runs.length === 0}
            onRetry={(run) => { void handleRetry(run); }}
            retryingId={retryingId}
          />
        </Card>
      </div>

      {/* Rename modal */}
      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setSaveError(null); }}
        title="Rename automation"
        maxWidth="sm"
      >
        <form onSubmit={(e) => { void handleRename(e); }} className="space-y-4">
          {saveError && <Alert variant="error">{saveError}</Alert>}
          <Input
            id="edit-auto-name"
            label="Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={200}
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" loading={saving} disabled={saving}>Save</Button>
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete automation"
        description={`Delete "${automation.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { void handleDelete(); }}
        onClose={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </PageContainer>
  );
}
