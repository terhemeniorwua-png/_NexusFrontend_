'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';

/**
 * Redirects to /app/projects when the active workspace changes while viewing
 * a project detail page. This prevents stale data from a previous workspace
 * leaking into the current view.
 *
 * Returns the active workspace ID (or null) for use in data-loading effects.
 */
export function useWorkspaceRedirect(): string | null {
  const { activeWorkspace } = useWorkspaceContext();
  const router = useRouter();
  const initialWorkspaceId = useRef<string | null>(activeWorkspace?.id ?? null);

  useEffect(() => {
    if (!activeWorkspace) return;
    if (initialWorkspaceId.current === null) {
      initialWorkspaceId.current = activeWorkspace.id;
      return;
    }
    if (activeWorkspace.id !== initialWorkspaceId.current) {
      router.replace('/app/projects');
    }
  }, [activeWorkspace, router]);

  return activeWorkspace?.id ?? null;
}
