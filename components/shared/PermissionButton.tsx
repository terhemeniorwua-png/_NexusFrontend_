'use client';

import { useId } from 'react';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import type { Permission } from '@/services/projects';

interface PermissionButtonProps extends Omit<React.ComponentProps<typeof Button>, 'disabled'> {
  permission: Permission | readonly Permission[];
  mode?: 'all' | 'any';
  /** Explanation shown to the user when the action is unavailable. */
  deniedReason?: string;
}

/**
 * Button that renders disabled, with an accessible explanation, when the
 * backend did not grant the required permission. The wrapper stays focusable
 * so keyboard and screen-reader users can discover why the action is blocked.
 */
export function PermissionButton({
  permission,
  mode = 'all',
  deniedReason = 'Your project role does not allow this action.',
  children,
  ...buttonProps
}: PermissionButtonProps) {
  const { canAny, canAll } = usePermissions();
  const hintId = useId();
  const list = Array.isArray(permission) ? permission : [permission];
  const allowed = list.length === 0
    ? true
    : mode === 'any'
      ? canAny(list)
      : canAll(list);

  if (allowed) {
    return <Button {...buttonProps}>{children}</Button>;
  }

  return (
    <>
      <span
        className="inline-flex"
        tabIndex={0}
        title={deniedReason}
        aria-describedby={hintId}
        data-permission-denied="true"
      >
        <Button {...buttonProps} disabled aria-describedby={hintId} title={deniedReason}>
          {children}
        </Button>
      </span>
      <span id={hintId} className="sr-only">
        {deniedReason}
      </span>
    </>
  );
}
