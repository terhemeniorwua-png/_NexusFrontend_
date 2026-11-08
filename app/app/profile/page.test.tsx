import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';
import { getUserProfile, updateUserProfile } from '@/services/profile';

const { mockRouter, mockSetAvatarUrl } = vi.hoisted(() => ({
  mockRouter: { replace: vi.fn() },
  mockSetAvatarUrl: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => mockRouter }));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, getAccessToken: vi.fn(() => 'access-token') };
});

vi.mock('@/services/auth', () => ({ refreshSession: vi.fn() }));

vi.mock('@/components/profile/AccountSecurity', () => ({ AccountSecurity: () => null }));

// Stub AvatarUpload so profile page tests don't need full upload machinery.
vi.mock('@/components/profile/AvatarUpload', () => ({
  AvatarUpload: ({ avatarUrl, name }: { avatarUrl: string | null; name: string }) => (
    <div data-testid="avatar-upload" data-avatar-url={avatarUrl ?? ''} data-name={name} />
  ),
}));

vi.mock('@/services/profile', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({
    user: profile.user,
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

// Use a stable hoisted mock for setAvatarUrl so it doesn't cause effect re-runs.
vi.mock('@/providers/AvatarUrlProvider', () => ({
  useAvatarUrl: () => ({ avatarUrl: null, setAvatarUrl: mockSetAvatarUrl }),
}));

const profile = {
  user: {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    status: 'ACTIVE',
    emailVerifiedAt: '2026-10-01T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  profile: {
    bio: null,
    jobTitle: 'Mathematician',
    avatarUrl: null,
    timeZone: 'Africa/Lagos',
    locale: 'en',
  },
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserProfile).mockResolvedValue(profile);
    vi.mocked(updateUserProfile).mockResolvedValue(profile);
  });

  it('loads the authenticated profile and keeps email read-only', async () => {
    render(<ProfilePage />);

    expect(await screen.findByRole('textbox', { name: 'Full name' })).toHaveValue('Ada Lovelace');
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveValue('ada@example.com');
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveAttribute('readonly');
    expect(getUserProfile).toHaveBeenCalledOnce();
  });

  it('renders the AvatarUpload component instead of a URL input', async () => {
    render(<ProfilePage />);

    await screen.findByRole('textbox', { name: 'Full name' }); // wait for load
    expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
    expect(screen.queryByLabelText(/avatar.*url/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/avatar image url/i)).not.toBeInTheDocument();
  });

  it('saves profile changes without including avatarUrl in the PATCH payload', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    const name = await screen.findByRole('textbox', { name: 'Full name' });
    await user.clear(name);
    await user.type(name, 'Ada Byron');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(updateUserProfile).toHaveBeenCalledWith({
      name: 'Ada Byron',
      bio: null,
      jobTitle: 'Mathematician',
      timeZone: 'Africa/Lagos',
      locale: 'en',
    });
    // avatarUrl must NOT be present in the payload.
    const call = vi.mocked(updateUserProfile).mock.calls[0]?.[0];
    expect(call).not.toHaveProperty('avatarUrl');

    expect(await screen.findByText('Your profile has been saved.')).toBeInTheDocument();
  });

  it('validates profile fields before sending an update', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    const name = await screen.findByRole('textbox', { name: 'Full name' });
    await user.clear(name);
    await user.type(name, 'A');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Name must be between 2 and 100 characters.');
    expect(updateUserProfile).not.toHaveBeenCalled();
  });
});
