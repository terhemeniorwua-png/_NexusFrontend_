/**
 * Canonical project classification values from the backend `ProjectType` enum.
 *
 * This is a display classification only: it selects which environment renders
 * a project and grants NO access. Never use it in permission checks — the
 * backend remains the only authority for project access.
 */

/** Backend contract: ProjectType = GENERAL | ENGINEERING | DESIGN | OPERATIONS | MARKETING | HR. */
export const PROJECT_TYPES = ['GENERAL', 'ENGINEERING', 'DESIGN', 'OPERATIONS', 'MARKETING', 'HR'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const DEFAULT_PROJECT_TYPE: ProjectType = 'GENERAL';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  GENERAL: 'General',
  ENGINEERING: 'Engineering',
  DESIGN: 'Design',
  OPERATIONS: 'Operations',
  MARKETING: 'Marketing',
  HR: 'HR',
};

/** Fall back to GENERAL for missing or unknown values from older backends. */
export function normaliseProjectType(value: unknown): ProjectType {
  return typeof value === 'string' && (PROJECT_TYPES as readonly string[]).includes(value)
    ? (value as ProjectType)
    : DEFAULT_PROJECT_TYPE;
}

/** Display label safe for missing or unknown `type` values. */
export function projectTypeLabel(value: unknown): string {
  return PROJECT_TYPE_LABELS[normaliseProjectType(value)];
}
