import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditLogPage from './page';

const WORKSPACE_ID = 'ws-audit-123';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/audit',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...rest}>{children}</a>,
}));

const mockCtx = {
  activeWorkspace: { id: WORKSPACE_ID, name: 'Acme', type: 'COMPANY' as const },
  workspaces: [],
  user: null,
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

function fail(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ENTRY = {
  id: 'audit-1',
  action: 'member_role_changed',
  targetType: 'WorkspaceMembership',
  targetId: 'member-1',
  actor: { id: 'user-1', name: 'Ada Lovelace' },
  metadata: { from: 'MEMBER', to: 'ADMIN' },
  createdAt: new Date().toISOString(),
};

function mockApi(auditItems = [ENTRY], nextCursor: string | null = null) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
    const u = String(url);
    if (u.includes('/audit')) return ok({ items: auditItems, nextCursor });
    if (u.includes('/members')) return ok([]);
    return ok({});
  });
}

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCtx.activeWorkspace = { id: WORKSPACE_ID, name: 'Acme', type: 'COMPANY' };
  });

  it('loads audit entries from the workspace audit endpoint', async () => {
    const fetchMock = mockApi();
    render(<AuditLogPage />);
    expect(await screen.findByText('Member Role Changed')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/backend/workspaces/${WORKSPACE_ID}/audit`),
      expect.any(Object),
    );
  });

  it('expands an entry to show metadata details', async () => {
    mockApi();
    const user = userEvent.setup();
    render(<AuditLogPage />);
    await user.click(await screen.findByText('Member Role Changed'));
    expect(screen.getByText('from:')).toBeInTheDocument();
    expect(screen.getByText('MEMBER')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('sends the action search to the API after debouncing', async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    render(<AuditLogPage />);
    await screen.findByText('Member Role Changed');
    await user.type(screen.getByLabelText('Search actions'), 'role');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('action=role'),
      expect.any(Object),
    ), { timeout: 2000 });
  });

  it('shows the access state for a 403 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/audit')) return fail('FORBIDDEN', 'Not allowed', 403);
      return ok([]);
    });
    render(<AuditLogPage />);
    expect(await screen.findByText('You do not have access')).toBeInTheDocument();
  });

  it('shows an empty state when there are no entries', async () => {
    mockApi([], null);
    render(<AuditLogPage />);
    expect(await screen.findByText('No audit entries yet')).toBeInTheDocument();
  });

  it('shows an empty state when there is no active workspace', () => {
    mockCtx.activeWorkspace = null as unknown as typeof mockCtx.activeWorkspace;
    render(<AuditLogPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });
});
