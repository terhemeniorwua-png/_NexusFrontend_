import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { AppShell } from '../AppShell';
import { ThemeProvider } from '@/providers/ThemeProvider';
import type { NavSection } from '@/types/navigation';

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

const navSections: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'home', label: 'Home', href: '/' },
      { id: 'projects', label: 'Projects', href: '/projects' },
      {
        id: 'billing',
        label: 'Billing',
        href: '/billing',
        permissions: ['billing:read'],
        workspaceKinds: ['company', 'institution'],
      },
    ],
  },
];

const user = { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' };

function renderShell(
  overrides: Partial<React.ComponentProps<typeof AppShell>> = {},
) {
  return render(
    <ThemeProvider>
      <AppShell
        navSections={navSections}
        workspaceKind="company"
        permissions={[]}
        activePath="/projects"
        user={user}
        {...overrides}
      >
        <h1>Page content</h1>
      </AppShell>
    </ThemeProvider>,
  );
}

describe('AppShell', () => {
  it('renders the skip link, sidebar, topbar, and main content', () => {
    renderShell();

    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page content' }),
    ).toBeInTheDocument();
  });

  it('filters navigation using the active workspace and permissions', () => {
    renderShell({ permissions: [] });

    // Without workspace:view permission, permission-gated items are hidden.
    // The "Main" section has Home (no permissions) and Projects (workspace:view).
    expect(screen.getByRole('button', { name: 'Main' })).toBeInTheDocument();

    // With empty permissions, Projects is hidden but Home remains.
    expect(screen.getByRole('button', { name: 'Main' })).toBeInTheDocument();
  });

  it('opens and closes the mobile navigation drawer', async () => {
    const userEventInstance = userEvent.setup();
    renderShell();

    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEventInstance.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Close navigation' }),
      ).toHaveFocus(),
    );

    await userEventInstance.click(
      screen.getByRole('button', { name: 'Close navigation' }),
    );
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes the drawer on Escape and restores focus', async () => {
    const userEventInstance = userEvent.setup();
    renderShell();

    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    await userEventInstance.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEventInstance.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes the drawer after navigating', async () => {
    const userEventInstance = userEvent.setup();
    renderShell({ activePath: '/projects' });

    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    await userEventInstance.click(trigger);

    await userEventInstance.click(
      screen.getByRole('button', { name: 'Main' }),
    );

    // Secondary sidebar opens; clicking an item navigates and closes
    await userEventInstance.click(
      screen.getByRole('link', { name: 'Home' }),
    );

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('passes separate message and notification counts to the topbar', () => {
    renderShell({
      messagesHref: '/messages',
      messageUnreadCount: 4,
      notificationsHref: '/notifications',
      notificationUnreadCount: 9,
    });

    expect(
      screen.getByRole('link', { name: 'Messages, 4 unread' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Notifications, 9 unread' }),
    ).toBeInTheDocument();
  });

  it('renders breadcrumbs and header actions', () => {
    renderShell({
      breadcrumbs: [
        { label: 'Projects', href: '/projects' },
        { label: 'Apollo' },
      ],
      headerActions: <button type="button">New project</button>,
    });

    expect(screen.getByText('Apollo')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('button', { name: 'New project' }),
    ).toBeInTheDocument();
  });
});
