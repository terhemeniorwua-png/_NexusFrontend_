'use client';

import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import { ChecksIcon } from './icons';
import type { WorkspaceSummary } from '@/types/navigation';

const kindLabels: Record<WorkspaceSummary['kind'], string> = {
  individual: 'Individual',
  company: 'Company',
  institution: 'Institution',
};

interface WorkspaceSwitcherProps {
  /** Workspaces the current user can switch to, supplied by the backend. */
  workspaces: WorkspaceSummary[];
  /** Identifier of the active workspace. */
  activeWorkspaceId: string;
  /** Called with the selected workspace id. The caller performs the switch. */
  onWorkspaceChange: (workspaceId: string) => void;
  /** Hides the name and kind when the sidebar is collapsed. */
  collapsed?: boolean;
  className?: string;
}

function workspaceInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'W';
}

/**
 * WorkspaceSwitcher — displays the active workspace and lets the user switch.
 *
 * The component is presentational: it does not call the workspace API and it
 * does not assume a user belongs to one workspace. Once the switching contract
 * is confirmed in Phase 5, the caller supplies the workspaces and handles the
 * selection, including updating the active application context.
 */
export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  collapsed = false,
  className = '',
}: WorkspaceSwitcherProps) {
  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0];

  if (!active) {
    return (
      <p
        className={[
          'rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)]',
          'px-3 py-2 text-xs text-[var(--color-text-secondary)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {collapsed ? <span className="sr-only">No workspace</span> : 'No workspace'}
      </p>
    );
  }

  const items: DropdownItem[] = workspaces.map((workspace) => {
    const isActive = workspace.id === active.id;

    return {
      id: workspace.id,
      label: isActive ? `${workspace.name} (current)` : workspace.name,
      icon: isActive ? <ChecksIcon /> : undefined,
      onSelect: () => onWorkspaceChange(workspace.id),
    };
  });

  return (
    <Dropdown
      items={items}
      label="Switch workspace"
      triggerLabel={
        collapsed
          ? `Switch workspace: ${active.name}`
          : `Switch workspace: ${active.name}, ${
              active.kindLabel ?? kindLabels[active.kind]
            }`
      }
      align="start"
      className={['w-full', className].filter(Boolean).join(' ')}
      triggerClassName="w-full justify-start gap-2 px-2"
      menuClassName="w-60"
    >
      <span className="sr-only">Switch workspace: </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span
          aria-hidden="true"
          className={[
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
            'bg-[var(--color-primary-soft)] text-sm font-semibold text-[var(--color-primary)]',
          ].join(' ')}
        >
          {workspaceInitial(active.name)}
        </span>

        {collapsed ? (
          <span className="sr-only">{active.name}</span>
        ) : (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">
              {active.name}
            </span>
            <span className="block truncate text-xs text-[var(--color-text-secondary)]">
              {active.kindLabel ?? kindLabels[active.kind]}
            </span>
          </span>
        )}
      </span>
    </Dropdown>
  );
}
