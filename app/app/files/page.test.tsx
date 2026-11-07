import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FilesPage from './page';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const WS_ID = 'ws-test-456';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/files',
}));

const mockCtx = {
  activeWorkspace: { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const },
  workspaces: [],
  user: { id: 'user-1', name: 'Ada', email: 'ada@test.com' },
  loading: false,
  switchToWorkspace: vi.fn(),
};
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mockCtx }));

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const fakeFile = {
  id: 'file-1',
  workspaceId: WS_ID,
  projectId: null,
  taskId: null,
  uploadedById: 'user-1',
  fileName: 'design.png',
  mimeType: 'image/png',
  sizeBytes: 204800,
  createdAt: new Date().toISOString(),
};

const fakeUsage = { totalBytes: 204800, fileCount: 1 };

function routeMock(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (url: RequestInfo | URL, init?: RequestInit) => impl(String(url), init),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FilesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
    mockCtx.user = { id: 'user-1', name: 'Ada', email: 'ada@test.com' };
  });

  it('renders the page heading', async () => {
    routeMock((url) => {
      if (url.includes('/usage')) return ok(fakeUsage);
      return ok({ items: [], nextCursor: null, totalBytes: 0 });
    });
    render(<FilesPage />);
    expect(screen.getByRole('heading', { name: 'Files', level: 1 })).toBeInTheDocument();
  });

  it('shows empty state when there is no active workspace', () => {
    mockCtx.activeWorkspace = null as unknown as typeof mockCtx.activeWorkspace;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('should not fetch'));
    render(<FilesPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('loads and displays files via GET /workspaces/:id/files', async () => {
    const fetchMock = routeMock((url) => {
      if (url.includes('/usage')) return ok(fakeUsage);
      return ok({ items: [fakeFile], nextCursor: null, totalBytes: fakeFile.sizeBytes });
    });
    render(<FilesPage />);
    expect(await screen.findByText('design.png')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/backend/workspaces/${WS_ID}/files`),
      expect.any(Object),
    );
  });

  it('shows the storage usage bar', async () => {
    routeMock((url) => {
      if (url.includes('/usage')) return ok(fakeUsage);
      return ok({ items: [fakeFile], nextCursor: null, totalBytes: fakeFile.sizeBytes });
    });
    render(<FilesPage />);
    expect(await screen.findByRole('progressbar', { name: /storage used/i })).toBeInTheDocument();
    expect(screen.getByText(/200 KB used · 1 file/)).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<FilesPage />);
    expect(screen.getByLabelText('Loading files')).toBeInTheDocument();
    resolve(ok({ items: [], nextCursor: null, totalBytes: 0 }));
  });

  it('shows an error alert with Retry when loading fails', async () => {
    routeMock(() => fail('INTERNAL_ERROR', 'Storage unavailable', 503));
    render(<FilesPage />);
    expect(await screen.findByText('Storage unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows empty state when workspace has no files', async () => {
    routeMock((url) => {
      if (url.includes('/usage')) return ok({ totalBytes: 0, fileCount: 0 });
      return ok({ items: [], nextCursor: null, totalBytes: 0 });
    });
    render(<FilesPage />);
    expect(await screen.findByText('No files yet')).toBeInTheDocument();
  });

  it('shows the upload drop zone and file input accepts the allowed MIME types', async () => {
    routeMock((url) => {
      if (url.includes('/usage')) return ok({ totalBytes: 0, fileCount: 0 });
      return ok({ items: [], nextCursor: null, totalBytes: 0 });
    });
    render(<FilesPage />);
    await screen.findByText('No files yet');
    // Drop zone is present
    expect(screen.getByRole('button', { name: /Upload file/i })).toBeInTheDocument();
    // The hidden file input exists with the right accept attribute
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('accept')).toContain('application/pdf');
    expect(input?.getAttribute('accept')).toContain('image/png');
  });

  it('deletes a file after confirm dialog', async () => {
    const fetchMock = routeMock((url, init) => {
      if (url.includes('/usage')) return ok(fakeUsage);
      if (init?.method === 'DELETE') return ok({ ok: true });
      return ok({ items: [fakeFile], nextCursor: null, totalBytes: fakeFile.sizeBytes });
    });
    const user = userEvent.setup();
    render(<FilesPage />);
    await screen.findByText('design.png');
    await user.click(screen.getByRole('button', { name: /Delete design\.png/i }));
    // ConfirmDialog should appear
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Delete "design\.png"/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS_ID}/files/${fakeFile.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    ));
    // File disappears from the list
    await waitFor(() => expect(screen.queryByText('design.png')).not.toBeInTheDocument());
  });

  it('shows a delete error when the server returns 403', async () => {
    routeMock((url, init) => {
      if (url.includes('/usage')) return ok(fakeUsage);
      if (init?.method === 'DELETE') return fail('FILE_DELETE_FORBIDDEN', 'You can only delete your own files', 403);
      return ok({ items: [fakeFile], nextCursor: null, totalBytes: fakeFile.sizeBytes });
    });
    const user = userEvent.setup();
    render(<FilesPage />);
    await screen.findByText('design.png');
    await user.click(screen.getByRole('button', { name: /Delete design\.png/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('You can only delete your own files')).toBeInTheDocument();
  });

  it('renders the upload drop zone with accessible label', async () => {
    routeMock((url) => {
      if (url.includes('/usage')) return ok({ totalBytes: 0, fileCount: 0 });
      return ok({ items: [], nextCursor: null, totalBytes: 0 });
    });
    render(<FilesPage />);
    expect(await screen.findByRole('button', { name: /Upload file/i })).toBeInTheDocument();
    expect(screen.getByText(/Drop a file here/)).toBeInTheDocument();
  });
});
