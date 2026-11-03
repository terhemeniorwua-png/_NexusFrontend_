'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface DropdownItem {
  /** Unique identifier for this item */
  id: string;
  label: string;
  /** Optional leading icon element */
  icon?: React.ReactNode;
  /** Renders the item as a link when provided */
  href?: string;
  /** Called when the item is activated (also fires for links) */
  onSelect?: () => void;
  disabled?: boolean;
  /** Uses the destructive colour for irreversible actions */
  destructive?: boolean;
  /** Renders a divider above this item */
  separatorBefore?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  /** Accessible name for the trigger and the menu */
  label: string;
  /**
   * Optional explicit accessible name for the trigger. Use when the trigger
   * content (for example an avatar) would not produce a clear name on its own.
   */
  triggerLabel?: string;
  /** Optional trigger content; defaults to the label text */
  children?: React.ReactNode;
  /** Menu alignment relative to the trigger */
  align?: 'start' | 'end';
  className?: string;
  /** Extra classes for the trigger button — useful for full-width triggers */
  triggerClassName?: string;
  menuClassName?: string;
}

/**
 * Dropdown — accessible menu button.
 *
 * Supports click, Enter/Space, ArrowDown/Up, Home/End, Escape, and
 * outside-click dismissal. Focus moves into the menu on open and returns to
 * the trigger when the menu is dismissed with Escape.
 *
 * Use ConfirmDialog instead when an action needs confirmation.
 */
export function Dropdown({
  items,
  label,
  triggerLabel,
  children,
  align = 'start',
  className = '',
  triggerClassName = '',
  menuClassName = '',
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const menuId = `${uid}-menu`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  const closeMenu = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Move focus to the first enabled item when the menu opens.
  useEffect(() => {
    if (!open) return;
    const firstEnabled = items.findIndex((item) => !item.disabled);
    if (firstEnabled >= 0) itemRefs.current[firstEnabled]?.focus();
  }, [open, items]);

  // Dismiss on outside interaction.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const focusRelativeItem = (direction: 1 | -1) => {
    const enabledIndexes = items
      .map((item, index) => (item.disabled ? -1 : index))
      .filter((index) => index >= 0);
    if (enabledIndexes.length === 0) return;

    const currentPosition = enabledIndexes.findIndex(
      (index) => itemRefs.current[index] === document.activeElement,
    );
    const nextPosition =
      currentPosition === -1
        ? direction === 1
          ? 0
          : enabledIndexes.length - 1
        : (currentPosition + direction + enabledIndexes.length) %
          enabledIndexes.length;

    itemRefs.current[enabledIndexes[nextPosition]]?.focus();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeMenu();
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusRelativeItem(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusRelativeItem(-1);
        break;
      case 'Home':
        event.preventDefault();
        focusRelativeItem(1);
        break;
      case 'End':
        event.preventDefault();
        focusRelativeItem(-1);
        break;
      case 'Tab':
        closeMenu(false);
        break;
      default:
        break;
    }
  };

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault();
      setOpen(true);
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeMenu();
    }
  };

  const handleItemActivate = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    // Links navigate on their own; buttons simply close the menu.
    if (!item.href) closeMenu();
    else setOpen(false);
  };

  const itemClasses = (item: DropdownItem) =>
    [
      'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5',
      'text-left text-sm transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]',
      item.disabled
        ? 'cursor-not-allowed opacity-50 text-[var(--color-text-secondary)]'
        : item.destructive
          ? 'text-[var(--color-error)] hover:bg-[var(--color-error-bg)]'
          : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div
      ref={containerRef}
      className={['relative inline-block', className].filter(Boolean).join(' ')}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => setOpen((previous) => !previous)}
        onKeyDown={handleTriggerKeyDown}
        className={[
          'inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)]',
          'border border-[var(--color-border)] bg-[var(--color-surface)] px-3',
          'text-sm font-medium text-[var(--color-text-primary)]',
          'transition-colors duration-150 hover:bg-[var(--color-surface-secondary)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
          triggerClassName,
        ].join(' ')}
      >
        {children ?? label}
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={[
            'transition-transform duration-150',
            open ? 'rotate-180' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={[
            'absolute z-[var(--z-dropdown)] mt-1 min-w-48 rounded-[var(--radius-lg)]',
            'border border-[var(--color-border)] bg-[var(--color-surface)] p-1',
            'shadow-[var(--shadow-lg)]',
            'animate-[nx-pop-in_var(--duration-fast)_var(--ease-standard)]',
            align === 'end' ? 'right-0' : 'left-0',
            menuClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {items.map((item, index) => (
            <li key={item.id} role="none">
              {item.separatorBefore && (
                <div
                  role="separator"
                  className="my-1 h-px bg-[var(--color-border)]"
                />
              )}
              {item.href ? (
                <a
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  role="menuitem"
                  href={item.disabled ? undefined : item.href}
                  aria-disabled={item.disabled || undefined}
                  tabIndex={-1}
                  onClick={(event) => {
                    if (item.disabled) {
                      event.preventDefault();
                      return;
                    }
                    handleItemActivate(item);
                  }}
                  className={itemClasses(item)}
                >
                  {item.icon && (
                    <span aria-hidden="true" className="flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </a>
              ) : (
                <button
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  tabIndex={-1}
                  onClick={() => handleItemActivate(item)}
                  className={itemClasses(item)}
                >
                  {item.icon && (
                    <span aria-hidden="true" className="flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
