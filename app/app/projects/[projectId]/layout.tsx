'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProjectUnavailableState } from '@/components/shared/PageAccessState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  ProjectPermissionsProvider,
  usePermissions,
} from '@/providers/ProjectPermissionsProvider';

interface ProjectTab {
  href: string;
  label: string;
  exact?: boolean;
  visible: boolean;
}

function ProjectLayoutContent({
  projectId,
  pathname,
  children,
}: {
  projectId: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const { can, isLoading, accessStatus } = usePermissions();

  const tabs: ProjectTab[] = [
    { href: `/app/projects/${encodeURIComponent(projectId)}`, label: 'Overview', exact: true, visible: true },
    { href: `/app/projects/${encodeURIComponent(projectId)}/tasks`, label: 'Tasks', visible: can('task.view') },
    { href: `/app/projects/${encodeURIComponent(projectId)}/members`, label: 'Members', visible: can('project.view') },
    { href: `/app/projects/${encodeURIComponent(projectId)}/milestones`, label: 'Milestones', visible: can('project.view') },
    { href: `/app/projects/${encodeURIComponent(projectId)}/activity`, label: 'Activity', visible: can('project.view') },
    { href: `/app/projects/${encodeURIComponent(projectId)}/reports`, label: 'Reports', visible: can('project.report.view') },
    { href: `/app/projects/${encodeURIComponent(projectId)}/settings`, label: 'Settings', visible: can('project.settings.manage') },
  ];

  if (accessStatus) {
    return <ProjectUnavailableState status={accessStatus} />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      {isLoading ? (
        <nav aria-label="Project sections" className="mb-6 -mx-1" aria-busy="true">
          <div className="flex flex-wrap gap-1" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-24 rounded-[var(--radius-md)]" />
            ))}
          </div>
          <span className="sr-only" role="status">Loading project sections…</span>
        </nav>
      ) : (
        <nav aria-label="Project sections" className="mb-6 -mx-1">
          <ol className="flex flex-wrap gap-1" role="list">
            {tabs.filter((tab) => tab.visible).map((tab) => {
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

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeWorkspace } = useWorkspaceContext();

  // Extract projectId from pathname like /app/projects/[id]/...
  const match = pathname.match(/\/app\/projects\/([^/]+)/);
  const projectId = match?.[1];

  if (!projectId) return <>{children}</>;

  return (
    <ProjectPermissionsProvider
      workspaceId={activeWorkspace?.id ?? ''}
      projectId={projectId}
    >
      <ProjectLayoutContent projectId={projectId} pathname={pathname}>
        {children}
      </ProjectLayoutContent>
    </ProjectPermissionsProvider>
  );
}
