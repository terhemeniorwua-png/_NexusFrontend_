/**
 * services/__tests__/integrations.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { disconnectIntegration, getDropboxAuthorizeUrl, getGmailAuthorizeUrl, getGoogleDriveAuthorizeUrl, getSlackAuthorizeUrl, listIntegrations } from '../integrations';

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
    workspaceId: null,
    externalEmail: 'user@gmail.com',
    scopes: ['drive.readonly'],
    createdAt: new Date().toISOString(),
  };
}

describe('listIntegrations', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /integrations', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([fakeIntegration()]));
    await listIntegrations();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/integrations',
      expect.any(Object),
    );
  });

  it('appends workspaceId when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    await listIntegrations('ws-abc');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('workspaceId=ws-abc'),
      expect.any(Object),
    );
  });
});

describe('disconnectIntegration', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls DELETE /integrations/:id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await disconnectIntegration('int-1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/integrations/int-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('getSlackAuthorizeUrl', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /integrations/slack/authorize with workspaceId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ url: 'https://slack.com/oauth/authorize?...' }),
    );
    await getSlackAuthorizeUrl('ws-abc');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/integrations/slack/authorize?workspaceId=ws-abc'),
      expect.any(Object),
    );
  });
});

describe('getGoogleDriveAuthorizeUrl', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /integrations/google-drive/authorize with workspaceId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ url: 'https://accounts.google.com/o/oauth2/v2/auth?...' }),
    );
    await getGoogleDriveAuthorizeUrl('ws-abc');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/integrations/google-drive/authorize?workspaceId=ws-abc'),
      expect.any(Object),
    );
  });
});

describe('getDropboxAuthorizeUrl', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /integrations/dropbox/authorize with workspaceId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ url: 'https://www.dropbox.com/oauth2/authorize?...' }),
    );
    await getDropboxAuthorizeUrl('ws-abc');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/integrations/dropbox/authorize?workspaceId=ws-abc'),
      expect.any(Object),
    );
  });
});

describe('getGmailAuthorizeUrl', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /integrations/gmail/authorize', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ url: 'https://accounts.google.com/o/oauth2/v2/auth?...' }),
    );
    await getGmailAuthorizeUrl();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/integrations/gmail/authorize'),
      expect.any(Object),
    );
  });
});
