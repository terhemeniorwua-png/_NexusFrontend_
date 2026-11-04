import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPage } from '../AuthPage';

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), push: vi.fn() } }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

describe('account selection authentication flow', () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.push.mockReset();
  });

  it.each([
    ['Personal account', 'personal'],
    ['Institution account', 'institution'],
    ['Business account', 'business'],
  ])('selecting %s opens its registration form', async (label, type) => {
    const user = userEvent.setup();
    render(<AuthPage mode="sign-up" />);
    await user.click(screen.getByRole('button', { name: new RegExp(label) }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change account type/ })).toBeInTheDocument();
    if (type === 'business') expect(screen.getByRole('heading', { name: 'Create a business account' })).toBeInTheDocument();
    else if (type === 'institution') expect(screen.getByRole('heading', { name: 'Create an institution account' })).toBeInTheDocument();
    else expect(screen.getByRole('heading', { name: 'Create your Nexus account' })).toBeInTheDocument();
  });

  it('preserves sign-in intent and selected type while switching to registration', async () => {
    const user = userEvent.setup();
    render(<AuthPage mode="sign-in" />);
    await user.click(screen.getByRole('button', { name: /Institution account/ }));
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(screen.getByRole('heading', { name: 'Create an institution account' })).toBeInTheDocument();
    expect(screen.getByText(/Institution account ·/)).toBeInTheDocument();
  });

  it('returns to account selection without changing the current intent', async () => {
    const user = userEvent.setup();
    render(<AuthPage mode="sign-up" />);
    await user.click(screen.getByRole('button', { name: /Personal account/ }));
    await user.click(screen.getByRole('button', { name: /Change account type/ }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Choose how you plan to start with Nexus.')).toBeInTheDocument();
  });

  it('closes the selector and returns to the landing page', async () => {
    const user = userEvent.setup();
    render(<AuthPage mode="sign-in" />);
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
