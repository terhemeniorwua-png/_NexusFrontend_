import { ApiRequestError } from '@/lib/api';

/**
 * Product-friendly copy for known sprint backend error codes.
 *
 * Kept separate from `lib/sprint-report-reasons.ts`: those codes describe
 * missing audit history, while these codes describe failed sprint actions.
 */
export const SPRINT_ERROR_COPY: Record<string, string> = {
  SPRINT_NOT_EDITABLE: 'Only planned sprints can be edited.',
  SPRINT_NOT_STARTABLE: 'Only planned sprints can be started.',
  SPRINT_NOT_ACTIVE: 'Only an active sprint can be completed.',
  SPRINT_ALREADY_ACTIVE: 'This sprint is already active.',
  ACTIVE_SPRINT_EXISTS: 'Another sprint is already active in this project. Complete it first.',
  SPRINT_NOT_RESTORABLE: 'Only archived sprints can be restored.',
  SPRINTS_DISABLED_FOR_PROJECT: 'Sprints are turned off for this project.',
  SPRINT_NOT_ASSIGNABLE: 'Tasks can only be added to a planned or active sprint.',
  TASK_NOT_IN_SPRINT: 'That task is no longer in this sprint.',
};

/** Return mapped copy for a known code, or null for unknown/missing codes. */
export function sprintErrorCopy(code?: string | null): string | null {
  if (!code) return null;
  return SPRINT_ERROR_COPY[code] ?? null;
}

const warnedUnknownCodes = new Set<string>();

/**
 * Resolve one user-facing message: mapped copy, then backend message, then
 * the caller's fallback. Never stacks multiple messages.
 */
export function sprintErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiRequestError) {
    const mapped = sprintErrorCopy(cause.code);
    if (mapped) return mapped;
    if (cause.message) {
      if (process.env.NODE_ENV === 'development' && cause.code && !warnedUnknownCodes.has(cause.code)) {
        warnedUnknownCodes.add(cause.code);
        console.warn(`Unknown sprint error code: ${cause.code}`);
      }
      return cause.message;
    }
  }
  return fallback;
}
