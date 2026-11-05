'use client';

import Link from 'next/link';
import { filterNavSections, isPathActive } from '@/lib/navigation';
import type {
  NavSection,
  WorkspaceKind,
} from '@/types/navigation';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from './icons';

interface SidebarProps {
  /** DOM id referenced by the topbar menu button. */
  id: string;
  /** Navigation data supplied by the caller for the active workspace. */
  sections: NavSection[];
  /** Current pathname, supplied by the caller (for example from usePathname). */
  activePath: string;
  /** Active workspace kind, used to scope navigation groups. */
  workspaceKind: WorkspaceKind;
  /** Permission keys granted by the backend for the active workspace. */
  permissions?: string[];
  /** Whether the desktop sidebar is collapsed. */
  collapsed: boolean;
  /** Toggles the desktop collapse state. */
  onToggleCollapsed: () => void;
  /** Whether the mobile drawer is open. */
  mobileOpen: boolean;
  /** Closes the mobile drawer. */
  onMobileClose: () => void;
  /** Called after a navigation link is activated, for example to close the drawer. */
  onNavigate?: () => void;
  /** Workspace switcher or workspace context rendered at the top. */
  headerSlot?: React.ReactNode;
  /** Secondary content rendered above the collapse control. */
  footerSlot?: React.ReactNode;
  /** Ref for the mobile close button, used for focus management. */
  closeButtonRef?: React.Ref<HTMLButtonElement>;
}

function formatBadge(count: number): string {
  return count > 99 ? '99+' : String(count);
}

/**
 * Sidebar — primary application navigation.
 *
 * Renders as a persistent, collapsible sidebar on desktop and as an off-canvas
 * drawer on smaller screens. Navigation groups are filtered by workspace kind
 * and backend-supplied permissions before rendering. Filtering is a usability
 * measure, not authorisation.
 */
export function Sidebar({
  id,
  sections,
  activePath,
  workspaceKind,
  permissions,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
  onNavigate,
  headerSlot,
  footerSlot,
  closeButtonRef,
}: SidebarProps) {
  const visibleSections = filterNavSections(sections, {
    workspaceKind,
    permissions,
  });

  // On mobile the drawer is always expanded while open, even if the desktop
  // sidebar was collapsed.
  const showLabels = !collapsed || mobileOpen;

  return (
    <aside
      id={id}
      aria-label="Sidebar"
      className={[
        'fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex w-64 flex-col',
        'border-r border-[var(--color-border)] bg-[var(--color-surface)]',
        'transition-[transform,width,visibility] duration-[var(--duration-base)] ease-[var(--ease-standard)]',
        mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible',
        'lg:sticky lg:top-0 lg:bottom-auto lg:z-auto lg:h-dvh lg:translate-x-0',
        collapsed ? 'lg:w-[4.75rem]' : 'lg:w-64',
      ].join(' ')}
    >
      <div className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-2">
        <div className="min-w-0 flex-1">{headerSlot}</div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onMobileClose}
          aria-label="Close navigation"
          className={[
            'inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] lg:hidden',
            'text-[var(--color-text-secondary)] transition-colors duration-150',
            'hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
          ].join(' ')}
        >
          <CloseIcon />
        </button>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto px-2 py-3"
      >
        {visibleSections.length === 0 ? (
          <p className="px-2 text-xs text-[var(--color-text-secondary)]">
            {showLabels ? 'No navigation available' : <span className="sr-only">No navigation available</span>}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleSections.map((section) => {
              const headingId = `${id}-${section.id}-heading`;

              return (
                <div key={section.id}>
                  {section.label && (
                    <h2
                      id={headingId}
                      className={[
                        'pb-1 text-xs font-semibold uppercase tracking-wide',
                        'text-[var(--color-text-secondary)]',
                        showLabels ? 'px-2.5' : 'sr-only',
                      ].join(' ')}
                    >
                      {section.label}
                    </h2>
                  )}

                  <ul
                    aria-labelledby={section.label ? headingId : undefined}
                    className="flex flex-col gap-0.5"
                  >
                    {section.items.map((item) => {
                      const active = isPathActive(item.href, activePath, item.exact === true);

                      return (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            aria-current={active ? 'page' : undefined}
                            title={showLabels ? undefined : item.label}
                            className={[
                              'flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2 text-sm',
                              'transition-colors duration-150',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]',
                              showLabels ? '' : 'lg:justify-center lg:px-0',
                              active
                                ? 'bg-[var(--color-primary-soft)] font-medium text-[var(--color-primary)]'
                                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <span
                              aria-hidden="true"
                              className="flex h-5 w-5 flex-shrink-0 items-center justify-center"
                            >
                              {item.icon}
                            </span>

                            <span
                              className={
                                showLabels
                                  ? 'min-w-0 flex-1 truncate'
                                  : 'sr-only'
                              }
                            >
                              {item.label}
                            </span>

                            {item.badgeCount !== undefined &&
                              item.badgeCount > 0 && (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className={[
                                      'inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center',
                                      'rounded-[var(--radius-full)] px-1 text-[10px] font-semibold leading-none',
                                      active
                                        ? 'bg-[var(--color-primary)] text-white'
                                        : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]',
                                    ].join(' ')}
                                  >
                                    {formatBadge(item.badgeCount)}
                                  </span>
                                  <span className="sr-only">
                                    {`${item.badgeCount} ${
                                      item.badgeLabel ?? 'unread'
                                    }`}
                                  </span>
                                </>
                              )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      <div className="flex-shrink-0 border-t border-[var(--color-border)] p-2">
        {footerSlot}

        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls={id}
          className={[
            'mt-1 hidden h-9 w-full items-center gap-2 rounded-[var(--radius-md)] px-2.5 lg:flex',
            'text-sm text-[var(--color-text-secondary)] transition-colors duration-150',
            'hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
            collapsed ? 'justify-center' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          <span className={collapsed ? 'sr-only' : ''}>Collapse sidebar</span>
        </button>
      </div>
    </aside>
  );
}
