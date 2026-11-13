'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { filterNavSections } from '@/lib/navigation';
import { Building2Icon, FolderKanbanIcon, MessageSquareIcon, BlocksIcon, ListIcon, SettingsIcon } from './icons';
import { PrimarySidebar } from './PrimarySidebar';
import { SecondarySidebar } from './SecondarySidebar';
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

/** Maps a navigation section id to its primary-sidebar icon. */
function iconForSection(sectionId: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    workspace: <Building2Icon size={16} />,
    work: <FolderKanbanIcon size={16} />,
    communication: <MessageSquareIcon size={16} />,
    ai: <BlocksIcon size={16} />,
    people: <ListIcon size={16} />,
    account: <SettingsIcon size={16} />,
  };
  return icons[sectionId] ?? <BlocksIcon size={16} />;
}

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
  workspaces?: WorkspaceSummary[];
  /** Active workspace id. */
  activeWorkspaceId?: string;
  /** Called with the selected workspace id; the caller performs the switch. */
  onWorkspaceChange?: (workspaceId: string) => void; /** Current user identity. */
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
 *
 * Layout (desktop):
 * - Topbar: fixed at the top, full width.
 * - Icon rail: fixed to the left, full viewport height below the topbar.
 * - Expanded panel: fixed below the topbar, next to the rail, never moves on scroll.
 * - Main content: offset below the topbar and to the right of the rail (plus the
 *   panel width when the panel is open). Only this area scrolls.
 *
 * Mobile: topbar stays at the top; rail and panel are off-canvas drawers opened
 * from the topbar menu button / section icon.
 */
export function AppShell({
  children,
  navSections,
  workspaceKind,
  permissions,
  activePath,
  workspaces = [],
  activeWorkspaceId = '',
  onWorkspaceChange = () => {},
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
  className = '',
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobile = useCallback(() => {
    menuButtonRef.current?.focus();
    setMobileOpen(false);
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

  // Prevent the page behind the drawer from scrolling.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const visibleSections = filterNavSections(navSections, {
    workspaceKind,
    permissions,
  });

  // The secondary panel opens only when the user explicitly taps a section
  // icon. It is never opened automatically from the route, so a fresh load
  // always shows just the collapsed icon rail.
  const effectiveCategoryId = activeCategoryId;

  const closePanel = () => setActiveCategoryId(null);
  const panelOpen = Boolean(effectiveCategoryId);

  // Left offset of the main content area. Rail width plus panel width when open.
  const plClass = panelOpen
    ? collapsed ? 'lg:pl-[20.75rem]' : 'lg:pl-[32rem]'
    : collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-[16rem]';

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

      {/* Top bar — fixed at the top, full width, solid background. */}
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

      {/* Primary navigation rail — fixed to the left, full viewport height
          below the topbar. On mobile it is an off-canvas drawer. */}
      <PrimarySidebar
        sidebarId={SIDEBAR_ID}
        sections={navSections}
        workspaceKind={workspaceKind}
        permissions={permissions}
        activeCategoryId={effectiveCategoryId}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
        onSelectCategory={(categoryId) => {
          setActiveCategoryId(categoryId);
          setMobileOpen(false);
        }}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((prev) => !prev)}
        openCategoryId={effectiveCategoryId}
        headerSlot={
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onWorkspaceChange={onWorkspaceChange}
            collapsed={collapsed}
          />
        }
      />

      {/* Secondary panel — fixed below the topbar next to the rail on
          desktop, an overlay drawer on mobile. Never moves on page scroll. */}
      {panelOpen && (
        <>
          <SecondarySidebar
            id={`${SIDEBAR_ID}-panel`}
            open
            onClose={closePanel}
            title={
              visibleSections.find((section) => section.id === effectiveCategoryId)
                ?.label ?? ''
            }
            icon={iconForSection(effectiveCategoryId ?? '')}
            items={
              visibleSections.find((section) => section.id === effectiveCategoryId)
                ?.items ?? []
            }
            activePath={activePath}
          />

          {panelOpen && (
            <div
              aria-hidden="true"
              onClick={closePanel}
              className={[
                'fixed inset-0 z-[var(--z-sidebar-backdrop)] bg-black/40 lg:hidden',
                'animate-[nx-fade-in_var(--duration-fast)_var(--ease-standard)]',
              ].join(' ')}
            />
          )}
        </>
      )}

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

      {/* Main content — offset below the topbar and to the right of the rail
          (plus the panel width when open). Only this area scrolls. */}
      <main
        id="main-content"
        tabIndex={-1}
        className={[
          'fixed top-14 bottom-0 left-0 right-0 min-w-0 overflow-y-auto overflow-x-hidden',
          'px-4 py-4 sm:px-6',
          plClass,
          'transition-[padding] duration-300 ease-in-out',
        ].join(' ')}
      >
        {children}
      </main>
    </div>
  );
}
