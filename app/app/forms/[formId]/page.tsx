'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import {
  getForm,
  updateForm,
  addFormField,
  listFormResponses,
  submitFormResponse,
  type FormDetail,
  type FormField,
  type FormFieldInput,
  type FormFieldType,
  type FormResponse,
  type FormStatus,
} from '@/services/forms';

// ─── Field type helpers ────────────────────────────────────────────────────────

const FIELD_TYPE_OPTIONS: Array<{ value: FormFieldType; label: string }> = [
  { value: 'TEXT', label: 'Short text' },
  { value: 'TEXTAREA', label: 'Long text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SELECT', label: 'Dropdown (single)' },
  { value: 'MULTISELECT', label: 'Dropdown (multiple)' },
  { value: 'RADIO', label: 'Radio buttons' },
  { value: 'CHECKBOX', label: 'Checkboxes' },
  { value: 'DATE', label: 'Date' },
  { value: 'RATING', label: 'Rating (1–5)' },
  { value: 'SCALE', label: 'Scale (1–10)' },
];

const HAS_OPTIONS: FormFieldType[] = ['SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX'];

function statusVariant(status: FormStatus): 'default' | 'success' | 'warning' | 'error' {
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

// ─── Add field form ───────────────────────────────────────────────────────────

interface AddFieldFormProps {
  saving: boolean;
  error: string | null;
  onSubmit: (input: FormFieldInput) => void;
  onCancel: () => void;
}

function AddFieldForm({ saving, error, onSubmit, onCancel }: AddFieldFormProps) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FormFieldType>('TEXT');
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [optionsStr, setOptionsStr] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const options = HAS_OPTIONS.includes(type)
      ? optionsStr.split('\n').map((o) => o.trim()).filter(Boolean)
      : [];
    onSubmit({
      label: label.trim(),
      type,
      required,
      placeholder: placeholder.trim() || null,
      options,
      position: 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <Input
        id="af-label"
        label="Question / label"
        required
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        maxLength={200}
        autoFocus
      />

      <Select
        id="af-type"
        label="Field type"
        value={type}
        onChange={(e) => setType(e.target.value as FormFieldType)}
        options={FIELD_TYPE_OPTIONS}
      />

      {HAS_OPTIONS.includes(type) && (
        <Textarea
          id="af-options"
          label="Options (one per line)"
          value={optionsStr}
          onChange={(e) => setOptionsStr(e.target.value)}
          rows={4}
          placeholder="Option A&#10;Option B&#10;Option C"
        />
      )}

      {!HAS_OPTIONS.includes(type) && type !== 'DATE' && type !== 'RATING' && type !== 'SCALE' && type !== 'CHECKBOX' && (
        <Input
          id="af-placeholder"
          label="Placeholder (optional)"
          value={placeholder}
          onChange={(e) => setPlaceholder(e.target.value)}
          maxLength={200}
        />
      )}

      <Checkbox
        id="af-required"
        label="Required field"
        checked={required}
        onChange={(e) => setRequired(e.target.checked)}
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={saving} disabled={saving}>Add field</Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Field list item ──────────────────────────────────────────────────────────

function FieldItem({ field }: { field: FormField }) {
  const typeLabel = FIELD_TYPE_OPTIONS.find((o) => o.value === field.type)?.label ?? field.type;

  return (
    <div className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{field.label}</span>
          {field.required && <Badge variant="warning">Required</Badge>}
          <Badge variant="outline">{typeLabel}</Badge>
        </div>
        {field.options.length > 0 && (
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Options: {field.options.join(', ')}
          </p>
        )}
        {field.placeholder && (
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Placeholder: {field.placeholder}
          </p>
        )}
      </div>
      <span className="shrink-0 text-xs text-[var(--color-text-muted)]">#{field.position + 1}</span>
    </div>
  );
}

// ─── Responses panel ──────────────────────────────────────────────────────────

interface ResponsesPanelProps {
  workspaceId: string;
  formId: string;
  fields: FormField[];
}

function ResponsesPanel({ workspaceId, formId, fields }: ResponsesPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaded = useRef(false);

  const load = useCallback(
    async (cursor?: string, append = false) => {
      if (append) setLoadingMore(true);
      else { setLoading(true); setError(null); }
      try {
        const result = await listFormResponses(workspaceId, formId, { limit: 25, cursor });
        if (append) setResponses((prev) => [...prev, ...result.items]);
        else setResponses(result.items);
        setNextCursor(result.nextCursor);
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : 'Could not load responses.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [workspaceId, formId],
  );

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      void load();
    }
  }, [load]);

  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading responses">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        {error}
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => void load()}>Retry</Button>
      </Alert>
    );
  }

  if (responses.length === 0) {
    return <EmptyState title="No responses yet" description="Responses will appear here once the form is published and submitted." />;
  }

  return (
    <div className="space-y-4">
      {responses.map((response) => (
        <Card key={response.id} className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              Response — {formatDate(response.createdAt)}
            </span>
          </div>
          <ul className="space-y-2">
            {response.answers.map((answer, idx) => {
              const field = fieldMap.get(answer.fieldId);
              return (
                <li key={idx} className="text-sm">
                  <span className="font-medium text-[var(--color-text-secondary)]">
                    {field?.label ?? answer.fieldId}:{' '}
                  </span>
                  <span className="text-[var(--color-text-primary)]">{answer.value || '—'}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      {nextCursor && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => void load(nextCursor, true)}
          loading={loadingMore}
          disabled={loadingMore}
        >
          Load more responses
        </Button>
      )}
    </div>
  );
}

// ─── Preview panel ────────────────────────────────────────────────────────────

interface PreviewPanelProps {
  workspaceId: string;
  form: FormDetail;
  onSubmitted: () => void;
}

function PreviewPanel({ workspaceId, form, onSubmitted }: PreviewPanelProps) {
  const sortedFields = [...form.fields].sort((a, b) => a.position - b.position);
  const [values, setValues] = useState<Record<string, string>>({});
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const acceptingResponses = form.status === 'PUBLISHED';

  function answerFor(field: FormField): string {
    return values[field.id] ?? (multiValues[field.id] ?? []).join(', ');
  }

  function setValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setSuccess(false);
  }

  function toggleMulti(fieldId: string, option: string, checked: boolean) {
    setMultiValues((prev) => {
      const current = prev[fieldId] ?? [];
      const next = checked ? [...current, option] : current.filter((value) => value !== option);
      return { ...prev, [fieldId]: next };
    });
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !acceptingResponses) return;
    const missing = sortedFields.filter((field) => field.required && !answerFor(field).trim());
    if (missing.length > 0) {
      setError(`Complete required field${missing.length > 1 ? 's' : ''}: ${missing.map((f) => f.label).join(', ')}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await submitFormResponse(workspaceId, form.id, {
        answers: sortedFields
          .map((field) => ({ fieldId: field.id, value: answerFor(field).trim() }))
          .filter((answer) => answer.value.length > 0),
      });
      setValues({});
      setMultiValues({});
      setSuccess(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not submit the response.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sortedFields.length === 0) {
    return (
      <EmptyState
        title="Nothing to preview"
        description="Add fields to this form to preview and test it."
      />
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 border-b border-[var(--color-border)] pb-3">
        <h2 className="font-semibold text-[var(--color-text-primary)]">Preview</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {acceptingResponses
            ? 'Submit a test response using the published form. It is recorded like any other response.'
            : 'Preview the form as respondents will see it. Publishing is required before responses are accepted.'}
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">Response submitted.</Alert>}

        {sortedFields.map((field) => {
          const inputId = `preview-${field.id}`;
          const requiredMark = field.required ? ' *' : '';

          if (field.type === 'TEXTAREA') {
            return (
              <Textarea
                key={field.id}
                id={inputId}
                label={`${field.label}${requiredMark}`}
                value={values[field.id] ?? ''}
                placeholder={field.placeholder ?? undefined}
                onChange={(e) => setValue(field.id, e.target.value)}
                rows={4}
              />
            );
          }

          if (field.type === 'SELECT') {
            return (
              <Select
                key={field.id}
                id={inputId}
                label={`${field.label}${requiredMark}`}
                value={values[field.id] ?? ''}
                onChange={(e) => setValue(field.id, e.target.value)}
                options={[
                  { value: '', label: field.placeholder ?? 'Select an option' },
                  ...field.options.map((option) => ({ value: option, label: option })),
                ]}
              />
            );
          }

          if (field.type === 'RADIO') {
            return (
              <fieldset key={field.id} className="space-y-1.5">
                <legend className="text-sm font-medium text-[var(--color-text-primary)]">
                  {field.label}{requiredMark}
                </legend>
                {field.options.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                    <input
                      type="radio"
                      name={inputId}
                      value={option}
                      checked={(values[field.id] ?? '') === option}
                      onChange={() => setValue(field.id, option)}
                      className="accent-[var(--color-primary)]"
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            );
          }

          if (field.type === 'MULTISELECT' || field.type === 'CHECKBOX') {
            const selected = multiValues[field.id] ?? [];
            return (
              <fieldset key={field.id} className="space-y-1.5">
                <legend className="text-sm font-medium text-[var(--color-text-primary)]">
                  {field.label}{requiredMark}
                </legend>
                {field.options.map((option) => (
                  <Checkbox
                    key={option}
                    id={`${inputId}-${option}`}
                    label={option}
                    checked={selected.includes(option)}
                    onChange={(e) => toggleMulti(field.id, option, e.target.checked)}
                  />
                ))}
              </fieldset>
            );
          }

          if (field.type === 'RATING' || field.type === 'SCALE') {
            const max = field.type === 'RATING' ? 5 : 10;
            return (
              <Select
                key={field.id}
                id={inputId}
                label={`${field.label}${requiredMark}`}
                value={values[field.id] ?? ''}
                onChange={(e) => setValue(field.id, e.target.value)}
                options={[
                  { value: '', label: 'Select a value' },
                  ...Array.from({ length: max }, (_, index) => {
                    const value = String(index + 1);
                    return { value, label: value };
                  }),
                ]}
              />
            );
          }

          if (field.type === 'DATE') {
            return (
              <div key={field.id} className="flex flex-col gap-1">
                <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
                  {field.label}{requiredMark}
                </label>
                <input
                  id={inputId}
                  type="date"
                  value={values[field.id] ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
              </div>
            );
          }

          const inputType = field.type === 'NUMBER' ? 'number' : field.type === 'EMAIL' ? 'email' : 'text';
          return (
            <Input
              key={field.id}
              id={inputId}
              type={inputType}
              label={`${field.label}${requiredMark}`}
              value={values[field.id] ?? ''}
              placeholder={field.placeholder ?? undefined}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          );
        })}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" loading={submitting} disabled={!acceptingResponses || submitting}>
            Submit response
          </Button>
          {!acceptingResponses && (
            <span className="text-xs text-[var(--color-text-muted)]">
              Only published forms accept responses.
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────

interface SettingsPanelProps {
  workspaceId: string;
  form: FormDetail;
  currentUserId: string;
  onUpdated: (form: FormDetail) => void;
  onDeleted: () => void;
}

function SettingsPanel({
  workspaceId,
  form,
  currentUserId,
  onUpdated,
  onDeleted,
}: SettingsPanelProps) {
  const isCreator = form.createdById === currentUserId;

  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description ?? '');
  const [isPublic, setIsPublic] = useState(form.isPublic);
  const [status, setStatus] = useState<FormStatus>(form.status);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isCreator || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await updateForm(workspaceId, form.id, {
        title: title.trim(),
        description: description.trim() || null,
        isPublic,
        status,
      });
      onUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isCreator || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { deleteForm } = await import('@/services/forms');
      await deleteForm(workspaceId, form.id);
      onDeleted();
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Could not delete form.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form onSubmit={(e) => { void handleSave(e); }} className="space-y-4">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Form settings</h3>
          {saveError && <Alert variant="error">{saveError}</Alert>}
          {saveSuccess && <Alert variant="success">Settings saved.</Alert>}

          <Input
            id="fs-title"
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            disabled={!isCreator}
          />

          <Textarea
            id="fs-description"
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={5000}
            disabled={!isCreator}
          />

          <Select
            id="fs-status"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as FormStatus)}
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'CLOSED', label: 'Closed' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            disabled={!isCreator}
          />

          <Checkbox
            id="fs-public"
            label="Publicly accessible (no workspace login required)"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={!isCreator}
          />

          {isCreator && (
            <Button type="submit" loading={saving} disabled={saving}>
              Save settings
            </Button>
          )}
        </form>
      </Card>

      {isCreator && (
        <Card className="border-[var(--color-error)] p-5">
          <h3 className="font-semibold text-[var(--color-error)]">Danger zone</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Deleting this form is permanent and cannot be undone.
          </p>
          {deleteError && <Alert variant="error" className="mt-3">{deleteError}</Alert>}
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => setConfirmDelete(true)}
          >
            Delete form
          </Button>

          <ConfirmDialog
            open={confirmDelete}
            title="Delete form"
            description={`Permanently delete "${form.title}"? All responses will be lost.`}
            confirmLabel="Delete"
            destructive
            onConfirm={() => { void handleDelete(); }}
            onClose={() => setConfirmDelete(false)}
            loading={deleting}
          />
        </Card>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormDetailPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const { activeWorkspace, user } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const currentUserId = user?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormDetail | null>(null);

  const [activeTab, setActiveTab] = useState('fields');

  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [addFieldError, setAddFieldError] = useState<string | null>(null);

  const prevWorkspaceId = useRef(workspaceId);
  useEffect(() => {
    if (prevWorkspaceId.current && workspaceId && prevWorkspaceId.current !== workspaceId) {
      router.push('/app/forms');
    }
    prevWorkspaceId.current = workspaceId;
  }, [workspaceId, router]);

  const loadForm = useCallback(async (wsId: string, fId: string) => {
    if (!wsId || !fId) return;
    setLoading(true);
    setError(null);
    setAccessError(null);
    try {
      setForm(await getForm(wsId, fId));
    } catch (err) {
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        setAccessError(err.status);
      } else if (err instanceof ApiRequestError && err.status === 404) {
        setError('Form not found.');
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Could not load form.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? loadForm(workspaceId, formId) : undefined);
    return () => { active = false; };
  }, [workspaceId, formId, loadForm]);

  async function handleAddField(input: FormFieldInput) {
    if (!form || addingField) return;
    setAddingField(true);
    setAddFieldError(null);
    try {
      const newField = await addFormField(workspaceId, formId, input);
      setForm((prev) =>
        prev ? { ...prev, fields: [...prev.fields, newField] } : prev,
      );
      setAddFieldOpen(false);
    } catch (err) {
      setAddFieldError(err instanceof ApiRequestError ? err.message : 'Could not add field.');
    } finally {
      setAddingField(false);
    }
  }

  const isCreator = form?.createdById === currentUserId;

  // ── Render ──

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Form" />
        <Alert variant="error">No workspace selected.</Alert>
      </PageContainer>
    );
  }

  if (accessError) {
    return (
      <PageContainer>
        <PageHeader title="Form" />
        <AccessState status={accessError as 401 | 403} />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Form" />
        <div className="space-y-4" aria-busy="true" aria-label="Loading form">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !form) {
    return (
      <PageContainer>
        <PageHeader title="Form" />
        <Alert variant="error">
          {error ?? 'Form not found.'}
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => void loadForm(workspaceId, formId)}
          >
            Retry
          </Button>
        </Alert>
      </PageContainer>
    );
  }

  const tabs = [
    { id: 'fields', label: `Fields (${form.fields.length})` },
    { id: 'responses', label: `Responses (${form._count.responses})` },
    { id: 'preview', label: 'Preview' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={form.title}
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
            <Link href="/app/forms" className="hover:underline">Forms</Link>
            <span>/</span>
            <span className="text-[var(--color-text-secondary)]">{form.title}</span>
          </nav>
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(form.status)}>{form.status}</Badge>
            {form.isPublic && <Badge variant="outline">Public</Badge>}
          </div>
        }
      />

      {form.description && (
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">{form.description}</p>
      )}

      {/* Manual tab bar */}
      <div
        role="tablist"
        aria-label="Form sections"
        className="mb-4 flex gap-0 overflow-x-auto border-b border-[var(--color-border)]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]',
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'fields' && (
        <div className="space-y-4">
          {isCreator && form.status === 'DRAFT' && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => { setAddFieldOpen(true); setAddFieldError(null); }}
              >
                Add field
              </Button>
            </div>
          )}

          {form.fields.length === 0 ? (
            <EmptyState
              title="No fields yet"
              description={
                isCreator && form.status === 'DRAFT'
                  ? 'Add fields to build your form.'
                  : 'This form has no fields.'
              }
            />
          ) : (
            <div className="space-y-2">
              {form.fields.map((field) => (
                <FieldItem key={field.id} field={field} />
              ))}
            </div>
          )}

          {!isCreator || form.status !== 'DRAFT' ? null : (
            <p className="text-xs text-[var(--color-text-muted)]">
              Fields can only be added while the form is in Draft status.
            </p>
          )}
        </div>
      )}

      {activeTab === 'responses' && (
        <ResponsesPanel
          workspaceId={workspaceId}
          formId={formId}
          fields={form.fields}
        />
      )}

      {activeTab === 'preview' && (
        <PreviewPanel
          workspaceId={workspaceId}
          form={form}
          onSubmitted={() => setForm((prev) => prev
            ? { ...prev, _count: { responses: prev._count.responses + 1 } }
            : prev)}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPanel
          workspaceId={workspaceId}
          form={form}
          currentUserId={currentUserId}
          onUpdated={(updated) => setForm(updated)}
          onDeleted={() => router.push('/app/forms')}
        />
      )}

      {/* Add field modal */}
      <Modal
        open={addFieldOpen}
        onClose={() => { setAddFieldOpen(false); setAddFieldError(null); }}
        title="Add field"
        maxWidth="md"
      >
        <AddFieldForm
          saving={addingField}
          error={addFieldError}
          onSubmit={(input) => { void handleAddField(input); }}
          onCancel={() => { setAddFieldOpen(false); setAddFieldError(null); }}
        />
      </Modal>
    </PageContainer>
  );
}
