/**
 * app/app/forms/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FormsPage from './page';

const WS_ID = 'ws-forms-test';
const USER_ID = 'user-1';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/forms',
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

function fakeForm(overrides: Partial<{ id: string; title: string; status: string; createdById: string }> = {}) {
  return {
    id: 'form-1',
    workspaceId: WS_ID,
    createdById: USER_ID,
    title: 'Customer Survey',
    description: 'Please fill this out',
    status: 'DRAFT',
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { responses: 5 },
    ...overrides,
  };
}

describe('FormsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
    mockCtx.user = { id: USER_ID, name: 'Ada', email: 'ada@test.com' };
  });

  it('renders the page heading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ items: [fakeForm()], nextCursor: null }));
    render(<FormsPage />);
    expect(screen.getByRole('heading', { name: 'Forms', level: 1 })).toBeInTheDocument();
  });

  it('shows empty state when no workspace is selected', () => {
    mockCtx.activeWorkspace = null as unknown as typeof mockCtx.activeWorkspace;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no fetch'));
    render(<FormsPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('calls GET /workspaces/:id/forms on mount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeForm()], nextCursor: null }),
    );
    render(<FormsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/backend/workspaces/${WS_ID}/forms`),
      expect.any(Object),
    ));
  });

  it('shows loading skeletons while fetching', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<FormsPage />);
    expect(screen.getByLabelText('Loading forms')).toBeInTheDocument();
    resolve(ok({ items: [], nextCursor: null }));
  });

  it('renders form items after load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeForm()], nextCursor: null }),
    );
    render(<FormsPage />);
    expect(await screen.findByText('Customer Survey')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    // Response count may be split across elements — use regex
    expect(screen.getByText(/5 response/)).toBeInTheDocument();
  });

  it('shows empty state when there are no forms', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ items: [], nextCursor: null }));
    render(<FormsPage />);
    expect(await screen.findByText('No forms found')).toBeInTheDocument();
  });

  it('shows an error alert with Retry when loading fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('INTERNAL_ERROR', 'Server error', 500));
    render(<FormsPage />);
    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows AccessState for 401 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('UNAUTHORIZED', 'Unauthorized', 401));
    render(<FormsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading forms')).not.toBeInTheDocument());
    expect(screen.queryByText('Customer Survey')).not.toBeInTheDocument();
  });

  it('opens the create form modal when New form is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ items: [], nextCursor: null }));
    const user = userEvent.setup();
    render(<FormsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading forms')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'New form' }));
    expect(screen.getByRole('dialog', { name: 'New form' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Form title' })).toBeInTheDocument();
  });

  it('creates a form via POST and adds it to the list', async () => {
    const newForm = fakeForm({ id: 'form-new', title: 'Product Feedback' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if ((init as RequestInit | undefined)?.method === 'POST') return ok(newForm, 201);
      return ok({ items: [], nextCursor: null });
    });
    const user = userEvent.setup();
    render(<FormsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading forms')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'New form' }));
    const dialog = await screen.findByRole('dialog', { name: 'New form' });
    const titleInput = dialog.querySelector('#cf-title') as HTMLInputElement;
    expect(titleInput).toBeTruthy();
    await user.type(titleInput, 'Product Feedback');
    await user.click(screen.getByRole('button', { name: 'Create form' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS_ID}/forms`,
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('shows Publish button for draft forms created by current user', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeForm({ status: 'DRAFT', createdById: USER_ID })], nextCursor: null }),
    );
    render(<FormsPage />);
    expect(await screen.findByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  it('workspace switch reloads forms', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null }),
    );
    const { rerender } = render(<FormsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    mockCtx.activeWorkspace = { id: 'ws-other', name: 'Other WS', type: 'COMPANY' };
    rerender(<FormsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain('ws-other');
  });
});
