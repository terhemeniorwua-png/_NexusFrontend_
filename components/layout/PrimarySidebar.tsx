'use client';

import { filterNavSections } from '@/lib/navigation';
import type { NavSection, WorkspaceKind } from '@/types/navigation';
import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
  showLabels: boolean;
  onSelect: () => void;
  /** Whether this section's secondary panel is currently open. */
  open: boolean;
  /** ID of the secondary panel, exposed through aria-controls. */
  panelId: string | undefined;
}

function SectionButton({
  label,
  icon,
  active,
  showLabels,
  onSelect,
  open,
  panelId,
}: SectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={active}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      title={showLabels ? undefined : label}
      className={[
        'flex h-12 w-full flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]',
        'transition-[background-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        active
          ? 'bg-[var(--color-primary-soft)] box-shadow-[var(--shadow-sm)] text-[var(--color-primary)]'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]',
        showLabels ? 'justify-start lg:px-3' : 'justify-center lg:px-0',
      ].join(' ')}
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {icon}
      </span>
      {showLabels && (
        <span className="min-w-0">{label}</span>
      )}
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
  /** Whether the desktop sidebar is collapsed. */
  collapsed: boolean;
  /** Toggles the desktop collapse state. */
  onToggleCollapsed: () => void;
  /** ID of the section whose secondary panel is open, for aria-expanded. */
  openCategoryId: string | null;
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
  collapsed,
  onToggleCollapsed,
  openCategoryId,
}: PrimarySidebarProps) {
  const visibleSections = filterNavSections(sections, {
    workspaceKind,
    permissions,
  });

  // On mobile the drawer is always expanded while open, even if the desktop
  // sidebar was collapsed.
  const showLabels = !collapsed || mobileOpen;

  const panelId = sidebarId ? `${sidebarId}-panel` : undefined;

  return (
    <aside
      id={sidebarId}
      role="region"
      aria-label="Primary navigation"
      className={[
        'fixed top-14 bottom-0 left-0 z-50 flex flex-shrink-0 flex-col',
        'border-r border-[var(--color-border)] bg-[var(--color-surface)]',
        'transition-[width,transform,visibility] duration-300 ease-in-out',
        // Mobile: off-canvas drawer opened from the topbar menu button.
        'w-[16rem] invisible -translate-x-full',
        mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full',
        // Desktop: fixed rail below the topbar, full viewport height.
        'lg:top-14 lg:bottom-0 lg:visible lg:translate-x-0',
        collapsed ? 'lg:w-[4.75rem]' : 'lg:w-[16rem]',
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
                  showLabels={showLabels}
                  open={openCategoryId === section.id}
                  panelId={panelId}
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

      <div className="mt-auto flex-shrink-0 border-t border-[var(--color-border)] p-2">
        {headerSlot ? null : null}
        {/* Desktop collapse/expand toggle */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls={sidebarId}
          className={[
            'mt-1 flex w-full items-center justify-center rounded-[var(--radius-md)] px-2 py-2 text-sm',
            'transition-colors duration-150',
            'hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
            'lg:block',
          ].join(' ')}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          {showLabels ? (
            <span className="ml-2">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </span>
          ) : null}
        </button>

        {mobileOpen && (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            autoFocus
            className="mt-1 w-full flex items-center justify-center rounded-[var(--radius-md)] px-2 py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] lg:hidden"
          >
            Close navigation
          </button>
        )}
      </div>
    </aside>
  );
}
