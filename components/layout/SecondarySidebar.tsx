'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { isPathActive } from '@/lib/navigation';
import type { NavItem } from '@/types/navigation';
import { CloseIcon } from './icons';

interface SecondarySidebarProps {
  /** Whether the panel is open. */
  open: boolean;
  /** Closes the panel. */
  onClose: () => void;
  /** DOM id, exposed so the primary rail can reference it via aria-controls. */
  id?: string;
  /** Title shown in the panel header. */
  title: string;
  /** Icon shown in the panel header. */
  icon: React.ReactNode;
  /** Sub-navigation items for the selected section. */
  items: NavItem[];
  /** Current pathname for active state detection. */
  activePath: string;
}

interface SubNavItemProps {
  item: NavItem;
  active: boolean;
}

function SubNavItem({ item, active }: SubNavItemProps) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm',
        'transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        active
          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]',
      ].join(' ')}
    >
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-[var(--color-text-muted)]">
        {item.icon ?? <span className="h-3.5 w-3.5 rounded-full bg-[var(--color-surface-secondary)]" />}
      </span>
      <span className="min-w-0">{item.label}</span>

      {item.badgeCount !== undefined && item.badgeCount > 0 && (
        <span
          aria-hidden="true"
          className={[
            'ml-auto inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center',
            'rounded-[var(--radius-full)] px-1 text-[10px] font-semibold leading-none',
            active
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]',
          ].join(' ')}
        >
          {item.badgeCount > 99 ? '99+' : String(item.badgeCount)}
        </span>
      )}
    </Link>
  );
}

export function SecondarySidebar({
  open,
  onClose,
  id,
  title,
  icon,
  items,
  activePath,
}: SecondarySidebarProps) {
  // Close on Escape key.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const panelId = id ?? 'app-sidebar-panel';

  return (
    <aside
      id={panelId}
      role="region"
      aria-label={title}
      className={[
        'flex flex-shrink-0 flex-col',
        'border-r border-[var(--color-border)] bg-[var(--color-surface)] box-shadow-[var(--shadow-md)]',
        'transition-[width,transform,visibility] duration-300 ease-in-out',
        // Mobile: overlay drawer full height below the top bar.
        'fixed top-14 bottom-0 left-0 z-[var(--z-sidebar)] w-[16rem]',
        'invisible -translate-x-full',
        open ? 'visible translate-x-0' : 'invisible -translate-x-full',
        // Desktop: fixed panel below the topbar, next to the rail.
        'lg:top-14 lg:bottom-0 lg:left-[var(--rail-w,4.75rem)] lg:z-40 lg:w-[16rem] lg:visible lg:translate-x-0',
      ].join(' ')}
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            {icon}
          </span>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <CloseIcon size={16} />
        </button>
      </header>

      <nav aria-label={title} className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const active = isPathActive(item.href, activePath, item.exact === true);
            return (
              <li key={item.id}>
                <SubNavItem item={item} active={active} />
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
