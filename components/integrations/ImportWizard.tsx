'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiRequestError } from '@/lib/api';
import {
  confirmImport,
  createImportDryRun,
  getImportJob,
  listImports,
  type ImportJobStatus,
  type ImportJobSummary,
  type ImportPreview,
  type ImportSource,
} from '@/services/imports';

const SOURCE_OPTIONS: Array<{ value: ImportSource; label: string; description: string }> = [
  { value: 'CSV', label: 'CSV', description: 'Upload a CSV export with project/task columns.' },
  { value: 'CLICKUP', label: 'ClickUp', description: 'Import from ClickUp using an API token and options.' },
  { value: 'TRELLO', label: 'Trello', description: 'Import from Trello using an API token and options.' },
];

const TERMINAL_STATUSES: ImportJobStatus[] = ['SUCCEEDED', 'FAILED'];

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildErrorReport(job: ImportJobSummary): string {
  const counts = job.report?.counts ?? { projects: 0, tasks: 0, comments: 0, users: 0 };
  const warnings = job.report?.warnings ?? [];
  const lines: string[] = [];
  lines.push(`Import report: ${job.id}`);
  lines.push(`Source: ${job.source}`);
  lines.push(`Status: ${job.status}`);
  lines.push(`Workspace: ${job.workspaceId}`);
  lines.push(`Created: ${job.createdAt}`);
  if (job.startedAt) lines.push(`Started: ${job.startedAt}`);
  if (job.completedAt) lines.push(`Completed: ${job.completedAt}`);
  lines.push('');
  if (job.lastError) {
    lines.push('Last error:');
    lines.push(job.lastError);
    lines.push('');
  }
  lines.push('Counts:');
  lines.push(`- projects: ${counts.projects}`);
  lines.push(`- tasks: ${counts.tasks}`);
  lines.push(`- comments: ${counts.comments}`);
  lines.push(`- users: ${counts.users}`);
  lines.push('');
  lines.push('Warnings / errors:');
  if (warnings.length === 0) {
    lines.push('- None');
  } else {
    for (const warning of warnings) lines.push(`- ${warning}`);
  }
  return `${lines.join('\n')}\n`;
}

function statusVariant(status: ImportJobStatus): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FAILED') return 'error';
  if (status === 'RUNNING' || status === 'QUEUED') return 'warning';
  return 'default';
}

interface Props {
  workspaceId: string;
  canImport: boolean;
}

export function ImportWizard({ workspaceId, canImport }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [source, setSource] = useState<ImportSource>('CSV');
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState('');
  const [workspaceExternalId, setWorkspaceExternalId] = useState('');
  const [boardIds, setBoardIds] = useState('');
  const [spaceIds, setSpaceIds] = useState('');
  const [userMappingText, setUserMappingText] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [job, setJob] = useState<ImportJobSummary | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<ImportJobSummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canRunPreview = canImport && (source !== 'CSV' || csvText.trim().length > 0);

  const parsedUserMapping = useMemo(() => {
    const mapping: Record<string, string> = {};
    for (const line of userMappingText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [from, to] = trimmed.split(/[:=,]/).map((s) => s.trim());
      if (from && to) mapping[from.toLowerCase()] = to.toLowerCase();
    }
    return mapping;
  }, [userMappingText]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const jobs = await listImports(workspaceId, 10);
        if (active) setRecentJobs(Array.isArray(jobs) ? jobs : []);
      } catch {
        // non-blocking
      }
    })();
    return () => { active = false; };
  }, [workspaceId]);

  async function refreshRecent() {
    setRecentLoading(true);
    try {
      const jobs = await listImports(workspaceId, 10);
      setRecentJobs(Array.isArray(jobs) ? jobs : []);
    } catch {
      // non-blocking
    } finally {
      setRecentLoading(false);
    }
  }

  useEffect(() => {
    if (!importId) return;
    if (job && TERMINAL_STATUSES.includes(job.status)) return;

    const poll = async () => {
      try {
        const latest = await getImportJob(importId);
        setJob(latest);
        setJobError(null);
      } catch (err) {
        setJobError(err instanceof ApiRequestError ? err.message : 'Could not refresh import status.');
      }
    };

    void poll();
    pollRef.current = setInterval(() => { void poll(); }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [importId, job]);

  async function handleCsvUpload(file: File | null) {
    if (!file) return;
    setCsvFileName(file.name);
    const text = await file.text();
    setCsvText(text);
  }

  function buildOptions(): Record<string, unknown> {
    const options: Record<string, unknown> = {};
    if (workspaceExternalId.trim()) options.workspaceId = workspaceExternalId.trim();
    if (boardIds.trim()) options.boardIds = boardIds.split(',').map((s) => s.trim()).filter(Boolean);
    if (spaceIds.trim()) options.spaceIds = spaceIds.split(',').map((s) => s.trim()).filter(Boolean);
    if (Object.keys(parsedUserMapping).length > 0) options.userMapping = parsedUserMapping;
    return options;
  }

  async function handleDryRun() {
    if (!canImport) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    setImportId(null);
    setJob(null);
    setConfirmChecked(false);
    try {
      const result = await createImportDryRun({
        workspaceId,
        source,
        csv: source === 'CSV' ? csvText : undefined,
        apiToken: source !== 'CSV' && apiToken.trim() ? apiToken.trim() : undefined,
        options: buildOptions(),
      });
      setPreview(result.preview);
      setImportId(result.id);
      setStep(3);
    } catch (err) {
      setPreviewError(err instanceof ApiRequestError ? err.message : 'Could not create import preview.');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirm() {
    if (!importId || !confirmChecked || !preview) return;
    setConfirming(true);
    setJobError(null);
    try {
      const key = `${importId}:confirm`;
      const confirmed = await confirmImport(importId, key);
      setJob(confirmed);
      setStep(4);
      void refreshRecent();
    } catch (err) {
      setJobError(err instanceof ApiRequestError ? err.message : 'Could not confirm import.');
    } finally {
      setConfirming(false);
    }
  }

  function resetWizard() {
    setStep(1);
    setPreview(null);
    setPreviewError(null);
    setImportId(null);
    setConfirmChecked(false);
    setJob(null);
    setJobError(null);
    setCsvText('');
    setCsvFileName(null);
  }

  if (!canImport) {
    return (
      <Card className="p-5">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Import wizard</h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Only workspace administrators can run imports. You can view import status if an administrator shares the results.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Import wizard</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Preview before importing. PITERON will never start an import without an explicit confirmation of the dry-run preview.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Badge variant={step >= 1 ? 'default' : 'outline'}>1. Source</Badge>
            <Badge variant={step >= 2 ? 'default' : 'outline'}>2. Mapping</Badge>
            <Badge variant={step >= 3 ? 'default' : 'outline'}>3. Preview</Badge>
            <Badge variant={step >= 4 ? 'default' : 'outline'}>4. Progress</Badge>
          </div>
        </div>

        {previewError && <Alert variant="error" className="mt-4">{previewError}</Alert>}

        {step === 1 && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSource(opt.value)}
                  className={[
                    'rounded-[var(--radius-md)] border p-4 text-left transition-colors',
                    source === opt.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40',
                  ].join(' ')}
                >
                  <p className="font-medium text-[var(--color-text-primary)]">{opt.label}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{opt.description}</p>
                </button>
              ))}
            </div>

            {source === 'CSV' ? (
              <div className="space-y-2">
                <label htmlFor="import-csv" className="text-sm font-medium text-[var(--color-text-primary)]">Upload CSV file</label>
                <input
                  id="import-csv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => { void handleCsvUpload(e.target.files?.[0] ?? null); }}
                  className="block w-full text-sm text-[var(--color-text-secondary)] file:mr-3 file:rounded-[var(--radius-md)] file:border file:border-[var(--color-border)] file:bg-[var(--color-surface)] file:px-3 file:py-2 file:text-sm file:font-medium"
                />
                {csvFileName && <p className="text-xs text-[var(--color-text-muted)]">Selected: {csvFileName} ({csvText.length} chars)</p>}
                <p className="text-xs text-[var(--color-text-muted)]">Expected columns can include project, title/name, description, assignee email, status, due date, and comment fields depending on the exporter.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="import-api-token"
                  label={`${source === 'CLICKUP' ? 'ClickUp' : 'Trello'} API token`}
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  helperText="Used only for this preview/import request."
                />
                {source === 'TRELLO' && (
                  <>
                    <Input id="import-trello-workspace" label="Trello workspace/org ID (optional)" value={workspaceExternalId} onChange={(e) => setWorkspaceExternalId(e.target.value)} />
                    <Input id="import-trello-boards" label="Board IDs (comma-separated, optional)" value={boardIds} onChange={(e) => setBoardIds(e.target.value)} />
                  </>
                )}
                {source === 'CLICKUP' && (
                  <>
                    <Input id="import-clickup-workspace" label="ClickUp team/workspace ID (optional)" value={workspaceExternalId} onChange={(e) => setWorkspaceExternalId(e.target.value)} />
                    <Input id="import-clickup-spaces" label="Space IDs (comma-separated, optional)" value={spaceIds} onChange={(e) => setSpaceIds(e.target.value)} />
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={source === 'CSV' && !csvText.trim()}>
                Continue to mapping
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="import-user-mapping" className="text-sm font-medium text-[var(--color-text-primary)]">Field / user mapping</label>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Map source user emails or identifiers to PITERON workspace member emails, one per line (for example: <code>alice@old.com=alice@piteron.com</code>). Unmapped users will be reported as warnings and left unassigned.
              </p>
              <textarea
                id="import-user-mapping"
                value={userMappingText}
                onChange={(e) => setUserMappingText(e.target.value)}
                rows={6}
                className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder={'source-user@example.com=member@example.com'}
              />
              {Object.keys(parsedUserMapping).length > 0 && (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{Object.keys(parsedUserMapping).length} mapping rule(s) will be sent with the preview.</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => { void handleDryRun(); }} loading={previewLoading} disabled={!canRunPreview || previewLoading}>
                Run dry-run preview
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 space-y-4">
            {!preview ? (
              <div className="space-y-2" aria-busy="true" aria-label="Loading preview">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <Alert variant="info">
                  Review this dry-run preview carefully. The import has <strong>not</strong> started. You must explicitly confirm to begin execution.
                </Alert>
                <div className="grid gap-3 sm:grid-cols-4">
                  {([
                    ['Projects', preview.counts.projects],
                    ['Tasks', preview.counts.tasks],
                    ['Comments', preview.counts.comments],
                    ['Users', preview.counts.users],
                  ] as const).map(([label, count]) => (
                    <Card key={label} className="p-3">
                      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{count}</p>
                    </Card>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Warnings ({preview.warnings.length})</p>
                  {preview.warnings.length === 0 ? (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">No warnings reported by the dry-run.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-[var(--color-text-secondary)]">
                      {preview.warnings.map((w, i) => (
                        <li key={`${i}-${w}`} className="rounded border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2">• {w}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <label className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                  <input
                    type="checkbox"
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    I have reviewed the preview counts and warnings and want to start this import into the current workspace.
                  </span>
                </label>
                {jobError && <Alert variant="error">{jobError}</Alert>}
                <div className="flex items-center justify-between gap-2">
                  <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={() => { void handleConfirm(); }} disabled={!confirmChecked || !importId || confirming} loading={confirming}>
                    Confirm and start import
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="mt-4 space-y-4">
            {jobError && <Alert variant="error">{jobError}</Alert>}
            {!job ? (
              <div className="space-y-2" aria-busy="true"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-20 w-full" /></div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">Import job</span>
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                  <span className="text-xs text-[var(--color-text-muted)]">ID: {job.id}</span>
                </div>
                {(job.status === 'QUEUED' || job.status === 'RUNNING') && (
                  <Alert variant="info">Import is {job.status.toLowerCase()}. Status updates automatically.</Alert>
                )}
                {job.status === 'SUCCEEDED' && <Alert variant="success">Import completed successfully.</Alert>}
                {job.status === 'FAILED' && <Alert variant="error">{job.lastError || 'Import failed. Download the error report for details.'}</Alert>}
                <div className="grid gap-3 sm:grid-cols-4">
                  {([
                    ['Projects', job.report?.counts?.projects ?? 0],
                    ['Tasks', job.report?.counts?.tasks ?? 0],
                    ['Comments', job.report?.counts?.comments ?? 0],
                    ['Users', job.report?.counts?.users ?? 0],
                  ] as const).map(([label, count]) => (
                    <Card key={label} className="p-3"><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{count}</p></Card>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Warnings / errors ({job.report?.warnings?.length ?? 0})</p>
                  {(job.report?.warnings?.length ?? 0) === 0 ? (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">No warnings reported.</p>
                  ) : (
                    <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm text-[var(--color-text-secondary)]">
                      {(job.report?.warnings ?? []).map((w, i) => (<li key={`${i}-${w}`} className="rounded border border-[var(--color-border)] px-3 py-2">• {w}</li>))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => downloadText(`import-${job.id}-report.txt`, buildErrorReport(job))}>
                    Download error/report list
                  </Button>
                  <Button variant="secondary" onClick={resetWizard}>Start new import</Button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Recent imports</h4>
          <Button variant="secondary" size="sm" onClick={() => { void refreshRecent(); }} loading={recentLoading}>Refresh</Button>
        </div>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No import jobs found for this workspace yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentJobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{j.source}</span>
                    <Badge variant={statusVariant(j.status)}>{j.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{new Date(j.createdAt).toLocaleString()} · {j.report?.counts?.projects ?? 0} projects · {j.report?.counts?.tasks ?? 0} tasks</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setImportId(j.id); setJob(j); setPreview(j.report); setStep(4); }}>
                    View
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => downloadText(`import-${j.id}-report.txt`, buildErrorReport(j))}>
                    Report
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
