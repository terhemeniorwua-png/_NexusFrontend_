/**
 * app/app/settings/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './page';

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  getFileUsage: vi.fn(),
  getUserProfile: vi.fn(),
  activeWorkspace: {
    id: 'ws-1',
    name: 'Acme',
    type: 'COMPANY' as const,
    role: 'ADMIN' as const,
    organizationRole: 'ADMIN' as const,
    memberCount: 12,
    projectCount: 4,
    teamCount: 2,
  },
}));

vi.mock('@/providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'system', resolvedTheme: 'light', setTheme: mocks.setTheme }),
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace }),
}));

vi.mock('@/services/files', () => ({
  getFileUsage: mocks.getFileUsage,
  formatBytes: (bytes: number) => `${bytes} B`,
}));

vi.mock('@/services/profile', () => ({
  getUserProfile: mocks.getUserProfile,
}));

function profile() {
  return {
    user: {
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      status: 'ACTIVE',
      emailVerifiedAt: new Date().toISOString(),
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    profile: {
      bio: null,
      jobTitle: 'Engineer',
      avatarUrl: null,
      timeZone: 'Africa/Lagos',
      locale: 'en',
    },
  };
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = {
      id: 'ws-1',
      name: 'Acme',
      type: 'COMPANY',
      role: 'ADMIN',
      organizationRole: 'ADMIN',
      memberCount: 12,
      projectCount: 4,
      teamCount: 2,
    } as typeof mocks.activeWorkspace;
    mocks.getUserProfile.mockResolvedValue(profile());
    mocks.getFileUsage.mockResolvedValue({ totalBytes: 2048, fileCount: 3 });
  });

  it('renders the settings heading and all section tabs', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
    for (const label of ['Account', 'Appearance', 'Notifications', 'Workspace', 'Privacy and security']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('shows the loaded account summary', async () => {
    render(<SettingsPage />);
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
  });

  it('changes the theme from the appearance tab', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('tab', { name: 'Appearance' }));
    await user.click(screen.getByLabelText('Dark'));

    expect(mocks.setTheme).toHaveBeenCalledWith('dark');
  });

  it('links notification preferences to the preferences tab', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('tab', { name: 'Notifications' }));
    const link = screen.getByRole('link', { name: 'Manage preferences' });
    expect(link).toHaveAttribute('href', '/app/notifications?tab=preferences');
  });

  it('shows workspace storage usage and management links', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('tab', { name: 'Workspace' }));

    expect(await screen.findByText('2048 B')).toBeInTheDocument();
    expect(screen.getByText(/3 files stored/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage members' })).toHaveAttribute('href', '/app/members');
    expect(screen.getByRole('link', { name: 'Open billing' })).toHaveAttribute('href', '/app/billing');
  });

  it('shows an empty state when no workspace is active', async () => {
    const user = userEvent.setup();
    mocks.activeWorkspace = null as unknown as typeof mocks.activeWorkspace;
    render(<SettingsPage />);

    await user.click(screen.getByRole('tab', { name: 'Workspace' }));
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('shows an account error with a retry action', async () => {
    mocks.getUserProfile.mockRejectedValueOnce(new Error('nope'));
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Account details unavailable')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
