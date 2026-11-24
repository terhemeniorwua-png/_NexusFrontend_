'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiRequestError } from '@/lib/api';
import { sprintErrorMessage } from '@/services/sprint-errors';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { getProject } from '@/services/projects';

type SprintWorkflowMode = 'SPRINTS' | 'BACKLOG_ONLY';

function workflowLoadError(cause: unknown): string {
  if (cause instanceof ApiRequestError && [403, 404, 409].includes(cause.status)) {
    return sprintErrorMessage(cause, 'Sprint workflow could not be loaded.');
  }
  return 'Sprint workflow could not be loaded.';
}

/**
 * Route-level guard for every /app/projects/:projectId/sprints route.
 * Checks the project workflow mode before rendering child pages so a direct
 * URL visit never makes sprint API calls in BACKLOG_ONLY projects or when the
 * workflow lookup fails.
 */
export default function SprintsLayout({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const [workflowMode, setWorkflowMode] = useState<SprintWorkflowMode | null>(null);
  const [workflowLoaded, setWorkflowLoaded] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadWorkflowMode() {
      if (!activeWorkspace) {
        if (active) {
          setWorkflowError('Sprint workflow could not be loaded.');
          setWorkflowLoaded(true);
        }
        return;
      }

      try {
        const project = await getProject(activeWorkspace.id, projectId);
        if (active) {
          setWorkflowError(null);
          setWorkflowMode(project.workflowMode);
        }
      } catch (cause) {
        if (active) {
          setWorkflowError(workflowLoadError(cause));
          setWorkflowMode(null);
        }
      } finally {
        if (active) setWorkflowLoaded(true);
      }
    }

    void loadWorkflowMode();
    return () => { active = false; };
  }, [activeWorkspace, projectId, retryCount]);

  const handleRetry = useCallback(() => {
    setWorkflowError(null);
    setWorkflowMode(null);
    setWorkflowLoaded(false);
    setRetryCount((count) => count + 1);
  }, []);

  if (!workflowLoaded) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading sprint workflow">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (workflowError) {
    return (
      <Card className="p-5 sm:p-7">
        <Alert variant="error">{workflowError}</Alert>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleRetry}>Retry</Button>
        </div>
      </Card>
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
