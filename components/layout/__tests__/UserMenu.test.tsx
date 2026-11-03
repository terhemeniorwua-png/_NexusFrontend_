import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '../UserMenu';

const user = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
};

describe('UserMenu', () => {
  it('renders the account trigger with the user identity', () => {
    render(
      <UserMenu
        user={user}
        items={[{ id: 'profile', label: 'Profile' }]}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Account menu for Ada Lovelace/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('renders caller-supplied account destinations', async () => {
    const onProfile = vi.fn();
    const userEventInstance = userEvent.setup();

    render(
      <UserMenu
        user={user}
        items={[
          {
            id: 'profile',
            label: 'Profile',
            onSelect: onProfile,
          },
        ]}
      />,
    );

    await userEventInstance.click(
      screen.getByRole('button', { name: /Account menu for Ada Lovelace/ }),
    );
    await userEventInstance.click(
      screen.getByRole('menuitem', { name: 'Profile' }),
    );

    expect(onProfile).toHaveBeenCalledTimes(1);
  });

  it('shows a destructive sign-out action only when a handler is supplied', async () => {
    const onSignOut = vi.fn();
    const userEventInstance = userEvent.setup();
    const { unmount } = render(
      <UserMenu user={user} items={[{ id: 'profile', label: 'Profile' }]} />,
    );

    await userEventInstance.click(
      screen.getByRole('button', { name: /Account menu for Ada Lovelace/ }),
    );
    expect(
      screen.queryByRole('menuitem', { name: 'Sign out' }),
    ).not.toBeInTheDocument();

    unmount();
    render(<UserMenu user={user} onSignOut={onSignOut} />);
    await userEventInstance.click(
      screen.getByRole('button', { name: /Account menu for Ada Lovelace/ }),
    );
    const signOut = screen.getByRole('menuitem', { name: 'Sign out' });

    expect(signOut).toHaveClass('text-[var(--color-error)]');
    await userEventInstance.click(signOut);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('renders a static identity instead of an empty menu', () => {
    render(<UserMenu user={user} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('hides the text details when compact', () => {
    render(
      <UserMenu
        user={user}
        items={[{ id: 'profile', label: 'Profile' }]}
        compact
      />,
    );

    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Account menu for Ada Lovelace/ }),
    ).toBeInTheDocument();
  });
});
