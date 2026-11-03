import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Sidebar } from '../Sidebar';
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

const sections: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'home', label: 'Home', href: '/' },
      { id: 'projects', label: 'Projects', href: '/projects' },
      {
        id: 'messages',
        label: 'Messages',
        href: '/messages',
        badgeCount: 3,
        badgeLabel: 'unread messages',
      },
      {
        id: 'billing',
        label: 'Billing',
        href: '/billing',
        permissions: ['billing:read'],
      },
    ],
  },
];

function renderSidebar(overrides: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <Sidebar
      id="app-sidebar"
      sections={sections}
      activePath="/projects/42"
      workspaceKind="company"
      permissions={[]}
      collapsed={false}
      onToggleCollapsed={vi.fn()}
      mobileOpen={false}
      onMobileClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe('Sidebar', () => {
  it('renders accessible navigation with the active item marked', () => {
    renderSidebar();

    const navigation = screen.getByRole('navigation', {
      name: 'Main navigation',
    });
    expect(navigation).toBeInTheDocument();

    const projects = screen.getByRole('link', { name: 'Projects' });
    expect(projects).toHaveAttribute('aria-current', 'page');

    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('hides navigation items the workspace permissions do not cover', () => {
    renderSidebar();

    expect(
      screen.queryByRole('link', { name: 'Billing' }),
    ).not.toBeInTheDocument();
  });

  it('shows permission-gated items when the permission is granted', () => {
    renderSidebar({ permissions: ['billing:read'] });

    expect(screen.getByRole('link', { name: 'Billing' })).toBeInTheDocument();
  });

  it('renders an item badge with an accessible description', () => {
    renderSidebar({ activePath: '/projects' });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('3 unread messages')).toBeInTheDocument();
  });

  it('keeps labels accessible but visually hidden when collapsed', () => {
    renderSidebar({ collapsed: true });

    const projects = screen.getByRole('link', { name: 'Projects' });
    expect(projects).toBeInTheDocument();
    expect(screen.getByText('Projects')).toHaveClass('sr-only');
  });

  it('shows labels in the mobile drawer even when the desktop sidebar is collapsed', () => {
    renderSidebar({ collapsed: true, mobileOpen: true });

    expect(screen.getByText('Projects')).not.toHaveClass('sr-only');
  });

  it('renders an empty state when no sections are visible', () => {
    renderSidebar({
      sections: [],
    });

    expect(screen.getByText('No navigation available')).toBeInTheDocument();
  });

  it('calls the collapse toggle', async () => {
    const user = userEvent.setup();
    const onToggleCollapsed = vi.fn();
    renderSidebar({ onToggleCollapsed });

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it('exposes an expand control when collapsed', () => {
    renderSidebar({ collapsed: true });

    expect(
      screen.getByRole('button', { name: 'Expand sidebar' }),
    ).toBeInTheDocument();
  });

  it('closes the drawer from the mobile close button', async () => {
    const user = userEvent.setup();
    const onMobileClose = vi.fn();
    renderSidebar({ mobileOpen: true, onMobileClose });

    await user.click(screen.getByRole('button', { name: 'Close navigation' }));

    expect(onMobileClose).toHaveBeenCalledTimes(1);
  });

  it('notifies the caller after a navigation link is activated', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });

    await user.click(screen.getByRole('link', { name: 'Projects' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('renders header and footer slots', () => {
    renderSidebar({
      headerSlot: <span>Workspace switcher</span>,
      footerSlot: <span>Sidebar footer</span>,
    });

    expect(screen.getByText('Workspace switcher')).toBeInTheDocument();
    expect(screen.getByText('Sidebar footer')).toBeInTheDocument();
  });

  it('waits for permissions before showing restricted items', async () => {
    // Unknown permissions are treated as not granted, so restricted items are
    // absent rather than briefly visible.
    renderSidebar({ permissions: undefined });

    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Billing' }),
      ).not.toBeInTheDocument(),
    );
  });
});
