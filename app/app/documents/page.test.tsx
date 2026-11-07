import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DocumentsPage from './page';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const WS_ID = 'ws-doc-test';
const USER_ID = 'user-1';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/documents',
}));

const mockCtx = {
  activeWorkspace: { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const },
  workspaces: [],
  user: { id: USER_ID, name: 'Ada', email: 'ada@test.com' },
  loading: false,
  switchToWorkspace: vi.fn(),
};
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mockCtx }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
function fail(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

function fakeDoc(overrides: Partial<{ id: string; title: string }> = {}) {
  return {
    id: 'doc-1', workspaceId: WS_ID, projectId: null, taskId: null,
    title: 'Meeting Notes', content: 'Action items', authorId: USER_ID, authorName: 'Ada',
    revisionCount: 1, commentCount: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function listOk(items = [fakeDoc()]) {
  return ok({ items, nextCursor: null });
}

// Route-aware mock
function routeMock(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (url: RequestInfo | URL, init?: RequestInit) => impl(String(url), init),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
    mockCtx.user = { id: USER_ID, name: 'Ada', email: 'ada@test.com' };
  });

  it('renders the page heading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    render(<DocumentsPage />);
    expect(screen.getByRole('heading', { name: 'Documents', level: 1 })).toBeInTheDocument();
  });

  it('shows empty state when there is no active workspace', () => {
    mockCtx.activeWorkspace = null as unknown as typeof mockCtx.activeWorkspace;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('should not fetch'));
    render(<DocumentsPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('loads and displays documents via GET /workspaces/:id/documents', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    render(<DocumentsPage />);
    expect(await screen.findByText('Meeting Notes')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/backend/workspaces/${WS_ID}/documents`),
      expect.any(Object),
    );
  });

  it('shows loading skeletons while fetching', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<DocumentsPage />);
    expect(screen.getByLabelText('Loading documents')).toBeInTheDocument();
    resolve(listOk());
  });

  it('shows an error alert with Retry when loading fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('INTERNAL_ERROR', 'Database error', 500));
    render(<DocumentsPage />);
    expect(await screen.findByText('Database error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows empty state when workspace has no documents', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ items: [], nextCursor: null }));
    render(<DocumentsPage />);
    expect(await screen.findByText('No documents yet')).toBeInTheDocument();
  });

  it('opens create form when New is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await screen.findByText('Meeting Notes');
    await user.click(screen.getByRole('button', { name: 'New' }));
    // Wait for the create form heading to appear
    expect(await screen.findByRole('heading', { name: 'New document' })).toBeInTheDocument();
  });

  it('creates a document via POST and adds it to the list', async () => {
    const newDoc = fakeDoc({ id: 'doc-new', title: 'Project Proposal' });
    const fetchMock = routeMock((url, init) => {
      if (init?.method === 'POST') return ok(newDoc, 201);
      return ok({ items: [fakeDoc()], nextCursor: null });
    });
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await screen.findByText('Meeting Notes');
    await user.click(screen.getByRole('button', { name: 'New' }));
    // Wait for form
    const titleInput = await screen.findByRole('textbox', { name: 'Title' });
    await user.type(titleInput, 'Project Proposal');
    await user.click(screen.getByRole('button', { name: 'Create document' }));
    await waitFor(() => expect(screen.getAllByText('Project Proposal').length).toBeGreaterThan(0));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS_ID}/documents`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows document detail when a document is selected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await screen.findByText('Meeting Notes');
    await user.click(screen.getByRole('button', { name: /Meeting Notes/ }));
    expect(screen.getByText('Action items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Comments/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Revisions/ })).toBeInTheDocument();
  });

  it('saves edits via PATCH /workspaces/:id/documents/:docId', async () => {
    const updated = fakeDoc({ title: 'Edited Notes' });
    const fetchMock = routeMock((url, init) => {
      if (init?.method === 'PATCH') return ok(updated);
      return ok({ items: [fakeDoc()], nextCursor: null });
    });
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await screen.findByText('Meeting Notes');
    await user.click(screen.getByRole('button', { name: /Meeting Notes/ }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const titleInput = screen.getByLabelText('Document title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Edited Notes');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/documents/doc-1`),
      expect.objectContaining({ method: 'PATCH' }),
    ));
  });

  it('deletes a document after confirm dialog', async () => {
    const fetchMock = routeMock((url, init) => {
      if (init?.method === 'DELETE') return ok({ ok: true });
      return ok({ items: [fakeDoc()], nextCursor: null });
    });
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await screen.findByText('Meeting Notes');
    await user.click(screen.getByRole('button', { name: /Meeting Notes/ }));
    // Click the Delete button in the detail header (aria-label="Delete")
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    // Confirm dialog appears
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Click the destructive confirm button inside the dialog
    await user.click(screen.getAllByRole('button', { name: 'Delete' }).slice(-1)[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/documents/doc-1'),
      expect.objectContaining({ method: 'DELETE' }),
    ));
    await waitFor(() => expect(screen.queryByText('Meeting Notes')).not.toBeInTheDocument());
  });

  it('calls list endpoint with search query after typing', async () => {
    // Test search wiring without fake timers — just verify the debounced call eventually fires
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null }),
    );
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await screen.findByLabelText('Search documents');
    await user.type(screen.getByLabelText('Search documents'), 'api');
    // Wait for debounce (400ms) plus some headroom
    await waitFor(() => {
      const calls = fetchMock.mock.calls.map(([url]) => String(url));
      expect(calls.some((u) => u.includes('search=api'))).toBe(true);
    }, { timeout: 2000 });
  });
});
