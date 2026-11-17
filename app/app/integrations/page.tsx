'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { ImportWizard } from '@/components/integrations/ImportWizard';
import { ApiRequestError } from '@/lib/api';
import { workspaceCan } from '@/lib/permissions';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  disconnectIntegration,
  getDropboxAuthorizeUrl,
  getGmailAuthorizeUrl,
  getGithubAuthorizeUrl,
  getGoogleCalendarAuthorizeUrl,
  getGoogleDriveAuthorizeUrl,
  getIntegrationConfigString,
  getIntegrationStatus,
  getOneDriveAuthorizeUrl,
  getOutlookCalendarAuthorizeUrl,
  getOutlookMailAuthorizeUrl,
  getSlackAuthorizeUrl,
  integrationNeedsReconnect,
  listIntegrations,
  queueIntegrationSync,
  updateIntegration,
  type IntegrationProvider,
  type IntegrationSummary,
} from '@/services/integrations';
import {
  disconnectDevConnection,
  getGithubConnectUrl,
  getGitlabConnectUrl,
  linkProjectRepository,
  listAvailableRepositories,
  listDevConnections,
  listProjectRepositories,
  unlinkProjectRepository,
  type DevConnectionSummary,
  type DevIntegrationProvider,
  type DevRepositorySummary,
  type LinkedProjectRepository,
} from '@/services/dev-integrations';
import { listProjects, type ProjectSummary } from '@/services/projects';

const PROVIDER_META: Record<IntegrationProvider, { name: string; icon: string; description: string }> = {
  GOOGLE_DRIVE: { name: 'Google Drive', icon: '📁', description: 'Attach and import files from Google Drive.' },
  ONEDRIVE: { name: 'OneDrive', icon: '☁️', description: 'Attach files from Microsoft OneDrive.' },
  DROPBOX: { name: 'Dropbox', icon: '📦', description: 'Attach files from Dropbox.' },
  GMAIL: { name: 'Gmail', icon: '✉️', description: 'Personal email integration for your account.' },
  OUTLOOK: { name: 'Outlook Mail', icon: '📧', description: 'Personal Outlook mail integration.' },
  SLACK: { name: 'Slack', icon: '💬', description: 'Send workspace notifications to Slack channels.' },
  GITHUB: { name: 'GitHub', icon: '🐙', description: 'Connect GitHub for calendar/repository and development workflows.' },
  GITLAB: { name: 'GitLab', icon: '🦊', description: 'Connect GitLab repositories and merge requests.' },
  GOOGLE_CALENDAR: { name: 'Google Calendar', icon: '📅', description: 'Sync Nexus events with Google Calendar.' },
  OUTLOOK_CALENDAR: { name: 'Outlook Calendar', icon: '🗓️', description: 'Sync Nexus events with Outlook Calendar.' },
};

type ManagedProvider = IntegrationProvider;

const WORKSPACE_OAUTH_PROVIDERS: ManagedProvider[] = ['SLACK', 'GOOGLE_DRIVE', 'DROPBOX', 'GOOGLE_CALENDAR', 'GITHUB'];
const PERSONAL_OAUTH_PROVIDERS: ManagedProvider[] = ['GMAIL', 'OUTLOOK', 'ONEDRIVE', 'OUTLOOK_CALENDAR', 'GITLAB'];

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'ERROR') return 'error';
  if (status === 'DISCONNECTED') return 'default';
  return 'warning';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Never';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function callbackMessage(provider: string | null, status: string | null): { variant: 'success' | 'error' | 'info'; text: string } | null {
  if (!status) return null;
  const name = provider ? (PROVIDER_META[provider as IntegrationProvider]?.name ?? provider) : 'Integration';
  if (status === 'connected') return { variant: 'success', text: `${name} connected successfully.` };
  if (status === 'denied') return { variant: 'info', text: `${name} connection was cancelled or denied.` };
  return { variant: 'error', text: `${name} connection failed. You can try connecting again.` };
}

async function getAuthorizeUrl(provider: ManagedProvider, workspaceId: string): Promise<string> {
  switch (provider) {
    case 'SLACK': return getSlackAuthorizeUrl(workspaceId);
    case 'GOOGLE_DRIVE': return getGoogleDriveAuthorizeUrl(workspaceId);
    case 'DROPBOX': return getDropboxAuthorizeUrl(workspaceId);
    case 'GMAIL': return getGmailAuthorizeUrl(workspaceId);
    case 'GITHUB': return getGithubAuthorizeUrl(workspaceId);
    case 'GOOGLE_CALENDAR': return getGoogleCalendarAuthorizeUrl(workspaceId);
    case 'OUTLOOK_CALENDAR': return getOutlookCalendarAuthorizeUrl();
    case 'ONEDRIVE': return getOneDriveAuthorizeUrl();
    case 'OUTLOOK': return getOutlookMailAuthorizeUrl();
    case 'GITLAB':
      throw new Error('GitLab uses workspace source-control connection flow below.');
    default:
      throw new Error('Unsupported integration provider.');
  }
}

function IntegrationSettings({
  integration,
  canManage,
  onUpdated,
}: {
  integration: IntegrationSummary;
  canManage: boolean;
  onUpdated: (next: IntegrationSummary) => void;
}) {
  const [slackChannel, setSlackChannel] = useState(getIntegrationConfigString(integration, 'slackChannelId') || getIntegrationConfigString(integration, 'channelId'));
  const [calendarId, setCalendarId] = useState(getIntegrationConfigString(integration, 'calendarId') || getIntegrationConfigString(integration, 'googleCalendarId') || 'primary');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSlackChannel(getIntegrationConfigString(integration, 'slackChannelId') || getIntegrationConfigString(integration, 'channelId'));
    setCalendarId(getIntegrationConfigString(integration, 'calendarId') || getIntegrationConfigString(integration, 'googleCalendarId') || 'primary');
  }, [integration]);

  async function saveConfig(config: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateIntegration(integration.id, { config });
      onUpdated({ ...integration, ...updated });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save integration settings.');
    } finally {
      setSaving(false);
    }
  }

  if (integration.provider === 'SLACK') {
    return (
      <div className="mt-3 space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Slack settings</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id={`slack-channel-${integration.id}`}
              label="Slack channel ID"
              value={slackChannel}
              onChange={(e) => { setSlackChannel(e.target.value); setSaved(false); }}
              placeholder="C0123456789"
              helperText="Choose the Slack channel where PITERON should post task and automation notifications for this workspace."
              disabled={!canManage}
            />
          </div>
          <Button size="sm" onClick={() => { void saveConfig({ ...(integration.config ?? {}), slackChannelId: slackChannel.trim() }); }} loading={saving} disabled={!canManage || saving}>
            Save channel
          </Button>
        </div>
        {saved && <p className="text-xs text-[var(--color-success,#16a34a)]">Settings saved.</p>}
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    );
  }

  if (integration.provider === 'GOOGLE_CALENDAR') {
    return (
      <div className="mt-3 space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Google Calendar settings</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id={`gcal-calendar-${integration.id}`}
              label="Google calendar"
              value={calendarId}
              onChange={(e) => { setCalendarId(e.target.value); setSaved(false); }}
              placeholder="primary"
              helperText="Calendar ID to sync with PITERON events (use “primary” for your main calendar)."
              disabled={!canManage}
            />
          </div>
          <Button size="sm" onClick={() => { void saveConfig({ ...(integration.config ?? {}), calendarId: calendarId.trim() || 'primary' }); }} loading={saving} disabled={!canManage || saving}>
            Save calendar
          </Button>
        </div>
        {saved && <p className="text-xs text-[var(--color-success,#16a34a)]">Settings saved.</p>}
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    );
  }

  return null;
}

function GithubRepoLinking({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [devConnections, setDevConnections] = useState<DevConnectionSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [repos, setRepos] = useState<DevRepositorySummary[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [linkedRepos, setLinkedRepos] = useState<LinkedProjectRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const githubConnections = useMemo(() => devConnections.filter((c) => c.provider === 'GITHUB' && c.status === 'ACTIVE'), [devConnections]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, c] = await Promise.all([listProjects(workspaceId, { limit: 50 }), listDevConnections(workspaceId)]);
        if (!active) return;
        setProjects(p.items ?? []);
        setDevConnections(Array.isArray(c) ? c : []);
        setSelectedProjectId((prev) => prev || p.items[0]?.id || '');
        const firstGh = (Array.isArray(c) ? c : []).find((x) => x.provider === 'GITHUB' && x.status === 'ACTIVE');
        setSelectedConnectionId((prev) => prev || firstGh?.id || '');
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiRequestError ? err.message : 'Could not load GitHub repository linking data.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workspaceId]);

  useEffect(() => {
    if (!selectedProjectId) { setLinkedRepos([]); return; }
    let active = true;
    (async () => {
      try {
        const linked = await listProjectRepositories(workspaceId, selectedProjectId);
        if (active) setLinkedRepos(Array.isArray(linked) ? linked : []);
      } catch {
        if (active) setLinkedRepos([]);
      }
    })();
    return () => { active = false; };
  }, [workspaceId, selectedProjectId]);

  useEffect(() => {
    if (!selectedConnectionId) { setRepos([]); return; }
    let active = true;
    (async () => {
      setReposLoading(true);
      try {
        const available = await listAvailableRepositories(workspaceId, selectedConnectionId);
        if (!active) return;
        setRepos(Array.isArray(available) ? available : []);
        setSelectedRepoId('');
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiRequestError ? err.message : 'Could not load available repositories.');
        setRepos([]);
      } finally {
        if (active) setReposLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workspaceId, selectedConnectionId]);

  async function handleLink() {
    if (!canManage || !selectedProjectId || !selectedConnectionId || !selectedRepoId) return;
    const repo = repos.find((r) => r.externalRepoId === selectedRepoId);
    if (!repo) return;
    setLinking(true);
    setError(null);
    setNotice(null);
    try {
      const linked = await linkProjectRepository(workspaceId, selectedProjectId, {
        connectionId: selectedConnectionId,
        externalRepoId: repo.externalRepoId,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch ?? undefined,
      });
      setLinkedRepos((prev) => [linked, ...prev.filter((x) => x.id !== linked.id)]);
      setNotice(`Linked ${repo.fullName} to the selected project.`);
      setSelectedRepoId('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not link repository.');
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(repoId: string) {
    if (!canManage || !selectedProjectId) return;
    setError(null);
    setNotice(null);
    try {
      await unlinkProjectRepository(workspaceId, selectedProjectId, repoId);
      setLinkedRepos((prev) => prev.filter((r) => r.id !== repoId));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not unlink repository.');
    }
  }

  if (loading) {
    return <div className="mt-3 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-20 w-full" /></div>;
  }

  return (
    <div className="mt-3 space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">GitHub repository linking</p>
      {githubConnections.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Connect a GitHub source-control connection below to link repositories to projects.</p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              id={`gh-link-project-${workspaceId}`}
              label="Project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              options={projects.length ? projects.map((p) => ({ value: p.id, label: `${p.name}${p.key ? ` (${p.key})` : ''}` })) : [{ value: '', label: 'No projects available' }]}
              disabled={!canManage || projects.length === 0}
            />
            <Select
              id={`gh-link-connection-${workspaceId}`}
              label="GitHub connection"
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              options={githubConnections.map((c) => ({ value: c.id, label: c.externalAccount.login || c.externalAccount.name || c.id }))}
              disabled={!canManage}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select
                id={`gh-link-repo-${workspaceId}`}
                label="Repository"
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                options={[{ value: '', label: reposLoading ? 'Loading repositories…' : 'Select a repository' }, ...repos.map((r) => ({ value: r.externalRepoId, label: r.fullName }))]}
                disabled={!canManage || reposLoading || !selectedConnectionId}
              />
            </div>
            <Button size="sm" onClick={() => { void handleLink(); }} loading={linking} disabled={!canManage || !selectedProjectId || !selectedConnectionId || !selectedRepoId || linking}>
              Link repository
            </Button>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-primary)]">Linked repositories for selected project</p>
            {linkedRepos.length === 0 ? (
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">No repositories linked to this project.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {linkedRepos.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
                    <span className="text-[var(--color-text-primary)]">{r.fullName}{r.defaultBranch ? ` (${r.defaultBranch})` : ''}</span>
                    {canManage && <Button size="sm" variant="secondary" onClick={() => { void handleUnlink(r.id); }}>Unlink</Button>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      {notice && <p className="text-xs text-[var(--color-success,#16a34a)]">{notice}</p>}
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      {!canManage && <p className="text-xs text-[var(--color-text-muted)]">Read-only: workspace administrators can link repositories.</p>}
    </div>
  );
}

function IntegrationsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const canManageIntegrations = !!activeWorkspace && workspaceCan(activeWorkspace, 'workspace:update');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);
  const [devConnections, setDevConnections] = useState<DevConnectionSummary[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<ManagedProvider | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<IntegrationSummary | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [devConnecting, setDevConnecting] = useState<DevIntegrationProvider | null>(null);
  const [devDisconnectTarget, setDevDisconnectTarget] = useState<DevConnectionSummary | null>(null);
  const [devDisconnecting, setDevDisconnecting] = useState(false);

  const callback = callbackMessage(searchParams.get('integration'), searchParams.get('status') ?? searchParams.get('result'));

  const clearCallbackParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('integration');
    params.delete('status');
    params.delete('result');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setIntegrations([]);
      setDevConnections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setForbidden(false);
    try {
      const [all, dev] = await Promise.all([
        listIntegrations(workspaceId),
        listDevConnections(workspaceId).catch(() => [] as DevConnectionSummary[]),
      ]);
      setIntegrations(Array.isArray(all) ? all : []);
      setDevConnections(Array.isArray(dev) ? dev : []);
    } catch (err) {
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        setForbidden(true);
      } else {
        setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load integrations.');
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load]);

  async function handleConnect(provider: ManagedProvider) {
    if (!workspaceId || !canManageIntegrations) return;
    if (provider === 'GITLAB') return;
    setConnectingProvider(provider);
    setActionError(null);
    try {
      const url = await getAuthorizeUrl(provider, workspaceId);
      window.location.assign(url);
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : err instanceof Error ? err.message : 'Could not start OAuth flow.');
      setConnectingProvider(null);
    }
  }

  async function handleSync(integration: IntegrationSummary) {
    setSyncingId(integration.id);
    setActionError(null);
    try {
      await queueIntegrationSync(integration.id);
      const status = await getIntegrationStatus(integration.id).catch(() => null);
      setIntegrations((prev) => prev.map((i) => i.id === integration.id ? {
        ...i,
        lastSyncedAt: (status?.lastSyncedAt as string | null | undefined) ?? i.lastSyncedAt ?? new Date().toISOString(),
        lastError: (status?.lastError as string | null | undefined) ?? i.lastError ?? null,
      } : i));
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : 'Could not queue sync.');
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDisconnect() {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    setActionError(null);
    try {
      await disconnectIntegration(disconnectTarget.id);
      setIntegrations((prev) => prev.filter((i) => i.id !== disconnectTarget.id));
      setDisconnectTarget(null);
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : 'Could not disconnect integration.');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleDevConnect(provider: DevIntegrationProvider) {
    if (!workspaceId || !canManageIntegrations) return;
    setDevConnecting(provider);
    setActionError(null);
    try {
      const { url } = provider === 'GITHUB' ? await getGithubConnectUrl(workspaceId) : await getGitlabConnectUrl(workspaceId);
      window.location.assign(url);
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : 'Could not start source-control connection.');
      setDevConnecting(null);
    }
  }

  async function handleDevDisconnect() {
    if (!devDisconnectTarget || !workspaceId) return;
    setDevDisconnecting(true);
    setActionError(null);
    try {
      await disconnectDevConnection(workspaceId, devDisconnectTarget.id);
      setDevConnections((prev) => prev.filter((c) => c.id !== devDisconnectTarget.id));
      setDevDisconnectTarget(null);
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : 'Could not disconnect source control.');
    } finally {
      setDevDisconnecting(false);
    }
  }

  const connectedProviders = new Set(integrations.map((i) => i.provider));
  const availableProviders = (['SLACK', 'GOOGLE_CALENDAR', 'GITHUB', 'GOOGLE_DRIVE', 'DROPBOX', 'GMAIL', 'OUTLOOK_CALENDAR', 'ONEDRIVE', 'OUTLOOK'] as ManagedProvider[])
    .filter((p) => !connectedProviders.has(p));

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Integrations" description="Connect external services and import data into your workspace." />
        <EmptyState title="No workspace selected" description="Select a workspace to manage integrations." />
      </PageContainer>
    );
  }

  if (forbidden) {
    return (
      <PageContainer>
        <PageHeader title="Integrations" description="Connect external services and import data into your workspace." />
        <AccessState status={403} onRetry={() => { void load(); }} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
        description="Connect external services, manage sync settings, and import work into this workspace."
      />

      {callback && (
        <Alert variant={callback.variant} className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{callback.text}</span>
            <Button variant="secondary" size="sm" onClick={clearCallbackParams}>Dismiss</Button>
          </div>
        </Alert>
      )}

      {!canManageIntegrations && (
        <Alert variant="info" className="mb-4">
          You have read-only access to integrations in this workspace. Only workspace administrators can connect, disconnect, change settings, sync, or run imports.
        </Alert>
      )}

      {actionError && <Alert variant="error" className="mb-4">{actionError}</Alert>}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading integrations">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <Skeleton className="mb-2 h-5 w-48" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <Alert variant="error">
          {loadError}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load(); }}>Retry</Button>
        </Alert>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">Connected integrations ({integrations.length})</h2>
            {integrations.length === 0 ? (
              <EmptyState title="No integrations connected" description="Connect an integration below to get started." />
            ) : (
              <div className="space-y-3">
                {integrations.map((integration) => {
                  const meta = PROVIDER_META[integration.provider];
                  const needsReconnect = integrationNeedsReconnect(integration);
                  const showSettings = integration.provider === 'SLACK' || integration.provider === 'GOOGLE_CALENDAR' || integration.provider === 'GITHUB';
                  return (
                    <Card key={integration.id} className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <span className="text-2xl" aria-hidden="true">{meta.icon}</span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-[var(--color-text-primary)]">{meta.name}</span>
                              <Badge variant={statusVariant(integration.status)}>{integration.status}</Badge>
                              {integration.enabled === false && <Badge variant="warning">Disabled</Badge>}
                              {integration.workspaceId ? <Badge variant="outline">Workspace</Badge> : <Badge variant="outline">Personal</Badge>}
                              {needsReconnect && <Badge variant="error">Reconnect required</Badge>}
                            </div>
                            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                              {integration.externalEmail || 'Connected account not provided'}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                              Scopes: {integration.scopes.length ? integration.scopes.join(', ') : 'None reported'}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
                              <span>Last sync: {formatDate(integration.lastSyncedAt)}</span>
                              <span>Last refreshed: {formatDate(integration.lastRefreshedAt)}</span>
                            </div>
                            {integration.lastError && (
                              <p className="mt-2 text-xs text-[var(--color-error)]">Last error: {integration.lastError}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => { void handleSync(integration); }} loading={syncingId === integration.id} disabled={syncingId === integration.id}>
                            Sync now
                          </Button>
                          {canManageIntegrations && needsReconnect && (
                            <Button size="sm" onClick={() => { void handleConnect(integration.provider); }} disabled={connectingProvider === integration.provider}>
                              Reconnect
                            </Button>
                          )}
                          {canManageIntegrations ? (
                            <Button size="sm" variant="secondary" onClick={() => setDisconnectTarget(integration)}>Disconnect</Button>
                          ) : (
                            <Badge variant="outline">Read-only</Badge>
                          )}
                        </div>
                      </div>
                      {showSettings && (
                        <IntegrationSettings integration={integration} canManage={canManageIntegrations} onUpdated={(next) => setIntegrations((prev) => prev.map((i) => i.id === next.id ? next : i))} />
                      )}
                      {integration.provider === 'GITHUB' && showSettings && (
                        <GithubRepoLinking workspaceId={workspaceId} canManage={canManageIntegrations} />
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">Source control connections</h2>
            <p className="mb-3 text-sm text-[var(--color-text-secondary)]">Workspace-level GitHub and GitLab app connections used for repository linking and task development links.</p>
            <div className="space-y-3">
              {(['GITHUB', 'GITLAB'] as DevIntegrationProvider[]).map((provider) => {
                const conn = devConnections.find((c) => c.provider === provider && c.status !== 'DISCONNECTED') ?? null;
                return (
                  <Card key={provider} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="text-2xl" aria-hidden="true">{provider === 'GITHUB' ? '🐙' : '🦊'}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[var(--color-text-primary)]">{provider === 'GITHUB' ? 'GitHub' : 'GitLab'}</span>
                          {conn ? <Badge variant={conn.status === 'ACTIVE' ? 'success' : conn.status === 'ERROR' ? 'error' : 'warning'}>{conn.status}</Badge> : <Badge variant="outline">Not connected</Badge>}
                          <Badge variant="outline">Workspace</Badge>
                        </div>
                        {conn ? (
                          <>
                            {(conn.externalAccount.login || conn.externalAccount.name) && (
                              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{conn.externalAccount.login ?? conn.externalAccount.name}</p>
                            )}
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Scopes: {conn.scopes.length ? conn.scopes.join(', ') : 'None reported'} · Last sync: n/a</p>
                            {conn.lastError && <p className="mt-1 text-xs text-[var(--color-error)]">Last error: {conn.lastError}</p>}
                          </>
                        ) : (
                          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{provider === 'GITHUB' ? 'Connect GitHub to browse and link repositories to projects.' : 'Connect GitLab to link repositories and merge requests.'}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {conn ? (
                        canManageIntegrations ? <Button size="sm" variant="secondary" onClick={() => setDevDisconnectTarget(conn)}>Disconnect</Button> : <Badge variant="outline">Read-only</Badge>
                      ) : (
                        canManageIntegrations ? <Button size="sm" onClick={() => { void handleDevConnect(provider); }} loading={devConnecting === provider} disabled={devConnecting !== null}>Connect {provider === 'GITHUB' ? 'GitHub' : 'GitLab'}</Button> : <Badge variant="outline">Admin only</Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">Available integrations</h2>
            {availableProviders.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">All supported integrations are connected for this view.</p>
            ) : (
              <div className="space-y-3">
                {availableProviders.map((provider) => {
                  const meta = PROVIDER_META[provider];
                  const isWorkspaceOauth = WORKSPACE_OAUTH_PROVIDERS.includes(provider) || PERSONAL_OAUTH_PROVIDERS.includes(provider);
                  return (
                    <Card key={provider} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span className="text-2xl" aria-hidden="true">{meta.icon}</span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-[var(--color-text-primary)]">{meta.name}</span>
                            <Badge variant="outline">Not connected</Badge>
                            {WORKSPACE_OAUTH_PROVIDERS.includes(provider) ? <Badge variant="outline">Workspace</Badge> : <Badge variant="outline">Account</Badge>}
                          </div>
                          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{meta.description}</p>
                        </div>
                      </div>
                      {canManageIntegrations ? (
                        <Button size="sm" className="shrink-0" onClick={() => { void handleConnect(provider); }} loading={connectingProvider === provider} disabled={connectingProvider !== null || !isWorkspaceOauth}>
                          Connect
                        </Button>
                      ) : (
                        <Badge variant="outline">Read-only</Badge>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">Import data</h2>
            <ImportWizard workspaceId={workspaceId} canImport={canManageIntegrations} />
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              <strong>Security note:</strong> PITERON stores integration tokens in encrypted form and never exposes them to the browser. Disconnecting revokes PITERON access but does not delete data in the connected provider.
            </p>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={!!disconnectTarget}
        title="Disconnect integration"
        description={`Disconnect ${disconnectTarget ? PROVIDER_META[disconnectTarget.provider].name : ''}? PITERON access will be revoked for this connection.`}
        confirmLabel="Disconnect"
        destructive
        onConfirm={() => { void handleDisconnect(); }}
        onClose={() => { if (!disconnecting) setDisconnectTarget(null); }}
        loading={disconnecting}
      />

      <ConfirmDialog
        open={!!devDisconnectTarget}
        title="Disconnect source control"
        description={`Disconnect ${devDisconnectTarget?.provider === 'GITLAB' ? 'GitLab' : 'GitHub'} from this workspace? Stored credentials will be removed.`}
        confirmLabel="Disconnect"
        destructive
        onConfirm={() => { void handleDevDisconnect(); }}
        onClose={() => { if (!devDisconnecting) setDevDisconnectTarget(null); }}
        loading={devDisconnecting}
      />
    </PageContainer>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageHeader title="Integrations" />
          <p role="status" className="mt-4 text-sm text-[var(--color-text-secondary)]">Loading integrations…</p>
        </PageContainer>
      }
    >
      <IntegrationsPageContent />
    </Suspense>
  );
}
