'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiRequestError, apiRequest, getAccessToken } from '@/lib/api';
import { refreshSession, type AuthUser } from '@/services/auth';
import {
  createWorkspace as createWorkspaceRequest,
  listWorkspaces,
  switchWorkspace as switchWorkspaceRequest,
  updateWorkspace as updateWorkspaceRequest,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type Workspace,
} from '@/services/workspaces';

const ACTIVE_WORKSPACE_KEY = 'nexus-active-workspace';

interface WorkspaceContextValue {
  user: AuthUser | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  switchingWorkspaceId: string | null;
  error: string | null;
  retry: () => void;
  switchToWorkspace: (workspaceId: string) => Promise<void>;
  createAndActivateWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace>;
  saveWorkspace: (workspaceId: string, input: UpdateWorkspaceInput) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function messageFor(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

async function getCurrentUser(): Promise<AuthUser> {
  try {
    const result = await apiRequest<{ user: AuthUser }>('/auth/me', { authenticated: true });
    return result.user;
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    const result = await apiRequest<{ user: AuthUser }>('/auth/me', { authenticated: true });
    return result.user;
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadApplicationContext() {
      try {
        if (!getAccessToken()) await refreshSession();
        const currentUser = await getCurrentUser();
        if (active) setUser(currentUser);
        const availableWorkspaces = await listWorkspaces();
        let nextWorkspace: Workspace | null = null;
        if (availableWorkspaces.length > 0) {
          const savedId = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
          const candidate = availableWorkspaces.find((workspace) => workspace.id === savedId)
            ?? availableWorkspaces.find((workspace) => workspace.isPersonal)
            ?? availableWorkspaces[0];
          nextWorkspace = await switchWorkspaceRequest(candidate.id);
        }
        if (!active) return;
        setWorkspaces(availableWorkspaces);
        setActiveWorkspace(nextWorkspace);
        if (nextWorkspace) window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, nextWorkspace.id);
        setError(null);
      } catch (cause) {
        if (!active) return;
        if (cause instanceof ApiRequestError && cause.status === 401) {
          router.replace('/sign-in');
          setError('Your session has expired. Redirecting to sign in…');
        } else {
          setError(messageFor(cause, 'Your workspace information could not be loaded.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadApplicationContext();
    return () => { active = false; };
  }, [loadAttempt, router]);

  const switchToWorkspace = useCallback(async (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) return;
    setSwitchingWorkspaceId(workspaceId);
    setError(null);
    try {
      const selected = await switchWorkspaceRequest(workspaceId);
      setWorkspaces((current) => current.map((workspace) => workspace.id === selected.id ? selected : workspace));
      setActiveWorkspace(selected);
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, selected.id);
    } catch (cause) {
      setError(messageFor(cause, 'That workspace is unavailable. Choose another workspace or refresh the list.'));
    } finally {
      setSwitchingWorkspaceId(null);
    }
  }, [activeWorkspace?.id]);

  const createAndActivateWorkspace = useCallback(async (input: CreateWorkspaceInput) => {
    const created = await createWorkspaceRequest(input);
    const selected = await switchWorkspaceRequest(created.id);
    setWorkspaces((current) => [...current.filter((workspace) => workspace.id !== selected.id), selected]);
    setActiveWorkspace(selected);
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, selected.id);
    return selected;
  }, []);

  const saveWorkspace = useCallback(async (workspaceId: string, input: UpdateWorkspaceInput) => {
    const updated = await updateWorkspaceRequest(workspaceId, input);
    setWorkspaces((current) => current.map((workspace) => workspace.id === updated.id ? updated : workspace));
    setActiveWorkspace((current) => current?.id === updated.id ? updated : current);
    return updated;
  }, []);

  const value = useMemo<WorkspaceContextValue>(() => ({
    user,
    workspaces,
    activeWorkspace,
    loading,
    switchingWorkspaceId,
    error,
    retry: () => { setLoading(true); setLoadAttempt((attempt) => attempt + 1); },
    switchToWorkspace,
    createAndActivateWorkspace,
    saveWorkspace,
  }), [user, workspaces, activeWorkspace, loading, switchingWorkspaceId, error, switchToWorkspace, createAndActivateWorkspace, saveWorkspace]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspaceContext must be used inside WorkspaceProvider');
  return context;
}
