'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';
import type { DropdownItem } from '@/components/ui/Dropdown';
import type {
  CurrentUserSummary,
  NavSection,
  WorkspaceKind,
  WorkspaceSummary,
} from '@/types/navigation';

/** DOM id shared by the sidebar and the topbar menu button. */
const SIDEBAR_ID = 'app-sidebar';

interface AppShellProps {
  children: React.ReactNode;

  /** Navigation data for the active workspace. */
  navSections: NavSection[];
  /** Active workspace kind, used to scope navigation groups. */
  workspaceKind: WorkspaceKind;
  /** Backend-supplied permission keys for the active workspace. */
  permissions?: string[];
  /** Current pathname, used for the active navigation state. */
  activePath: string;

  /** Workspaces the user can switch to. */
  workspaces: WorkspaceSummary[];
  /** Active workspace id. */
  activeWorkspaceId: string;
  /** Called with the selected workspace id; the caller performs the switch. */
  onWorkspaceChange: (workspaceId: string) => void;

  /** Current user identity. */
  user: CurrentUserSummary;
  /** Account destinations such as Profile and Settings. */
  userMenuItems?: DropdownItem[];
  /** Called when the user chooses to sign out. */
  onSignOut?: () => void;

  /** Page title shown when no breadcrumbs are supplied. */
  title?: string;
  /** Breadcrumb trail for the active route. */
  breadcrumbs?: BreadcrumbItem[];

  /** Opens the global search experience. */
  onOpenSearch?: () => void;
  /** Alternative search entry point when search is a route. */
  searchHref?: string;
  /** Destination of the messages area. */
  messagesHref?: string;
  /** Unread message count. Kept separate from general notifications. */
  messageUnreadCount?: number;
  /** Destination of the general notification centre. */
  notificationsHref?: string;
  /** Unread general notification count. Never includes message activity. */
  notificationUnreadCount?: number;

  /** Additional page-level controls for the topbar. */
  headerActions?: React.ReactNode;
  /** Secondary sidebar content above the collapse control. */
  sidebarFooter?: React.ReactNode;

  /** Initial desktop sidebar state. Defaults to expanded. */
  defaultCollapsed?: boolean;
  className?: string;
}

/**
 * AppShell — shared authenticated page structure.
 *
 * Composes the workspace switcher, sidebar, topbar, and main content region.
 * It owns only layout state: the mobile drawer and the desktop collapse state.
 * Application state (session, active workspace, permissions, unread counts)
 * is supplied by the caller so the shell can be adopted without assuming a
 * backend contract that is not confirmed yet.
 */
export function AppShell({
  children,
  navSections,
  workspaceKind,
  permissions,
  activePath,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  user,
  userMenuItems,
  onSignOut,
  title,
  breadcrumbs,
  onOpenSearch,
  searchHref,
  messagesHref,
  messageUnreadCount = 0,
  notificationsHref,
  notificationUnreadCount = 0,
  headerActions,
  sidebarFooter,
  defaultCollapsed = false,
  className = '',
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Close the drawer on Escape and return focus to the trigger.
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Move focus into the drawer when it opens.
  useEffect(() => {
    if (mobileOpen) closeButtonRef.current?.focus();
  }, [mobileOpen]);

  // Prevent the page behind the drawer from scrolling.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div
      className={[
        'flex min-h-dvh w-full bg-[var(--color-background)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <a
        href="#main-content"
        className={[
          'sr-only focus:not-sr-only',
          'focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)]',
          'focus:rounded-[var(--radius-md)] focus:bg-[var(--color-surface)]',
          'focus:px-4 focus:py-2 focus:text-sm focus:font-medium',
          'focus:text-[var(--color-text-primary)] focus:shadow-[var(--shadow-lg)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]',
        ].join(' ')}
      >
        Skip to main content
      </a>

      <Sidebar
        id={SIDEBAR_ID}
        sections={navSections}
        activePath={activePath}
        workspaceKind={workspaceKind}
        permissions={permissions}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
        onNavigate={() => setMobileOpen(false)}
        closeButtonRef={closeButtonRef}
        headerSlot={
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onWorkspaceChange={onWorkspaceChange}
            collapsed={collapsed && !mobileOpen}
          />
        }
        footerSlot={sidebarFooter}
      />

      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={closeMobile}
          className={[
            'fixed inset-0 z-[var(--z-sidebar-backdrop)] bg-black/40 lg:hidden',
            'animate-[nx-fade-in_var(--duration-fast)_var(--ease-standard)]',
          ].join(' ')}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          breadcrumbs={breadcrumbs}
          onOpenSearch={onOpenSearch}
          searchHref={searchHref}
          messagesHref={messagesHref}
          messageUnreadCount={messageUnreadCount}
          notificationsHref={notificationsHref}
          notificationUnreadCount={notificationUnreadCount}
          onOpenNavigation={() => setMobileOpen(true)}
          navigationOpen={mobileOpen}
          navigationId={SIDEBAR_ID}
          menuButtonRef={menuButtonRef}
          user={user}
          userMenuItems={userMenuItems}
          onSignOut={onSignOut}
          actions={headerActions}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
