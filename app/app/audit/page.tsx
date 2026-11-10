'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { ApiRequestError } from '@/lib/api';
import { listWorkspaceMembers, type WorkspaceMember } from '@/services/workspaces';
import { listAuditLogs, type AuditLogEntry } from '@/services/audit';

// ─── Metadata ─────────────────────────────────────────────────────────────────

const TARGET_TYPES = [
  'Workspace', 'WorkspaceMembership', 'WorkspaceOwnershipTransfer', 'Invitation',
  'JoinRequest', 'Team', 'TeamMembership', 'Department', 'DepartmentMembership',
  'InstitutionGroup', 'InstitutionGroupMembership', 'Project', 'ProjectMembership',
  'Task', 'TaskAssignee', 'TaskDependency', 'Comment', 'Channel', 'ChannelMembership',
  'Message', 'CalendarEvent', 'Meeting', 'FileAttachment', 'Document',
  'DocumentComment', 'Form', 'Integration', 'Automation', 'PrivacyRequest',
  'Session', 'AuthProvider', 'User', 'UserProfile',
] as const;

const ACTION_CATEGORIES = [
  'workspace', 'task', 'project', 'team', 'institution', 'channel', 'message',
  'document', 'file', 'form', 'meeting', 'integration', 'automation',
] as const;

function actionLabel(action: string): string {
  return action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function exportCsv(entries: AuditLogEntry[], workspaceName: string): void {
  const header = ['Timestamp', 'Actor', 'Action', 'Resource type', 'Resource ID', 'Metadata'];
  const rows = entries.map((entry) => [
    entry.createdAt,
    entry.actor?.name ?? 'System',
    entry.action,
    entry.targetType,
    entry.targetId,
    entry.metadata ? JSON.stringify(entry.metadata) : '',
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nexus-audit-${workspaceName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const workspaceName = activeWorkspace?.name ?? 'workspace';

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<401 | 403 | null>(null);

  const [actionFilter, setActionFilter] = useState('');
  const [debouncedAction, setDebouncedAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [actorId, setActorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const latestLoad = useRef(0);

  // Debounce the free-text action search so typing does not spam the API.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAction(actionFilter.trim()), 300);
    return () => clearTimeout(timer);
  }, [actionFilter]);

  const load = useCallback(async (
    wsId: string,
    filters: { action?: string; targetType?: string; actorId?: string },
    cursor?: string,
    append = false,
  ) => {
    if (!wsId) return;
    const seq = ++latestLoad.current;
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); setAccessError(null); }
    try {
      const result = await listAuditLogs(wsId, {
        cursor,
        limit: 25,
        action: filters.action || undefined,
        targetType: filters.targetType || undefined,
        actorId: filters.actorId || undefined,
      });
      if (seq !== latestLoad.current) return;
      if (append) setEntries((prev) => [...prev, ...result.items]);
      else setEntries(result.items);
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        setAccessError(err.status);
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Could not load the audit log.');
      }
    } finally {
      if (seq === latestLoad.current) { setLoading(false); setLoadingMore(false); }
    }
  }, []);

  // Reload when the workspace or a server-side filter changes.
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active
      ? load(workspaceId, { action: debouncedAction, targetType, actorId })
      : undefined);
    return () => { active = false; };
  }, [workspaceId, debouncedAction, targetType, actorId, load]);

  // Members power the actor filter. A failure here must not block the log.
  useEffect(() => {
    let active = true;
    if (!workspaceId) return;
    void listWorkspaceMembers(workspaceId)
      .then((items) => { if (active) setMembers(items); })
      .catch(() => { if (active) setMembers([]); });
    return () => { active = false; };
  }, [workspaceId]);

  const visibleEntries = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    if (from === null && to === null) return entries;
    return entries.filter((entry) => {
      const time = new Date(entry.createdAt).getTime();
      if (from !== null && time < from) return false;
      if (to !== null && time > to) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo]);

  const targetTypeOptions = useMemo(() => {
    const seen = new Set<string>(TARGET_TYPES);
    for (const entry of entries) seen.add(entry.targetType);
    return [{ value: '', label: 'All resource types' }]
      .concat([...seen].sort().map((type) => ({ value: type, label: type })));
  }, [entries]);

  const actorOptions = useMemo(() => {
    return [{ value: '', label: 'All members' }]
      .concat(members.map((member) => ({ value: member.userId, label: member.name })));
  }, [members]);

  const hasFilters = Boolean(actionFilter || targetType || actorId || dateFrom || dateTo);

  function clearFilters() {
    setActionFilter('');
    setDebouncedAction('');
    setTargetType('');
    setActorId('');
    setDateFrom('');
    setDateTo('');
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Audit log" />
        <EmptyState
          title="No workspace selected"
          description="Select a company or institution workspace to inspect its audit log."
        />
      </PageContainer>
    );
  }

  if (accessError) {
    return (
      <PageContainer>
        <PageHeader title="Audit log" />
        <AccessState
          status={accessError}
          onRetry={accessError === 403 ? () => { void load(workspaceId, { action: debouncedAction, targetType, actorId }); } : undefined}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Audit log"
        description="A read-only record of important administrative activity in this workspace."
        actions={
          <Button
            variant="secondary"
            onClick={() => exportCsv(visibleEntries, workspaceName)}
            disabled={visibleEntries.length === 0}
          >
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mt-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            id="audit-action"
            label="Search actions"
            type="search"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="e.g. member_role_changed"
          />
          <Select
            id="audit-target-type"
            label="Resource type"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            options={targetTypeOptions}
          />
          <Select
            id="audit-actor"
            label="Member"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            options={actorOptions}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="audit-from" className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                From
              </label>
              <input
                id="audit-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label htmlFor="audit-to" className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                To
              </label>
              <input
                id="audit-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">
            Filter by action category:
          </span>
          {ACTION_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActionFilter(category)}
              className="rounded-[var(--radius-full)] border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              {category}
            </button>
          ))}
          {hasFilters && (
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {(dateFrom || dateTo) && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Date filters apply to entries already loaded. Use Load more to widen the range.
          </p>
        )}
      </Card>

      {/* Results */}
      <div className="mt-4 space-y-3">
        {error && (
          <Alert variant="error">
            {error}
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => { void load(workspaceId, { action: debouncedAction, targetType, actorId }); }}
            >
              Retry
            </Button>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading audit log">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : visibleEntries.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No matching audit entries' : 'No audit entries yet'}
            description={
              hasFilters
                ? 'Try widening your filters or clearing them to see more activity.'
                : 'Administrative activity will appear here as your workspace changes.'
            }
            action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : undefined}
          />
        ) : (
          <ul className="space-y-2" role="list" aria-label="Audit entries">
            {visibleEntries.map((entry) => {
              const expanded = expandedId === entry.id;
              const metadataEntries = entry.metadata ? Object.entries(entry.metadata) : [];
              return (
                <li
                  key={entry.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : entry.id)}
                    aria-expanded={expanded}
                    className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {actionLabel(entry.action)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        {entry.actor?.name ?? 'System'} · {entry.targetType}
                        <span className="hidden sm:inline"> · {entry.targetId}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline">{entry.action.split('.')[0]}</Badge>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatTimestamp(entry.createdAt)}
                      </span>
                      <span aria-hidden="true" className="text-xs text-[var(--color-text-muted)]">
                        {expanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-[var(--color-border)] px-4 py-3">
                      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div>
                          <dt className="font-medium text-[var(--color-text-secondary)]">Resource ID</dt>
                          <dd className="mt-0.5 break-all font-mono text-[var(--color-text-primary)]">{entry.targetId}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-[var(--color-text-secondary)]">Recorded</dt>
                          <dd className="mt-0.5 text-[var(--color-text-primary)]">{formatTimestamp(entry.createdAt)}</dd>
                        </div>
                      </dl>
                      {metadataEntries.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-[var(--color-text-secondary)]">Details</p>
                          <dl className="mt-1 space-y-1">
                            {metadataEntries.map(([key, value]) => (
                              <div key={key} className="flex flex-wrap gap-x-2 text-xs">
                                <dt className="font-medium text-[var(--color-text-secondary)]">{key}:</dt>
                                <dd className="break-all text-[var(--color-text-primary)]">{formatMetadataValue(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-[var(--color-text-muted)]">No additional details recorded.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {nextCursor && !loading && (
          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                void load(
                  workspaceId,
                  { action: debouncedAction, targetType, actorId },
                  nextCursor,
                  true,
                );
              }}
              loading={loadingMore}
              disabled={loadingMore}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
