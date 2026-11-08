'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import {
  listIntegrations,
  disconnectIntegration,
  getSlackAuthorizeUrl,
  getGoogleDriveAuthorizeUrl,
  getDropboxAuthorizeUrl,
  type IntegrationProvider,
  type IntegrationStatus,
  type IntegrationSummary,
} from '@/services/integrations';

// ─── Provider metadata ────────────────────────────────────────────────────────

const PROVIDER_META: Record<IntegrationProvider, { name: string; icon: string; description: string; category: string }> = {
  GOOGLE_DRIVE:      { name: 'Google Drive',           icon: '📂', description: 'Access and attach Google Drive files.', category: 'Storage' },
  ONEDRIVE:          { name: 'Microsoft OneDrive',      icon: '📁', description: 'Access and attach OneDrive files.', category: 'Storage' },
  DROPBOX:           { name: 'Dropbox',                 icon: '📦', description: 'Access and attach Dropbox files.', category: 'Storage' },
  GMAIL:             { name: 'Gmail',                   icon: '📧', description: 'Integrate Gmail with your workspace.', category: 'Email' },
  OUTLOOK:           { name: 'Microsoft Outlook',       icon: '📨', description: 'Integrate Outlook email.', category: 'Email' },
  SLACK:             { name: 'Slack',                   icon: '💬', description: 'Send Nexus notifications to Slack channels.', category: 'Communication' },
  GITHUB:            { name: 'GitHub',                  icon: '🐙', description: 'Link GitHub repositories and issues.', category: 'Development' },
  GITLAB:            { name: 'GitLab',                  icon: '🦊', description: 'Link GitLab repositories and merge requests.', category: 'Development' },
  GOOGLE_CALENDAR:   { name: 'Google Calendar',         icon: '📅', description: 'Sync events with Google Calendar.', category: 'Calendar' },
  OUTLOOK_CALENDAR:  { name: 'Outlook Calendar',        icon: '🗓️', description: 'Sync events with Outlook Calendar.', category: 'Calendar' },
};

/** Providers that have a working OAuth flow on the backend. */
const AUTHORIZE_URL_FETCHERS: Partial<Record<IntegrationProvider, (workspaceId: string) => Promise<{ url: string }>>> = {
  SLACK: getSlackAuthorizeUrl,
  GOOGLE_DRIVE: getGoogleDriveAuthorizeUrl,
  DROPBOX: getDropboxAuthorizeUrl,
};

function statusVariant(status: IntegrationStatus): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'EXPIRED': return 'warning';
    case 'REVOKED': return 'error';
    case 'ERROR': return 'error';
  }
}

// ─── Integration card ─────────────────────────────────────────────────────────

interface IntegrationCardProps {
  integration: IntegrationSummary;
  onDisconnect: (integration: IntegrationSummary) => void;
}

function IntegrationCard({ integration, onDisconnect }: IntegrationCardProps) {
  const meta = PROVIDER_META[integration.provider];

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="text-2xl" aria-hidden="true">{meta.icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--color-text-primary)]">{meta.name}</span>
            <Badge variant={statusVariant(integration.status)}>{integration.status}</Badge>
            {integration.workspaceId && <Badge variant="outline">Workspace</Badge>}
          </div>
          {integration.externalEmail && (
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              {integration.externalEmail}
            </p>
          )}
          {integration.scopes.length > 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Scopes: {integration.scopes.slice(0, 3).join(', ')}
              {integration.scopes.length > 3 && ` +${integration.scopes.length - 3} more`}
            </p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="shrink-0"
        onClick={() => onDisconnect(integration)}
      >
        Disconnect
      </Button>
    </Card>
  );
}

// ─── Available integration card ───────────────────────────────────────────────

interface AvailableCardProps {
  provider: IntegrationProvider;
  onConnect: (provider: IntegrationProvider) => void;
  connecting: boolean;
  disabled: boolean;
}

function AvailableCard({ provider, onConnect, connecting, disabled }: AvailableCardProps) {
  const meta = PROVIDER_META[provider];
  const canConnect = provider in AUTHORIZE_URL_FETCHERS;

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="text-2xl" aria-hidden="true">{meta.icon}</span>
        <div className="min-w-0">
          <p className="font-medium text-[var(--color-text-primary)]">{meta.name}</p>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{meta.description}</p>
          <Badge variant="outline" className="mt-1">{meta.category}</Badge>
        </div>
      </div>
      {canConnect ? (
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => onConnect(provider)}
          loading={connecting}
          disabled={disabled}
        >
          Connect
        </Button>
      ) : (
        <Button size="sm" variant="secondary" className="shrink-0" disabled title="OAuth flow not yet available for this provider">
          Coming soon
        </Button>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL_PROVIDERS = Object.keys(PROVIDER_META) as IntegrationProvider[];

export default function IntegrationsPage() {
  const { activeWorkspace, user } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);

  const [disconnectTarget, setDisconnectTarget] = useState<IntegrationSummary | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const [connectingProvider, setConnectingProvider] = useState<IntegrationProvider | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const latestLoad = useRef(0);

  const load = useCallback(async (wsId: string) => {
    const seq = ++latestLoad.current;
    setLoading(true);
    setError(null);
    setAccessError(null);
    try {
      // Load personal + workspace integrations
      const all = await listIntegrations(wsId || undefined);
      if (seq !== latestLoad.current) return;
      setIntegrations(all);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        setAccessError(err.status);
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Could not load integrations.');
      }
    } finally {
      if (seq === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load(workspaceId) : undefined);
    return () => { active = false; };
  }, [workspaceId, user?.id, load]);

  async function handleDisconnect() {
    if (!disconnectTarget || disconnecting) return;
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      await disconnectIntegration(disconnectTarget.id);
      setIntegrations((prev) => prev.filter((i) => i.id !== disconnectTarget.id));
      setDisconnectTarget(null);
    } catch (err) {
      setDisconnectError(err instanceof ApiRequestError ? err.message : 'Could not disconnect.');
      setDisconnecting(false);
    }
  }

  async function handleConnect(provider: IntegrationProvider) {
    const fetchUrl = AUTHORIZE_URL_FETCHERS[provider];
    if (!fetchUrl || !workspaceId || connectingProvider) return;
    setConnectingProvider(provider);
    setConnectError(null);
    try {
      const { url } = await fetchUrl(workspaceId);
      window.location.href = url;
    } catch (err) {
      setConnectError(
        err instanceof ApiRequestError
          ? err.message
          : `Could not start ${PROVIDER_META[provider].name} authorization.`,
      );
      setConnectingProvider(null);
    }
  }

  const connectedProviders = new Set(integrations.map((i) => i.provider));
  const availableProviders = ALL_PROVIDERS.filter((p) => !connectedProviders.has(p));

  if (!user) {
    return (
      <PageContainer>
        <PageHeader title="Integrations" />
        <EmptyState title="Sign in required" description="Sign in to manage integrations." />
      </PageContainer>
    );
  }

  if (accessError) {
    return (
      <PageContainer>
        <PageHeader title="Integrations" />
        <AccessState status={accessError as 401 | 403} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
        description="Connect Nexus to the tools your team uses."
      />

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => void load(workspaceId)}
          >
            Retry
          </Button>
        </Alert>
      )}

      {connectError && <Alert variant="error" className="mb-4">{connectError}</Alert>}
      {disconnectError && <Alert variant="error" className="mb-4">{disconnectError}</Alert>}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading integrations">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Connected */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
              Connected ({integrations.length})
            </h2>
            {integrations.length === 0 ? (
              <EmptyState
                title="No integrations connected"
                description="Connect an integration below to get started."
              />
            ) : (
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onDisconnect={setDisconnectTarget}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Available */}
          {availableProviders.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
                Available integrations
              </h2>
              <div className="space-y-3">
                {availableProviders.map((provider) => (
                  <AvailableCard
                    key={provider}
                    provider={provider}
                    onConnect={(p) => { void handleConnect(p); }}
                    connecting={connectingProvider === provider}
                    disabled={connectingProvider !== null}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              <strong>Security note:</strong> Nexus stores integration tokens in encrypted form.
              Disconnecting an integration revokes Nexus&apos;s access but does not delete any data
              in the connected provider.
            </p>
          </section>
        </div>
      )}

      {/* Disconnect confirm */}
      <ConfirmDialog
        open={!!disconnectTarget}
        title="Disconnect integration"
        description={`Disconnect ${disconnectTarget ? PROVIDER_META[disconnectTarget.provider].name : ''}? This will revoke Nexus's access. Your data in the provider will not be deleted.`}
        confirmLabel="Disconnect"
        destructive
        onConfirm={() => { void handleDisconnect(); }}
        onClose={() => { setDisconnectTarget(null); setDisconnectError(null); }}
        loading={disconnecting}
      />
    </PageContainer>
  );
}
