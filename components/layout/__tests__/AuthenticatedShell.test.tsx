import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthenticatedShell } from '../AuthenticatedShell';

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  pathname: '/app',
  signOut: vi.fn(),
  getUserProfile: vi.fn(),
  setAvatarUrl: vi.fn(),
  getOnboardingStatus: vi.fn(),
  context: {
    user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' } as { id: string; name: string; email: string } | null,
    workspaces: [] as Array<Record<string, unknown>>,
    activeWorkspace: null as Record<string, unknown> | null,
    loading: false,
    error: null as string | null,
    retry: vi.fn(),
    switchToWorkspace: vi.fn(),
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  usePathname: () => mocks.pathname,
}));
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mocks.context }));
vi.mock('@/providers/AvatarUrlProvider', () => ({ useAvatarUrl: () => ({ avatarUrl: null, setAvatarUrl: mocks.setAvatarUrl }) }));
vi.mock('@/services/auth', () => ({ signOut: mocks.signOut }));
vi.mock('@/services/profile', () => ({ getUserProfile: mocks.getUserProfile }));
vi.mock('@/services/notifications', () => ({ getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }) }));
vi.mock('@/services/onboarding', () => ({ getOnboardingStatus: mocks.getOnboardingStatus }));
vi.mock('@/components/onboarding/OnboardingModal', () => ({
  OnboardingModal: ({ open }: { open: boolean }) => (open ? <div data-testid="onboarding-modal">Onboarding modal</div> : null),
}));

const company: Record<string, unknown> = {
  id: 'workspace-company',
  name: 'PITERON Studio',
  slug: 'piteron-studio',
  description: null,
  type: 'COMPANY',
  isPersonal: false,
  visibility: 'PRIVATE',
  status: 'ACTIVE',
  ownerId: 'user-1',
  role: 'OWNER',
  organizationRole: 'COMPANY_OWNER',
  joinCodeEnabled: false,
  memberCount: 3,
  projectCount: 2,
  teamCount: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const personal: Record<string, unknown> = {
  ...company,
  id: 'workspace-personal',
  name: 'Personal',
  type: 'INDIVIDUAL',
  isPersonal: true,
  organizationRole: null,
};

describe('AuthenticatedShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/app';
    mocks.context.user = { id: 'user-1', name: 'Ada', email: 'ada@example.com' };
    mocks.context.workspaces = [personal, company];
    mocks.context.activeWorkspace = company;
    mocks.context.loading = false;
    mocks.context.error = null;
    mocks.context.retry = vi.fn();
    mocks.signOut.mockResolvedValue(undefined);
    mocks.getOnboardingStatus.mockResolvedValue({
      required: false,
      currentStep: 'done',
      completedAt: '2026-01-01T00:00:00.000Z',
      pendingLegal: [],
      aiAccessEnabled: false,
      skippedSteps: [],
    });
    mocks.getUserProfile.mockResolvedValue({
      user: { id: 'user-1', email: 'ada@example.com', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: null, createdAt: '' },
      profile: { bio: null, jobTitle: null, avatarUrl: null, timeZone: 'UTC', locale: 'en' },
    });
    window.localStorage.clear();
  });

  it('mounts the shared navigation for the active workspace', async () => {
    render(<ThemeProvider><AuthenticatedShell><p>Page body</p></AuthenticatedShell></ThemeProvider>);

    expect(await screen.findByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Workspace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Communication' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'People and access' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByText('Page body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch workspace: PITERON Studio' })).toBeInTheDocument();
  });

  it('switches workspace through the provider', async () => {
    const user = userEvent.setup();
    mocks.context.switchToWorkspace.mockResolvedValue(true);
    render(<ThemeProvider><AuthenticatedShell><p>Page body</p></AuthenticatedShell></ThemeProvider>);

    await user.click(await screen.findByRole('button', { name: 'Switch workspace: PITERON Studio' }));
    await user.click(screen.getByRole('menuitem', { name: 'Personal' }));

    expect(mocks.context.switchToWorkspace).toHaveBeenCalledWith('workspace-personal');
  });

  it('signs out through the account menu and returns to the landing page', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><AuthenticatedShell><p>Page body</p></AuthenticatedShell></ThemeProvider>);

    await user.click(await screen.findByRole('button', { name: 'Account menu for Ada' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.router.push).toHaveBeenCalledWith('/');
  });

  it('shows a loading status instead of the page while the session is loading', () => {
    mocks.context.loading = true;
    render(<ThemeProvider><AuthenticatedShell><p>Loading body</p></AuthenticatedShell></ThemeProvider>);

    expect(screen.getByRole('status')).toHaveTextContent('Loading your workspace');
    expect(screen.queryByText('Loading body')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it('shows a blocking setup error with retry and sign out when onboarding status fails', async () => {
    mocks.getOnboardingStatus.mockRejectedValueOnce(new Error('Network error'));

    render(<ThemeProvider><AuthenticatedShell><p>Protected content</p></AuthenticatedShell></ThemeProvider>);

    expect(await screen.findByText("Couldn't load your account setup")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it('retries onboarding status after an error and renders the app on recovery', async () => {
    const user = userEvent.setup();
    mocks.getOnboardingStatus
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        required: false,
        currentStep: 'done',
        completedAt: '2026-01-01T00:00:00.000Z',
        pendingLegal: [],
        aiAccessEnabled: false,
        skippedSteps: [],
      });

    render(<ThemeProvider><AuthenticatedShell><p>Recovered content</p></AuthenticatedShell></ThemeProvider>);

    await screen.findByText("Couldn't load your account setup");
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });

  it('shows the onboarding modal and blocks app content when onboarding is required', async () => {
    mocks.getOnboardingStatus.mockResolvedValueOnce({
      required: true,
      currentStep: 'welcome',
      completedAt: null,
      pendingLegal: [{ documentType: 'terms', version: '1.0' }],
      aiAccessEnabled: false,
      skippedSteps: [],
    });

    render(<ThemeProvider><AuthenticatedShell><p>Hidden content</p></AuthenticatedShell></ThemeProvider>);

    expect(await screen.findByTestId('onboarding-modal')).toBeInTheDocument();
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it('renders the app when onboarding is completed', async () => {
    mocks.getOnboardingStatus.mockResolvedValueOnce({
      required: false,
      currentStep: 'done',
      completedAt: '2026-01-01T00:00:00.000Z',
      pendingLegal: [],
      aiAccessEnabled: false,
      skippedSteps: [],
    });

    render(<ThemeProvider><AuthenticatedShell><p>Visible content</p></AuthenticatedShell></ThemeProvider>);

    expect(await screen.findByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByText('Visible content')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();
  });

  it('does not flash app children while onboarding status is loading', async () => {
    let resolveStatus!: (value: unknown) => void;
    mocks.getOnboardingStatus.mockReturnValueOnce(new Promise((resolve) => { resolveStatus = resolve; }));

    render(<ThemeProvider><AuthenticatedShell><p>Flash content</p></AuthenticatedShell></ThemeProvider>);

    expect(screen.getByRole('status', { name: 'Loading account setup' })).toBeInTheDocument();
    expect(screen.queryByText('Flash content')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();

    resolveStatus({
      required: false,
      currentStep: 'done',
      completedAt: '2026-01-01T00:00:00.000Z',
      pendingLegal: [],
      aiAccessEnabled: false,
      skippedSteps: [],
    });

    expect(await screen.findByText('Flash content')).toBeInTheDocument();
  });
});
