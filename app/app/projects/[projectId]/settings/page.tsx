'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  archiveProject,
  getProject,
  restoreProject,
  updateProject,
  type ProjectStatus,
  type ProjectSummary,
  type ProjectVisibility,
} from '@/services/projects';

const editSchema = z.object({
  name: z.string().trim().min(2).max(100),
  key: z.string().trim().min(2).max(16).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']),
  visibility: z.enum(['WORKSPACE', 'DEPARTMENT_TEAM', 'PRIVATE']),
});

// Visibility change warnings: when changing from one visibility to another, show a warning
const VISIBILITY_CHANGE_WARNINGS: Partial<Record<ProjectVisibility, Partial<Record<ProjectVisibility, string>>>> = {
  WORKSPACE: {
    DEPARTMENT_TEAM: 'Changing to department/team visibility will remove access for workspace members outside the linked team or department.',
    PRIVATE: 'Changing to private will remove access for all workspace members who are not explicitly added as project members.',
  },
  DEPARTMENT_TEAM: {
    WORKSPACE: 'Changing to organisation-wide will grant all workspace members access to this project.',
    PRIVATE: 'Changing to private will remove access for team/department members who are not explicitly added.',
  },
  PRIVATE: {
    WORKSPACE: 'Changing to organisation-wide will grant all workspace members access to this project.',
    DEPARTMENT_TEAM: 'Changing to department/team will grant access to team/department members.',
  },
};

function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action. Project manager permission is required.';
  if (cause.status === 409) return cause.message;
  return cause.message;
}

export default function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
  const { activeWorkspace } = useWorkspaceContext();
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [visibility, setVisibility] = useState<ProjectVisibility>('WORKSPACE');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Visibility change confirmation
  const [pendingVisibility, setPendingVisibility] = useState<ProjectVisibility | null>(null);
  const [visibilityWarning, setVisibilityWarning] = useState('');

  // Archive / restore
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true); setError(null); setAccessStatus(null);
    try {
      const data = await getProject(activeWorkspace.id, params.projectId);
      setProject(data);
      setName(data.name);
      setKey(data.key);
      setDescription(data.description ?? '');
      setStatus(data.status === 'ARCHIVED' ? 'ACTIVE' : data.status);
      setVisibility(data.visibility);
    } catch (cause) {
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else if (cause instanceof ApiRequestError && cause.status === 404) {
        setError('This project is not available or you do not have access.');
      } else {
        setError(requestError(cause, 'Project settings could not be loaded.'));
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, params.projectId]);

  useEffect(() => { let active = true; void Promise.resolve().then(() => active ? load() : undefined); return () => { active = false; }; }, [load]);

  function handleVisibilityChange(newVisibility: ProjectVisibility) {
    if (!project) return;
    const warning = VISIBILITY_CHANGE_WARNINGS[project.visibility]?.[newVisibility];
    if (warning) {
      setPendingVisibility(newVisibility);
      setVisibilityWarning(warning);
    } else {
      setVisibility(newVisibility);
    }
  }

  function confirmVisibilityChange() {
    if (pendingVisibility) setVisibility(pendingVisibility);
    setPendingVisibility(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !project) return;
    const parsed = editSchema.safeParse({ name, key, description: description.trim() || undefined, status, visibility });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setFormErrors(errors);
      return;
    }
    setBusy(true); setError(null); setFormErrors({});
    try {
      const updated = await updateProject(activeWorkspace.id, project.id, {
        name: parsed.data.name,
        key: parsed.data.key,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        visibility: parsed.data.visibility,
      });
      setProject(updated);
      setNotice('Project settings saved.');
    } catch (cause) {
      setError(requestError(cause, 'Settings could not be saved.'));
    } finally { setBusy(false); }
  }

  async function handleArchive() {
    if (!activeWorkspace || !project) return;
    setBusy(true); setError(null);
    try {
      await archiveProject(activeWorkspace.id, project.id);
      setConfirmArchive(false);
      setNotice('Project archived.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Project could not be archived.')); }
    finally { setBusy(false); }
  }

  async function handleRestore() {
    if (!activeWorkspace || !project) return;
    setBusy(true); setError(null);
    try {
      await restoreProject(activeWorkspace.id, project.id);
      setConfirmRestore(false);
      setNotice('Project restored.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Project could not be restored.')); }
    finally { setBusy(false); }
  }

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading settings">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;
  if (!project) return <Alert variant="error">{error ?? 'Project not found.'}</Alert>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Project settings</h2>
      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      {/* Visibility notice */}
      {project.visibility === 'PRIVATE' && (
        <Alert variant="info" title="Private project">
          This project is private. Only explicitly added members can see it. Changing visibility will affect who has access.
        </Alert>
      )}

      <Card className="p-5">
        <form className="space-y-5" onSubmit={(event) => void handleSave(event)}>
          <Input
            id="settings-name"
            label="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={100}
            errorMessage={formErrors.name}
          />
          <Input
            id="settings-key"
            label="Project key"
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            required
            minLength={2}
            maxLength={16}
            errorMessage={formErrors.key}
            helperText="Short uppercase identifier used in task references."
          />
          <Textarea
            id="settings-description"
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
            rows={3}
          />
          <div>
            <Select
              id="settings-status"
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus)}
              options={[
                { value: 'PLANNING', label: 'Planning' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ON_HOLD', label: 'On hold' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
              helperText="Archived status is set using the Archive button below, not through this field."
            />
          </div>
          <div>
            <Select
              id="settings-visibility"
              label="Visibility"
              value={visibility}
              onChange={(event) => handleVisibilityChange(event.target.value as ProjectVisibility)}
              options={[
                { value: 'WORKSPACE', label: 'Organisation-wide' },
                { value: 'DEPARTMENT_TEAM', label: 'Department / team' },
                { value: 'PRIVATE', label: 'Private (invitation only)' },
              ]}
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]" aria-live="polite">
              Current: <Badge variant={visibility === 'WORKSPACE' ? 'success' : visibility === 'DEPARTMENT_TEAM' ? 'warning' : 'outline'} className="text-xs">
                {visibility === 'WORKSPACE' ? 'Organisation-wide' : visibility === 'DEPARTMENT_TEAM' ? 'Department / team' : 'Private'}
              </Badge>
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={busy}>Save settings</Button>
          </div>
        </form>
      </Card>

      {/* Archive / restore */}
      <Card className="p-5 border-[var(--color-warning)] border">
        <h3 className="font-semibold">Danger zone</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {project.status === 'ARCHIVED'
            ? 'This project is archived. Restore it to allow edits and activity again.'
            : 'Archiving hides the project from the default view. Existing data is preserved. The project can be restored.'}
        </p>
        <div className="mt-3">
          {project.status === 'ARCHIVED' ? (
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmRestore(true)}>
              Restore project
            </Button>
          ) : (
            <Button variant="destructive" disabled={busy} onClick={() => setConfirmArchive(true)}>
              Archive project
            </Button>
          )}
        </div>
      </Card>

      {/* Visibility change confirmation */}
      <ConfirmDialog
        open={Boolean(pendingVisibility)}
        onClose={() => setPendingVisibility(null)}
        onConfirm={confirmVisibilityChange}
        title="Change project visibility?"
        description={visibilityWarning}
        confirmLabel="Change visibility"
        destructive={pendingVisibility === 'PRIVATE'}
      />

      {/* Archive confirmation */}
      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => void handleArchive()}
        title="Archive project?"
        description={`Archive ${project.name}? The project will be hidden from the default list. All data is preserved and the project can be restored.`}
        confirmLabel="Archive project"
        destructive
        loading={busy}
      />

      {/* Restore confirmation */}
      <ConfirmDialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={() => void handleRestore()}
        title="Restore project?"
        description={`Restore ${project.name} to its previous status?`}
        confirmLabel="Restore project"
        loading={busy}
      />
    </div>
  );
}
