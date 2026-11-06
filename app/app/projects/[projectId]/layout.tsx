'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Extract projectId from pathname like /app/projects/[id]/...
  const match = pathname.match(/\/app\/projects\/([^/]+)/);
  const projectId = match?.[1];

  const tabs = projectId
    ? [
        { href: `/app/projects/${encodeURIComponent(projectId)}`, label: 'Overview', exact: true },
        { href: `/app/projects/${encodeURIComponent(projectId)}/tasks`, label: 'Tasks' },
        { href: `/app/projects/${encodeURIComponent(projectId)}/members`, label: 'Members' },
        { href: `/app/projects/${encodeURIComponent(projectId)}/milestones`, label: 'Milestones' },
        { href: `/app/projects/${encodeURIComponent(projectId)}/activity`, label: 'Activity' },
        { href: `/app/projects/${encodeURIComponent(projectId)}/settings`, label: 'Settings' },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      {projectId && tabs.length > 0 && (
        <nav aria-label="Project sections" className="mb-6 -mx-1">
          <ol className="flex flex-wrap gap-1" role="list">
            {tabs.map((tab) => {
              const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'inline-flex h-9 items-center rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]',
                    ].join(' ')}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      {children}
    </div>
  );
}
