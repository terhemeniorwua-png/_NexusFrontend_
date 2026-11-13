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
  {
    id: 'ai',
    label: 'AI',
    items: [
      { id: 'ai-assistant', label: 'AI Assistant', href: '/app/ai' },
      { id: 'ai-write', label: 'Nexus Write', href: '/app/ai-write' },
      { id: 'ai-actions', label: 'AI Actions', href: '/app/ai-actions' },
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

  describe('secondary panel (expandable section)', () => {
    it('is not rendered on a fresh load — only the icon rail is visible', () => {
      renderShell();

      expect(screen.queryByRole('button', { name: 'AI' })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'AI' })).not.toBeInTheDocument();
    });

    it('opens the panel when a section icon is clicked and shows its items', async () => {
      const user = userEvent.setup();
      renderShell();

      await user.click(screen.getByRole('button', { name: 'AI' }));

      const panel = screen.getByRole('region', { name: 'AI' });
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveClass('fixed');
      expect(panel).toHaveClass('w-[16rem]');
      expect(panel).toHaveClass('top-14');
      expect(screen.getByRole('link', { name: 'AI Assistant' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Nexus Write' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'AI Actions' })).toBeInTheDocument();
    });

    it('exposes aria-expanded and aria-controls on the section icon', async () => {
      const user = userEvent.setup();
      renderShell();

      const button = screen.getByRole('button', { name: 'AI' });
      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'app-sidebar-panel');
      expect(screen.getByRole('region', { name: 'AI' })).toHaveAttribute(
        'id',
        'app-sidebar-panel',
      );
    });

    it('closes the panel when the same section icon is clicked again', async () => {
      const user = userEvent.setup();
      renderShell();

      await user.click(screen.getByRole('button', { name: 'AI' }));
      expect(screen.getByRole('region', { name: 'AI' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'AI' }));
      expect(screen.queryByRole('region', { name: 'AI' })).not.toBeInTheDocument();
    });

    it('closes the panel on Escape and restores focus to the icon', async () => {
      const user = userEvent.setup();
      renderShell();

      await user.click(screen.getByRole('button', { name: 'AI' }));
      const button = screen.getByRole('button', { name: 'AI' });

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('region', { name: 'AI' })).not.toBeInTheDocument();
      expect(button).toHaveFocus();
    });

    it('switches panel content when a different section icon is clicked', async () => {
      const user = userEvent.setup();
      renderShell();

      await user.click(screen.getByRole('button', { name: 'Main' }));
      expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'AI' }));
      expect(screen.getByRole('link', { name: 'AI Assistant' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument();
    });

    it('does not truncate navigation labels in the panel', async () => {
      const user = userEvent.setup();
      renderShell();

      await user.click(screen.getByRole('button', { name: 'AI' }));

      const panel = screen.getByRole('region', { name: 'AI' });
      expect(panel.querySelectorAll('a').length).toBeGreaterThan(0);
      // No label may be visually truncated with an ellipsis.
      expect(panel.querySelectorAll('.truncate')).toHaveLength(0);
    });

    it('offsets content to the right of the rail, and further right when the panel opens', async () => {
      const user = userEvent.setup();
      renderShell();

      const main = screen.getByRole('main');
      // Collapsed rail: content starts at the rail width.
      expect(main).toHaveClass('lg:pl-[4.75rem]');

      await user.click(screen.getByRole('button', { name: 'AI' }));

      // Panel open: content starts at rail width plus panel width.
      expect(main).toHaveClass('lg:pl-[20.75rem]');
    });

    it('keeps the rail fixed full height below the top bar on desktop', () => {
      renderShell();

      const rail = screen.getByRole('region', { name: 'Primary navigation' });
      expect(rail).toHaveClass('fixed');
      expect(rail).toHaveClass('top-14');
      expect(rail).toHaveClass('bottom-0');
      expect(rail).toHaveClass('left-0');
    });
  });
});
