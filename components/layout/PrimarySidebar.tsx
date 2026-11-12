'use client';

import { filterNavSections } from '@/lib/navigation';
import type { NavSection, WorkspaceKind } from '@/types/navigation';
import {
  Building2Icon,
  FolderKanbanIcon,
  MessageSquareIcon,
  BlocksIcon,
  ListIcon,
  SettingsIcon,
} from './icons';

/** Maps a navigation section id to its primary-sidebar icon. */
function iconFor(sectionId: string): React.ReactNode {
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

interface SectionButtonProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onSelect: () => void;
}

function SectionButton({ label, icon, active, onSelect }: SectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={[
        'flex h-12 w-full flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]',
        'transition-[background-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        active
          ? 'bg-[var(--color-primary-soft)] box-shadow-[var(--shadow-sm)] text-[var(--color-primary)]'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]',
      ].join(' ')}
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {icon}
      </span>
    </button>
  );
}

interface PrimarySidebarProps {
  /** DOM id referenced by the topbar menu button. */
  sidebarId: string;
  /** Navigation data supplied by the caller for the active workspace. */
  sections: NavSection[];
  /** Active workspace kind, used to scope navigation groups. */
  workspaceKind: WorkspaceKind;
  /** Permission keys granted by the backend for the active workspace. */
  permissions?: string[];
  /** Currently selected main navigation category id. */
  activeCategoryId: string | null;
  /** Selects a main navigation category. */
  onSelectCategory: (categoryId: string | null) => void;
  /** Whether the mobile drawer is open. */
  mobileOpen: boolean;
  /** Closes the mobile drawer. */
  onMobileClose: () => void;
  /** Content rendered at the top of the sidebar (e.g. workspace switcher). */
  headerSlot?: React.ReactNode;
}

export function PrimarySidebar({
  sidebarId,
  sections,
  workspaceKind,
  permissions,
  activeCategoryId,
  onSelectCategory,
  mobileOpen,
  onMobileClose,
  headerSlot,
}: PrimarySidebarProps) {
  const visibleSections = filterNavSections(sections, {
    workspaceKind,
    permissions,
  });

  return (
    <aside
      id={sidebarId}
      aria-label="Primary navigation"
      className={[
        'fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex w-[4.75rem] flex-shrink-0 flex-col',
        'border-r border-[var(--color-border)] bg-[var(--color-surface)]',
      ].join(' ')}
    >
      {headerSlot && (
        <div className="flex h-14 flex-shrink-0 items-center justify-center border-b border-[var(--color-border)] px-2">
          {headerSlot}
        </div>
      )}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-1 py-3">
        <ul className="flex flex-col gap-1">
          {visibleSections.map((section) => {
            const active = activeCategoryId === section.id;
            return (
              <li key={section.id}>
                <SectionButton
                  label={section.label ?? section.id}
                  icon={iconFor(section.id)}
                  active={active}
                  onSelect={() => {
                    if (active) {
                      onSelectCategory(null);
                    } else {
                      onSelectCategory(section.id);
                    }
                  }}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      {mobileOpen && (
        <div className="flex-shrink-0 border-t border-[var(--color-border)] p-2">
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            autoFocus
            className="w-full flex items-center justify-center rounded-[var(--radius-md)] px-2 py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] lg:hidden"
          >
            Close navigation
          </button>
        </div>
      )}
    </aside>
  );
}
