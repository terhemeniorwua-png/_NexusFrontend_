'use client';

import Link from 'next/link';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserMenu } from './UserMenu';
import {
  BellIcon,
  MenuIcon,
  MessageIcon,
  SearchIcon,
} from './icons';
import type { CurrentUserSummary } from '@/types/navigation';
import type { DropdownItem } from '@/components/ui/Dropdown';

interface TopbarProps {
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
  /** Opens the mobile navigation drawer. */
  onOpenNavigation: () => void;
  /** Whether the mobile drawer is open. */
  navigationOpen: boolean;
  /** DOM id of the navigation drawer. */
  navigationId: string;
  /** Ref for the mobile menu button, used when focus returns from the drawer. */
  menuButtonRef?: React.Ref<HTMLButtonElement>;
  /** Current user identity. */
  user: CurrentUserSummary;
  /** Account destinations such as Profile and Settings. */
  userMenuItems?: DropdownItem[];
  /** Called when the user chooses to sign out. */
  onSignOut?: () => void;
  /** Additional page-level controls rendered before the theme control. */
  actions?: React.ReactNode;
}

const iconButtonClasses = [
  'relative inline-flex h-9 w-9 flex-shrink-0 items-center justify-center',
  'rounded-[var(--radius-md)] text-[var(--color-text-secondary)]',
  'transition-colors duration-150',
  'hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
].join(' ');

function formatCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

interface CountBadgeProps {
  count: number;
}

function CountBadge({ count }: CountBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      aria-hidden="true"
      className={[
        'absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center',
        'rounded-[var(--radius-full)] bg-[var(--color-primary)] px-1',
        'text-[10px] font-semibold leading-none text-white',
      ].join(' ')}
    >
      {formatCount(count)}
    </span>
  );
}

/**
 * Topbar — application header.
 *
 * Provides the mobile navigation trigger, the current location, the global
 * search entry point, and separate messages and notification entry points.
 * Message counts come from `messageUnreadCount`; general notification counts
 * come from `notificationUnreadCount`. They must never be combined.
 */
export function Topbar({
  title,
  breadcrumbs,
  onOpenSearch,
  searchHref,
  messagesHref,
  messageUnreadCount = 0,
  notificationsHref,
  notificationUnreadCount = 0,
  onOpenNavigation,
  navigationOpen,
  navigationId,
  menuButtonRef,
  user,
  userMenuItems,
  onSignOut,
  actions,
}: TopbarProps) {
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 0);
  const searchLabel = 'Open global search';

  return (
    <header
      className={[
        'sticky top-0 z-[var(--z-topbar)] flex h-14 flex-shrink-0 items-center gap-2',
        'border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-4',
      ].join(' ')}
    >
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onOpenNavigation}
        aria-label="Open navigation"
        aria-expanded={navigationOpen}
        aria-controls={navigationId}
        className={[iconButtonClasses, 'lg:hidden'].join(' ')}
      >
        <MenuIcon />
      </button>

      <div className="min-w-0 flex-1 overflow-hidden">
        {hasBreadcrumbs ? (
          <Breadcrumb items={breadcrumbs ?? []} />
        ) : title ? (
          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            {title}
          </p>
        ) : null}
      </div>

      <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-1">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label={searchLabel}
            aria-keyshortcuts="Control+K Meta+K"
            title="Search (Ctrl+K)"
            className={[
              iconButtonClasses,
              'w-auto gap-2 px-2.5',
            ].join(' ')}
          >
            <SearchIcon />
            <span className="hidden text-sm lg:inline">Search</span>
          </button>
        )}

        {!onOpenSearch && searchHref && (
          <Link
            href={searchHref}
            aria-label={searchLabel}
            className={[iconButtonClasses, 'w-auto gap-2 px-2.5'].join(' ')}
          >
            <SearchIcon />
            <span className="hidden text-sm lg:inline">Search</span>
          </Link>
        )}

        {messagesHref && (
          <Link
            href={messagesHref}
            aria-label={
              messageUnreadCount > 0
                ? `Messages, ${messageUnreadCount} unread`
                : 'Messages'
            }
            title="Messages"
            className={iconButtonClasses}
          >
            <MessageIcon />
            <CountBadge count={messageUnreadCount} />
          </Link>
        )}

        {notificationsHref && (
          <Link
            href={notificationsHref}
            aria-label={
              notificationUnreadCount > 0
                ? `Notifications, ${notificationUnreadCount} unread`
                : 'Notifications'
            }
            title="Notifications"
            className={iconButtonClasses}
          >
            <BellIcon />
            <CountBadge count={notificationUnreadCount} />
          </Link>
        )}

        {actions}

        <ThemeToggle className="hidden md:inline-flex" />

        <UserMenu
          user={user}
          items={userMenuItems}
          onSignOut={onSignOut}
          className="ml-1"
        />
      </div>
    </header>
  );
}
