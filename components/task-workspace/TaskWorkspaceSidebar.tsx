'use client';

import Link from 'next/link';

export type WorkspaceSection = 'overview' | 'subtasks' | 'documents' | 'attachments' | 'development' | 'discussion' | 'activity' | 'time';

const SECTIONS: Array<{ id: WorkspaceSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'subtasks', label: 'Subtasks' },
  { id: 'documents', label: 'Work documents' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'development', label: 'Development' },
  { id: 'discussion', label: 'Discussion' },
  { id: 'activity', label: 'Activity' },
  { id: 'time', label: 'Time tracking' },
];

export function TaskWorkspaceSidebar({
  active,
  onSelect,
  projectId,
  projectName,
}: {
  active: WorkspaceSection;
  onSelect: (section: WorkspaceSection) => void;
  projectId: string;
  projectName?: string;
}) {
  return (
    <nav aria-label="Task workspace sections" className="h-full">
      <ul className="space-y-1" role="list">
        {SECTIONS.map((section) => {
          const current = section.id === active;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                aria-current={current ? 'page' : undefined}
                className={[
                  'w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
                  current
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                {section.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t border-[var(--color-border)] pt-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Links</p>
        <ul className="space-y-1" role="list">
          <li>
            <Link href={`/app/projects/${encodeURIComponent(projectId)}`} className="block rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]">
              Project
            </Link>
          </li>
          <li>
            <Link href={`/app/projects/${encodeURIComponent(projectId)}/members`} className="block rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]">
              Team
            </Link>
          </li>
          {projectName ? <li className="px-3 py-1 text-xs text-[var(--color-text-secondary)]">{projectName}</li> : null}
        </ul>
      </div>
    </nav>
  );
}
