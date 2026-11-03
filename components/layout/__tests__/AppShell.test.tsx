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

const workspaces = [
  { id: 'ws-1', name: 'Acme Corp', kind: 'company' as const },
  { id: 'ws-2', name: 'Personal', kind: 'individual' as const },
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
        workspaces={workspaces}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={vi.fn()}
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

    expect(
      screen.queryByRole('link', { name: 'Billing' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
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
      screen.getByRole('link', { name: 'Projects' }),
    );

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles the desktop sidebar collapse state', async () => {
    const userEventInstance = userEvent.setup();
    renderShell();

    const collapse = screen.getByRole('button', {
      name: 'Collapse sidebar',
    });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');

    await userEventInstance.click(collapse);

    expect(
      screen.getByRole('button', { name: 'Expand sidebar' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the workspace switcher and switches workspace', async () => {
    const userEventInstance = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    renderShell({ onWorkspaceChange });

    await userEventInstance.click(
      screen.getByRole('button', { name: /Switch workspace: Acme Corp/ }),
    );
    await userEventInstance.click(
      screen.getByRole('menuitem', { name: 'Personal' }),
    );

    expect(onWorkspaceChange).toHaveBeenCalledWith('ws-2');
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
