'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  type Automation,
} from '@/services/automations';

// ─── Metadata ─────────────────────────────────────────────────────────────────

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

const ACTION_CONFIG_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; required?: boolean; helperText?: string }>> = {
  SEND_NOTIFICATION: [
    { key: 'userIds', label: 'Recipient user IDs', placeholder: 'Comma-separated user IDs (or use userId)', required: true },
    { key: 'title', label: 'Notification title', placeholder: 'Notification title', required: true },
    { key: 'body', label: 'Message (optional)', placeholder: 'Notification body' },
    { key: 'link', label: 'Link (optional)', placeholder: '/app/...' },
  ],
  CREATE_TASK: [
    { key: 'projectId', label: 'Project ID', placeholder: 'Target project UUID', required: true },
    { key: 'title', label: 'Task title', placeholder: 'New task title', required: true },
    { key: 'description', label: 'Description (optional)', placeholder: 'Task description' },
    { key: 'priority', label: 'Priority (optional)', placeholder: 'LOW, MEDIUM, HIGH, URGENT' },
    { key: 'assigneeIds', label: 'Assignee IDs (optional)', placeholder: 'Comma-separated user IDs' },
  ],
  SEND_WEBHOOK: [
    { key: 'url', label: 'Webhook URL', placeholder: 'https://example.com/webhook', required: true, helperText: 'Must use HTTPS.' },
    { key: 'secret', label: 'Secret (optional)', placeholder: 'Signing secret' },
  ],
  SET_FIELD: [
    { key: 'field', label: 'Field', placeholder: 'status, priority, startDate, or dueDate', required: true },
    { key: 'value', label: 'Value', placeholder: 'New field value', required: true },
  ],
  ASSIGN: [
    { key: 'userIds', label: 'User IDs', placeholder: 'Comma-separated user IDs (or userId/assigneeId)', required: true },
  ],
  POST_MESSAGE: [
    { key: 'channelId', label: 'Channel ID', placeholder: 'Target channel UUID', required: true },
    { key: 'body', label: 'Message body', placeholder: 'Message to post', required: true },
  ],
};

// ─── Create form ──────────────────────────────────────────────────────────────

interface ConditionRow {
  key: string;
  value: string;
}

interface CreateFormState {
  name: string;
  trigger: string;
  action: string;
  actionConfig: Record<string, string>;
  condition: ConditionRow[];
  maxRetries: number;
  enabled: boolean;
}

const MAX_RETRIES_LIMIT = 10;

interface CreateFormProps {
  saving: boolean;
  error: string | null;
  onSubmit: (state: CreateFormState) => void;
  onCancel: () => void;
}

function CreateAutomationForm({ saving, error, onSubmit, onCancel }: CreateFormProps) {
  const [form, setForm] = useState<CreateFormState>({
    name: '',
    trigger: 'EVENT_TASK_CREATED',
    action: 'SEND_NOTIFICATION',
    actionConfig: {},
    condition: [],
    maxRetries: 3,
    enabled: true,
  });

  const configFields = ACTION_CONFIG_FIELDS[form.action] ?? [];

  function setField(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      actionConfig: { ...prev.actionConfig, [key]: value },
    }));
  }

  function addCondition() {
    setForm((prev) => ({
      ...prev,
      condition: [...prev.condition, { key: '', value: '' }],
    }));
  }

  function updateCondition(index: number, patch: Partial<ConditionRow>) {
    setForm((prev) => ({
      ...prev,
      condition: prev.condition.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function removeCondition(index: number) {
    setForm((prev) => ({
      ...prev,
      condition: prev.condition.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <Input
        id="ca-name"
        label="Automation name"
        required
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        maxLength={200}
        autoFocus
      />

      <Select
        id="ca-trigger"
        label="Trigger"
        value={form.trigger}
        onChange={(e) => setForm((p) => ({ ...p, trigger: e.target.value }))}
        options={Object.entries(TRIGGER_LABELS).map(([value, label]) => ({ value, label }))}
      />

      <Select
        id="ca-action"
        label="Action"
        value={form.action}
        onChange={(e) => setForm((p) => ({
          ...p,
          action: e.target.value,
          actionConfig: {},
        }))}
        options={Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))}
      />

      {configFields.map((field) => (
        <Input
          key={field.key}
          id={`ca-config-${field.key}`}
          label={field.label}
          required={field.required}
          value={form.actionConfig[field.key] ?? ''}
          onChange={(e) => setField(field.key, e.target.value)}
          placeholder={field.placeholder}
          helperText={field.helperText}
        />
      ))}

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Conditions (optional)</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              The automation only runs when every condition matches. Leave empty to always run.
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={addCondition}>
            Add condition
          </Button>
        </div>

        {form.condition.length > 0 && (
          <div className="mt-3 space-y-2">
            {form.condition.map((row, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    id={`ca-condition-key-${index}`}
                    label="Condition field"
                    srOnlyLabel
                    value={row.key}
                    onChange={(e) => updateCondition(index, { key: e.target.value })}
                    placeholder="Field (e.g. priority)"
                    maxLength={100}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Input
                    id={`ca-condition-value-${index}`}
                    label="Condition value"
                    srOnlyLabel
                    value={row.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="Value (e.g. HIGH)"
                    maxLength={200}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => removeCondition(index)}
                  aria-label={`Remove condition ${index + 1}`}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Input
        id="ca-max-retries"
        label="Max retries"
        type="number"
        min={0}
        max={MAX_RETRIES_LIMIT}
        step={1}
        value={String(form.maxRetries)}
        onChange={(e) => {
          const next = Number(e.target.value);
          setForm((p) => ({
            ...p,
            maxRetries: Number.isFinite(next)
              ? Math.min(MAX_RETRIES_LIMIT, Math.max(0, Math.trunc(next)))
              : 0,
          }));
        }}
        helperText="How many times a failed run is retried (0–10)."
      />

      <Checkbox
        id="ca-enabled"
        label="Enable immediately"
        checked={form.enabled}
        onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={saving} disabled={saving}>Create automation</Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Automation card ──────────────────────────────────────────────────────────

interface AutomationCardProps {
  automation: Automation;
  onToggle: (automation: Automation) => void;
  onDelete: (automation: Automation) => void;
  toggling: boolean;
}

function AutomationCard({ automation, onToggle, onDelete, toggling }: AutomationCardProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/automations/${automation.id}`}
              className="truncate font-medium text-[var(--color-text-primary)] hover:underline"
            >
              {automation.name}
            </Link>
            <Badge variant={automation.enabled ? 'success' : 'default'}>
              {automation.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
            <span>
              <span className="font-medium text-[var(--color-text-secondary)]">Trigger: </span>
              {TRIGGER_LABELS[automation.trigger] ?? automation.trigger}
            </span>
            <span>
              <span className="font-medium text-[var(--color-text-secondary)]">Action: </span>
              {ACTION_LABELS[automation.action] ?? automation.action}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <Link href={`/app/automations/${automation.id}`}>
            <Button size="sm" variant="secondary">View</Button>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onToggle(automation)}
            loading={toggling}
            disabled={toggling}
          >
            {automation.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onDelete(automation)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Automation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const latestLoad = useRef(0);

  const load = useCallback(async (wsId: string) => {
    if (!wsId) return;
    const seq = ++latestLoad.current;
    setLoading(true);
    setError(null);
    setAccessError(null);
    try {
      const items = await listAutomations(wsId);
      if (seq !== latestLoad.current) return;
      setAutomations(items);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        setAccessError(err.status);
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Could not load automations.');
      }
    } finally {
      if (seq === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load(workspaceId) : undefined);
    return () => { active = false; };
  }, [workspaceId, load]);

  async function handleCreate(state: CreateFormState) {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    const condition = Object.fromEntries(
      state.condition
        .map((row) => [row.key.trim(), row.value.trim()] as const)
        .filter(([key]) => key.length > 0),
    );
    const actionConfig = Object.fromEntries(
      Object.entries(state.actionConfig)
        .map(([key, value]) => [key, value.trim()] as const)
        .filter(([, value]) => value.length > 0),
    );
    try {
      const created = await createAutomation(workspaceId, {
        name: state.name.trim(),
        trigger: state.trigger,
        action: state.action,
        actionConfig,
        condition: Object.keys(condition).length > 0 ? condition : null,
        maxRetries: state.maxRetries,
        enabled: state.enabled,
      });
      setAutomations((prev) => [created, ...prev]);
      setCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof ApiRequestError ? err.message : 'Could not create automation.');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(automation: Automation) {
    setTogglingId(automation.id);
    setToggleError(null);
    try {
      const updated = await updateAutomation(workspaceId, automation.id, {
        enabled: !automation.enabled,
      });
      setAutomations((prev) => prev.map((a) => a.id === automation.id ? updated : a));
    } catch (err) {
      setToggleError(err instanceof ApiRequestError ? err.message : 'Could not update automation.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAutomation(workspaceId, deleteTarget.id);
      setAutomations((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Could not delete automation.');
      setDeleting(false);
    }
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Automations" />
        <EmptyState title="No workspace selected" description="Select a workspace to view automations." />
      </PageContainer>
    );
  }

  if (accessError) {
    return (
      <PageContainer>
        <PageHeader title="Automations" />
        <AccessState status={accessError as 401 | 403} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Automations"
        description="Automate repetitive tasks with event-driven workflows."
        actions={
          <Button onClick={() => { setCreateOpen(true); setCreateError(null); }}>
            New automation
          </Button>
        }
      />

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => void load(workspaceId)}>
            Retry
          </Button>
        </Alert>
      )}
      {toggleError && <Alert variant="error" className="mb-3">{toggleError}</Alert>}
      {deleteError && <Alert variant="error" className="mb-3">{deleteError}</Alert>}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading automations">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : automations.length === 0 ? (
        <EmptyState
          title="No automations yet"
          description="Create your first automation to trigger actions based on workspace events."
        />
      ) : (
        <div className="space-y-3">
          {automations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onToggle={(a) => { void handleToggle(a); }}
              onDelete={setDeleteTarget}
              toggling={togglingId === automation.id}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(null); }}
        title="New automation"
        maxWidth="md"
      >
        <CreateAutomationForm
          saving={creating}
          error={createError}
          onSubmit={(s) => { void handleCreate(s); }}
          onCancel={() => { setCreateOpen(false); setCreateError(null); }}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete automation"
        description={`Delete "${deleteTarget?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { void handleDelete(); }}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        loading={deleting}
      />
    </PageContainer>
  );
}
