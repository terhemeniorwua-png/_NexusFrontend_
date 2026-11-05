import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Topbar } from '../Topbar';
import { ThemeProvider } from '@/providers/ThemeProvider';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children?: ReactNode;
  }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        // jsdom does not implement document navigation.
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
}));

const user = { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' };

function renderTopbar(
  overrides: Partial<React.ComponentProps<typeof Topbar>> = {},
) {
  return render(
    <ThemeProvider>
      <Topbar
        user={user}
        onOpenNavigation={vi.fn()}
        navigationOpen={false}
        navigationId="app-sidebar"
        {...overrides}
      />
    </ThemeProvider>,
  );
}

describe('Topbar', () => {
  it('renders the mobile navigation trigger', async () => {
    const userEventInstance = userEvent.setup();
    const onOpenNavigation = vi.fn();
    renderTopbar({ onOpenNavigation });

    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'app-sidebar');

    await userEventInstance.click(trigger);
    expect(onOpenNavigation).toHaveBeenCalledTimes(1);
  });

  it('renders the global search entry point', async () => {
    const userEventInstance = userEvent.setup();
    const onOpenSearch = vi.fn();
    renderTopbar({ onOpenSearch });

    const search = screen.getByRole('button', { name: 'Open global search' });
    expect(search).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+K Meta+K',
    );

    await userEventInstance.click(search);
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it('keeps message and notification counts separate', () => {
    renderTopbar({
      messagesHref: '/messages',
      messageUnreadCount: 3,
      notificationsHref: '/notifications',
      notificationUnreadCount: 7,
    });

    const messages = screen.getByRole('link', {
      name: 'Messages, 3 unread',
    });
    const notifications = screen.getByRole('link', {
      name: 'Notifications, 7 unread',
    });

    expect(messages).toHaveAttribute('href', '/messages');
    expect(notifications).toHaveAttribute('href', '/notifications');
    expect(notifications).not.toHaveAccessibleName(/Messages/);
  });

  it('renders a breadcrumb trail with a current page', () => {
    renderTopbar({
      breadcrumbs: [
        { label: 'Projects', href: '/projects' },
        { label: 'Apollo' },
      ],
    });

    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Projects' }),
    ).toHaveAttribute('href', '/projects');
    expect(screen.getByText('Apollo')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('falls back to a page title when there are no breadcrumbs', () => {
    renderTopbar({ title: 'Dashboard' });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Breadcrumb' }),
    ).not.toBeInTheDocument();
  });

  it('omits optional entry points when no destination is supplied', () => {
    renderTopbar();

    expect(
      screen.queryByRole('button', { name: 'Open global search' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Messages/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Notifications/ }),
    ).not.toBeInTheDocument();
  });

  it('renders caller-supplied header actions', () => {
    renderTopbar({
      actions: <button type="button">New project</button>,
    });

    expect(
      screen.getByRole('button', { name: 'New project' }),
    ).toBeInTheDocument();
  });
});
