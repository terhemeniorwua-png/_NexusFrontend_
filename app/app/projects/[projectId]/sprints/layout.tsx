'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { getProject } from '@/services/projects';

type SprintWorkflowMode = 'SPRINTS' | 'BACKLOG_ONLY';

/**
 * Route-level guard for every /app/projects/:projectId/sprints route.
 * Checks the project workflow mode before rendering child pages so a direct
 * URL visit never makes sprint API calls in BACKLOG_ONLY projects.
 */
export default function SprintsLayout({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const [workflowMode, setWorkflowMode] = useState<SprintWorkflowMode | null>(null);
  const [workflowLoaded, setWorkflowLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadWorkflowMode() {
      if (!activeWorkspace) {
        if (active) setWorkflowLoaded(true);
        return;
      }

      try {
        const project = await getProject(activeWorkspace.id, projectId);
        if (active) setWorkflowMode(project.workflowMode);
      } catch {
        // The child route still validates access and displays backend errors.
      } finally {
        if (active) setWorkflowLoaded(true);
      }
    }

    void loadWorkflowMode();
    return () => { active = false; };
  }, [activeWorkspace, projectId]);

  if (!workflowLoaded) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading sprint workflow">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (workflowMode === 'BACKLOG_ONLY') {
    return (
      <PageAccessState
        title="Sprints are not enabled for this project"
        description="This project uses the backlog-only workflow. Sprints are unavailable."
        backHref={`/app/projects/${encodeURIComponent(projectId)}`}
        backLabel="Back to project"
      />
    );
  }

  return <>{children}</>;
}
