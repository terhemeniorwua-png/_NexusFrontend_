import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';
import { getUserProfile, updateUserProfile } from '@/services/profile';

const { mockRouter } = vi.hoisted(() => ({ mockRouter: { replace: vi.fn() } }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, getAccessToken: vi.fn(() => 'access-token') };
});
vi.mock('@/services/auth', () => ({ refreshSession: vi.fn() }));
vi.mock('@/components/profile/AccountSecurity', () => ({ AccountSecurity: () => null }));
vi.mock('@/services/profile', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
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
    expect(await screen.findByRole('textbox', { name: 'Email address' })).toHaveValue('ada@example.com');
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveAttribute('readonly');
    expect(getUserProfile).toHaveBeenCalledOnce();
  });

  it('saves profile changes through the established profile API contract', async () => {
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
      avatarUrl: null,
      timeZone: 'Africa/Lagos',
      locale: 'en',
    });
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
