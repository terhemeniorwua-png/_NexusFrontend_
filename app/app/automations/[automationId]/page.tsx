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
  updateAutomation,
  deleteAutomation,
  type Automation,
  type AutomationRun,
} from '@/services/automations';

const TRIGGER_LABELS: Record<string, string> = {
  EVENT_TASK_CREATED:   'Task created',
  EVENT_TASK_COMPLETED: 'Task completed',
  EVENT_MEMBER_JOINED:  'Member joined workspace',
  SCHEDULED_DAILY:      'Daily schedule',
  SCHEDULED_WEEKLY:     'Weekly schedule',
};

const ACTION_LABELS: Record<string, string> = {
  SEND_NOTIFICATION: 'Send notification',
  CREATE_TASK:       'Create a task',
  SEND_WEBHOOK:      'Send webhook',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function runStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FAILED') return 'error';
  return 'warning';
}

// ─── Run history ──────────────────────────────────────────────────────────────

function RunHistory({ runs }: { runs: AutomationRun[] }) {
  if (runs.length === 0) {
    return <EmptyState title="No runs yet" description="This automation has not run yet." />;
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant={runStatusVariant(run.status)}>{run.status}</Badge>
              <span className="text-xs text-[var(--color-text-muted)]">
                {run.attempts} attempt{run.attempts !== 1 ? 's' : ''}
              </span>
            </div>
            {run.error && (
              <p className="mt-1 text-xs text-[var(--color-error)]">{run.error}</p>
            )}
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">{formatDate(run.startedAt)}</span>
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

  const loadAutomation = useCallback(async (wsId: string, aId: string) => {
    if (!wsId || !aId) return;
    setLoading(true);
    setError(null);
    setAccessError(null);
    try {
      const a = await getAutomation(wsId, aId);
      setAutomation(a);
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
  }, []);

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
      setAutomation(updated);
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
      setAutomation(updated);
    } catch (err) {
      setToggleError(err instanceof ApiRequestError ? err.message : 'Could not update.');
    } finally {
      setToggling(false);
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
              <dd className="mt-0.5">
                <pre className="rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] p-2 text-xs text-[var(--color-text-primary)] overflow-auto">
                  {JSON.stringify(automation.actionConfig, null, 2)}
                </pre>
              </dd>
            </div>
            {automation.condition && Object.keys(automation.condition).length > 0 && (
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">Condition</dt>
                <dd className="mt-0.5">
                  <pre className="rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] p-2 text-xs text-[var(--color-text-primary)] overflow-auto">
                    {JSON.stringify(automation.condition, null, 2)}
                  </pre>
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
        </Card>

        {/* Run history */}
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-[var(--color-text-primary)]">
            Recent runs (last 10)
          </h2>
          <RunHistory runs={automation.runs ?? []} />
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
