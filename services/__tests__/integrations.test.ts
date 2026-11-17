/**
 * services/__tests__/integrations.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  disconnectIntegration,
  getDropboxAuthorizeUrl,
  getGmailAuthorizeUrl,
  getGithubAuthorizeUrl,
  getGoogleCalendarAuthorizeUrl,
  getGoogleDriveAuthorizeUrl,
  getIntegrationStatus,
  getSlackAuthorizeUrl,
  integrationNeedsReconnect,
  listIntegrations,
  queueIntegrationSync,
  updateIntegration,
} from '../integrations';

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeIntegration() {
  return {
    id: 'int-1',
    provider: 'GOOGLE_DRIVE',
    status: 'ACTIVE',
    enabled: true,
    workspaceId: 'ws-1',
    externalEmail: 'user@gmail.com',
    scopes: ['drive.readonly'],
    lastSyncedAt: null,
    lastError: null,
    config: {},
    createdAt: new Date().toISOString(),
  };
}

describe('integrations service', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lists integrations with workspaceId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([fakeIntegration()]));
    await listIntegrations('ws-abc');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/backend/integrations?workspaceId=ws-abc'),
      expect.any(Object),
    );
  });

  it('disconnects an integration', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await disconnectIntegration('int-1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/integrations/int-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('requests workspace-scoped authorize URLs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      return ok({ url: `https://oauth.example${String(url)}` });
    });
    await getSlackAuthorizeUrl('ws-1');
    await getGoogleDriveAuthorizeUrl('ws-1');
    await getDropboxAuthorizeUrl('ws-1');
    await getGithubAuthorizeUrl('ws-1');
    await getGoogleCalendarAuthorizeUrl('ws-1');

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/integrations/slack/authorize?workspaceId=ws-1'))).toBe(true);
    expect(urls.some((u) => u.includes('/integrations/google-drive/authorize?workspaceId=ws-1'))).toBe(true);
    expect(urls.some((u) => u.includes('/integrations/dropbox/authorize?workspaceId=ws-1'))).toBe(true);
    expect(urls.some((u) => u.includes('/integrations/github/authorize?workspaceId=ws-1'))).toBe(true);
    expect(urls.some((u) => u.includes('/integrations/google-calendar/authorize?workspaceId=ws-1'))).toBe(true);
  });

  it('requests Gmail authorize URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ url: 'https://accounts.google.com/o/oauth2/v2/auth?...' }));
    await getGmailAuthorizeUrl();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/integrations/gmail/authorize'),
      expect.any(Object),
    );
  });

  it('gets status, updates config, and queues sync', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (String(url).endsWith('/status')) return ok({ lastSyncedAt: null, lastError: null });
      if (method === 'PATCH') return ok(fakeIntegration());
      if (String(url).endsWith('/sync')) return ok({ id: 'job-1', integrationId: 'int-1', status: 'PENDING', createdAt: new Date().toISOString() });
      return ok(fakeIntegration());
    });

    await getIntegrationStatus('int-1');
    await updateIntegration('int-1', { config: { slackChannelId: 'C123' } });
    await queueIntegrationSync('int-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/backend/integrations/int-1/status', expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/integrations/int-1', expect.objectContaining({ method: 'PATCH' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/integrations/int-1/sync', expect.objectContaining({ method: 'POST' }));
  });

  it('detects reconnect-needed integrations', () => {
    expect(integrationNeedsReconnect({ status: 'ERROR', lastError: null })).toBe(true);
    expect(integrationNeedsReconnect({ status: 'ACTIVE', lastError: 'token expired' })).toBe(true);
    expect(integrationNeedsReconnect({ status: 'ACTIVE', lastError: null })).toBe(false);
  });
});

