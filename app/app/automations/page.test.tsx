/**
 * app/app/automations/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AutomationsPage from './page';

const WS_ID = 'ws-auto-test';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/automations',
}));

const mockCtx = {
  activeWorkspace: { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const },
  workspaces: [],
  user: { id: 'user-1', name: 'Ada', email: 'ada@test.com' },
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

function fakeAuto(overrides: Partial<{ id: string; name: string; enabled: boolean }> = {}) {
  return {
    id: 'auto-1',
    workspaceId: WS_ID,
    createdById: 'user-1',
    name: 'Notify on task created',
    trigger: 'EVENT_TASK_CREATED',
    condition: null,
    action: 'SEND_NOTIFICATION',
    actionConfig: { message: 'New task!' },
    enabled: true,
    maxRetries: 3,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('AutomationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
  });

  it('renders the page heading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    render(<AutomationsPage />);
    expect(screen.getByRole('heading', { name: 'Automations', level: 1 })).toBeInTheDocument();
  });

  it('calls GET /workspaces/:id/automations on mount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    render(<AutomationsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/backend/workspaces/${WS_ID}/automations`),
      expect.any(Object),
    ));
  });

  it('shows loading skeletons while fetching', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<AutomationsPage />);
    expect(screen.getByLabelText('Loading automations')).toBeInTheDocument();
    resolve(ok([]));
  });

  it('renders automation items after load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([fakeAuto()]));
    render(<AutomationsPage />);
    expect(await screen.findByText('Notify on task created')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Task created/)).toBeInTheDocument();
  });

  it('shows empty state when there are no automations', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    render(<AutomationsPage />);
    expect(await screen.findByText('No automations yet')).toBeInTheDocument();
  });

  it('shows error alert with Retry on load failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('ERROR', 'Server error', 500));
    render(<AutomationsPage />);
    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows empty state for no workspace', () => {
    mockCtx.activeWorkspace = null as unknown as typeof mockCtx.activeWorkspace;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    render(<AutomationsPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('opens the create modal when New automation is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    const user = userEvent.setup();
    render(<AutomationsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading automations')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'New automation' }));
    expect(screen.getByRole('dialog', { name: 'New automation' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Automation name' })).toBeInTheDocument();
  });

  it('creates an automation via POST and adds it to the list', async () => {
    const newAuto = fakeAuto({ id: 'auto-new', name: 'Daily digest' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if ((init as RequestInit | undefined)?.method === 'POST') return ok(newAuto, 201);
      return ok([]);
    });
    const user = userEvent.setup();
    render(<AutomationsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading automations')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'New automation' }));
    await screen.findByRole('dialog', { name: 'New automation' });
    await user.type(screen.getByRole('textbox', { name: 'Automation name' }), 'Daily digest');
    await user.click(screen.getByRole('button', { name: 'Create automation' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/automations`),
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('workspace switch reloads automations', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    const { rerender } = render(<AutomationsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    mockCtx.activeWorkspace = { id: 'ws-other', name: 'Other WS', type: 'COMPANY' };
    rerender(<AutomationsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain('ws-other');
  });
});
