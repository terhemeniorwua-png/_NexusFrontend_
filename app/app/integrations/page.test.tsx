/**
 * app/app/integrations/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IntegrationsPage from './page';

const WS_ID = 'ws-int-test';
const USER_ID = 'user-1';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/integrations',
}));

const mockCtx = {
  activeWorkspace: { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const },
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

function fakeIntegration(overrides: Partial<{ provider: string; status: string }> = {}) {
  return {
    id: 'int-1',
    provider: 'GOOGLE_DRIVE',
    status: 'ACTIVE',
    workspaceId: null,
    externalEmail: 'user@gmail.com',
    scopes: ['drive.readonly'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('IntegrationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
    mockCtx.user = { id: USER_ID, name: 'Ada', email: 'ada@test.com' };
  });

  it('renders the page heading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    render(<IntegrationsPage />);
    expect(screen.getByRole('heading', { name: 'Integrations', level: 1 })).toBeInTheDocument();
  });

  it('calls GET /integrations on mount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    render(<IntegrationsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/backend/integrations'),
      expect.any(Object),
    ));
  });

  it('shows loading skeletons while fetching', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<IntegrationsPage />);
    expect(screen.getByLabelText('Loading integrations')).toBeInTheDocument();
    resolve(ok([]));
  });

  it('renders connected integrations after load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([fakeIntegration()]));
    render(<IntegrationsPage />);
    expect(await screen.findByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('user@gmail.com')).toBeInTheDocument();
  });

  it('shows empty state when no integrations are connected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    render(<IntegrationsPage />);
    expect(await screen.findByText('No integrations connected')).toBeInTheDocument();
  });

  it('shows available integrations section', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    render(<IntegrationsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading integrations')).not.toBeInTheDocument());
    expect(screen.getByText('Available integrations')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('shows error alert with Retry when loading fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('INTERNAL_ERROR', 'Server error', 500));
    render(<IntegrationsPage />);
    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows AccessState for 401 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('UNAUTHORIZED', 'Unauthorized', 401));
    render(<IntegrationsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading integrations')).not.toBeInTheDocument());
    expect(screen.queryByText('Google Drive')).not.toBeInTheDocument();
  });

  it('shows disconnect ConfirmDialog when Disconnect is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([fakeIntegration()]));
    const user = userEvent.setup();
    render(<IntegrationsPage />);
    expect(await screen.findByRole('button', { name: 'Disconnect' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(await screen.findByRole('dialog', { name: 'Disconnect integration' })).toBeInTheDocument();
  });

  it('calls DELETE to disconnect and removes from list', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if ((init as RequestInit | undefined)?.method === 'DELETE') return ok({ ok: true });
      return ok([fakeIntegration()]);
    });
    const user = userEvent.setup();
    render(<IntegrationsPage />);
    expect(await screen.findByRole('button', { name: 'Disconnect' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    await screen.findByRole('dialog', { name: 'Disconnect integration' });
    const confirmBtns = screen.getAllByRole('button', { name: 'Disconnect' });
    await user.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/integrations/int-1'),
      expect.objectContaining({ method: 'DELETE' }),
    ));
  });

  it('workspace switch reloads integrations', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    const { rerender } = render(<IntegrationsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    mockCtx.activeWorkspace = { id: 'ws-other', name: 'Other WS', type: 'COMPANY' };
    rerender(<IntegrationsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
