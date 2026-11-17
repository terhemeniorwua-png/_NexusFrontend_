/**
 * app/app/integrations/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IntegrationsPage from './page';

const WS_ID = 'ws-int-test';
const USER_ID = 'user-1';

const router = { push: vi.fn(), replace: vi.fn() };
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/app/integrations',
  useSearchParams: () => searchParams,
}));

const mockCtx = {
  activeWorkspace: { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const, role: 'OWNER' },
  workspaces: [],
  user: { id: USER_ID, name: 'Ada', email: 'ada@test.com' },
  loading: false,
  switchToWorkspace: vi.fn(),
};
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mockCtx }));

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function fail(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeIntegration(overrides: Record<string, unknown> = {}) {
  return {
    id: 'int-1',
    provider: 'SLACK',
    status: 'ACTIVE',
    enabled: true,
    workspaceId: WS_ID,
    externalEmail: 'team@example.com',
    scopes: ['chat:write', 'channels:read'],
    lastSyncedAt: '2026-11-16T10:00:00.000Z',
    lastError: null,
    config: { slackChannelId: 'C123' },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('IntegrationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    searchParams = new URLSearchParams();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const, role: 'OWNER' } as any;
    mockCtx.user = { id: USER_ID, name: 'Ada', email: 'ada@test.com' };
  });

  it('loads integrations for the active workspace', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/dev-integrations/connections')) return ok([]);
      return ok([fakeIntegration()]);
    });
    render(<IntegrationsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/backend/integrations?workspaceId=${WS_ID}`),
      expect.any(Object),
    ));
    expect(await screen.findByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('team@example.com')).toBeInTheDocument();
    expect(screen.getAllByText(/Last sync:/i).length).toBeGreaterThan(0);
  });

  it('shows OAuth callback result and allows dismissing it', async () => {
    searchParams = new URLSearchParams('integration=SLACK&status=connected');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/dev-integrations/connections')) return ok([]);
      return ok([]);
    });
    const user = userEvent.setup();
    render(<IntegrationsPage />);
    expect(await screen.findByText(/Slack connected successfully/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(router.replace).toHaveBeenCalled();
  });

  it('hides connect/disconnect actions for read-only members', async () => {
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const, role: 'MEMBER' } as any;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/dev-integrations/connections')) return ok([]);
      return ok([fakeIntegration()]);
    });
    render(<IntegrationsPage />);
    expect(await screen.findByText('Slack')).toBeInTheDocument();
    expect(screen.getByText(/read-only access to integrations/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Read-only|Admin only/).length).toBeGreaterThan(0);
  });

  it('shows Reconnect and Sync now for integrations with invalid token/error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const u = String(url);
      const method = (init as RequestInit | undefined)?.method ?? 'GET';
      if (u.includes('/dev-integrations/connections')) return ok([]);
      if (u.includes('/imports?')) return ok([]);
      if (u.includes('/projects?')) return ok({ items: [], nextCursor: null });
      if (u.endsWith('/sync') && method === 'POST') return ok({ id: 'job-1', integrationId: 'int-1', status: 'PENDING', createdAt: new Date().toISOString() });
      if (u.endsWith('/status')) return ok({ lastSyncedAt: '2026-11-16T12:00:00.000Z', lastError: null });
      if (u.includes('/api/backend/integrations?workspaceId=')) return ok([fakeIntegration({ status: 'ERROR', lastError: 'token expired' })]);
      return ok([]);
    });
    const user = userEvent.setup();
    render(<IntegrationsPage />);
    expect(await screen.findByText(/Reconnect required/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sync now' }));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/integrations/int-1/sync'),
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('shows permission denied state on 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/dev-integrations/connections')) return fail('FORBIDDEN', 'Forbidden', 403);
      return fail('FORBIDDEN', 'Forbidden', 403);
    });
    render(<IntegrationsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading integrations')).not.toBeInTheDocument());
    expect(screen.getByText(/do not have access/i)).toBeInTheDocument();
  });
});
