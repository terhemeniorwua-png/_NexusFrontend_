'use client';

import type { Permission } from '@/services/projects';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';

interface CanProps {
  /** A single permission or a list combined with `mode`. */
  permission: Permission | readonly Permission[];
  /** `all` requires every permission, `any` requires at least one. */
  mode?: 'all' | 'any';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only when the backend granted the permission(s).
 * During the permission fetch this renders the fallback (nothing by default),
 * which keeps privileged controls from flashing before the answer arrives.
 */
export function Can({
  permission,
  mode = 'all',
  fallback = null,
  children,
}: CanProps) {
  const { canAny, canAll } = usePermissions();
  const list = Array.isArray(permission) ? permission : [permission];
  const allowed = list.length === 0
    ? true
    : mode === 'any'
      ? canAny(list)
      : canAll(list);

  return <>{allowed ? children : fallback}</>;
}
