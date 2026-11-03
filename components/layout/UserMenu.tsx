'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import type { CurrentUserSummary } from '@/types/navigation';

interface UserMenuProps {
  /** Current user identity supplied by the backend session. */
  user: CurrentUserSummary;
  /**
   * Account destinations supplied by the caller, for example Profile and
   * Account settings. Routes are not invented here.
   */
  items?: DropdownItem[];
  /** Called when the user chooses to sign out. Omit to hide the action. */
  onSignOut?: () => void;
  /** Label for the sign-out action. */
  signOutLabel?: string;
  /** Shows only the avatar at every breakpoint. */
  compact?: boolean;
  /** Stretches the trigger to fill its container. */
  fullWidth?: boolean;
  className?: string;
}

/**
 * UserMenu — account menu for the signed-in user.
 *
 * The shell does not implement sign-out itself. When `onSignOut` is supplied the
 * caller owns the request, session cleanup, and redirect.
 */
export function UserMenu({
  user,
  items = [],
  onSignOut,
  signOutLabel = 'Sign out',
  compact = false,
  fullWidth = false,
  className = '',
}: UserMenuProps) {
  const menuItems: DropdownItem[] = [...items];

  if (onSignOut) {
    menuItems.push({
      id: 'sign-out',
      label: signOutLabel,
      destructive: true,
      separatorBefore: menuItems.length > 0,
      onSelect: onSignOut,
    });
  }

  const identity = (
    <>
      <Avatar src={user.avatarUrl} name={user.name} size="sm" />

      {!compact && (
        <span className="hidden min-w-0 max-w-40 text-left md:block">
          <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">
            {user.name}
          </span>
          {user.email && (
            <span className="block truncate text-xs text-[var(--color-text-secondary)]">
              {user.email}
            </span>
          )}
        </span>
      )}
    </>
  );

  // Without destinations or a sign-out handler there is nothing to show in a
  // menu. Render the identity without an empty popup instead.
  if (menuItems.length === 0) {
    return (
      <div
        className={[
          'flex h-9 items-center gap-2 text-[var(--color-text-primary)]',
          fullWidth ? 'w-full px-1.5' : 'px-1.5',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {identity}
      </div>
    );
  }

  return (
    <Dropdown
      items={menuItems}
      label={`Account menu for ${user.name}`}
      triggerLabel={`Account menu for ${user.name}`}
      align="end"
      className={className}
      triggerClassName={[
        'gap-2 px-1.5 md:px-2',
        fullWidth ? 'w-full justify-start' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      menuClassName="w-56"
    >
      <span className="sr-only">Account menu: </span>
      {identity}
    </Dropdown>
  );
}
