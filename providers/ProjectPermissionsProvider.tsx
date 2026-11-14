'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiRequestError, onPermissionDenied } from '@/lib/api';
import {
  getProjectPermissions,
  listProjectRoles,
  type Permission,
  type ProjectAccessSource,
  type ProjectPermissions,
  type ProjectRole,
  type ProjectRoleDefinition,
} from '@/services/projects';

interface ProjectPermissionsContextValue {
  permissions: Permission[];
  projectRole: ProjectRole | null;
  workspaceRole: string;
  accessSource: ProjectAccessSource | null;
  assignableRoles: ProjectRole[];
  roleDefinitions: ProjectRoleDefinition[];
  isLoading: boolean;
  /** 403/404 from the permissions endpoint: the caller cannot open the project. */
  accessStatus: 403 | 404 | null;
  error: string | null;
  can: (permission: Permission) => boolean;
  canAny: (permissions: readonly Permission[]) => boolean;
  canAll: (permissions: readonly Permission[]) => boolean;
  refresh: () => void;
}

const ProjectPermissionsContext = createContext<ProjectPermissionsContextValue | null>(null);

interface ProjectPermissionsProviderProps {
  workspaceId: string;
  projectId: string;
  children: React.ReactNode;
}

function messageFor(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : 'Project permissions could not be loaded.';
}

/**
 * Fetches the caller's project permissions once per workspace/project pair and
 * exposes read-only helpers. While loading, `can()` returns false so no
 * privileged control is rendered before the backend has answered.
 *
 * This provider is presentation-only. Every action it enables is still
 * authorised by the backend; nothing here grants access.
 */
export function ProjectPermissionsProvider({
  workspaceId,
  projectId,
  children,
}: ProjectPermissionsProviderProps) {
  const [snapshot, setSnapshot] = useState<ProjectPermissions | null>(null);
  const [roleDefinitions, setRoleDefinitions] = useState<ProjectRoleDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<403 | 404 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const enabled = Boolean(workspaceId && projectId);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    // Keep the resets inside the async task so the effect body itself does not
    // trigger a synchronous cascading render.
    void (async () => {
      setIsLoading(true);
      setError(null);
      setAccessStatus(null);
      // Fail closed while the new project's permissions are in flight.
      setSnapshot(null);
      setRoleDefinitions([]);

      try {
        const [permissions, roles] = await Promise.all([
          getProjectPermissions(workspaceId, projectId),
          listProjectRoles(workspaceId).catch(() => [] as ProjectRoleDefinition[]),
        ]);
        if (!active) return;
        setSnapshot(permissions);
        setRoleDefinitions(roles);
      } catch (cause) {
        if (!active) return;
        if (cause instanceof ApiRequestError && cause.status === 404) {
          setAccessStatus(404);
        } else if (cause instanceof ApiRequestError && cause.status === 403) {
          setAccessStatus(403);
        } else {
          setError(messageFor(cause));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [enabled, workspaceId, projectId, refreshToken]);

  // Any backend PERMISSION_DENIED means the caller's role may have changed.
  // Re-fetch permissions without retrying the failed request.
  useEffect(() => onPermissionDenied(refresh), [refresh]);

  const permissions = useMemo(
    () => (enabled ? snapshot?.permissions ?? [] : []),
    [enabled, snapshot],
  );
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const effectiveLoading = enabled ? isLoading : false;

  const can = useCallback(
    (permission: Permission) => !effectiveLoading && permissionSet.has(permission),
    [effectiveLoading, permissionSet],
  );
  const canAny = useCallback(
    (list: readonly Permission[]) => !effectiveLoading && list.some((permission) => permissionSet.has(permission)),
    [effectiveLoading, permissionSet],
  );
  const canAll = useCallback(
    (list: readonly Permission[]) => !effectiveLoading && list.every((permission) => permissionSet.has(permission)),
    [effectiveLoading, permissionSet],
  );

  const value = useMemo<ProjectPermissionsContextValue>(() => ({
    permissions,
    projectRole: enabled ? snapshot?.projectRole ?? null : null,
    workspaceRole: enabled ? snapshot?.workspaceRole ?? '' : '',
    accessSource: enabled ? snapshot?.accessSource ?? null : null,
    assignableRoles: enabled ? snapshot?.assignableRoles ?? [] : [],
    roleDefinitions: enabled ? roleDefinitions : [],
    isLoading: effectiveLoading,
    accessStatus: enabled ? accessStatus : null,
    error: enabled ? error : null,
    can,
    canAny,
    canAll,
    refresh,
  }), [
    permissions,
    enabled,
    snapshot,
    roleDefinitions,
    effectiveLoading,
    accessStatus,
    error,
    can,
    canAny,
    canAll,
    refresh,
  ]);

  return (
    <ProjectPermissionsContext.Provider value={value}>
      {children}
    </ProjectPermissionsContext.Provider>
  );
}

/**
 * Read project permissions. Throws outside the provider so a page can never
 * silently render with an implicit "allow" default.
 */
export function usePermissions(): ProjectPermissionsContextValue {
  const context = useContext(ProjectPermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used inside ProjectPermissionsProvider');
  }
  return context;
}
