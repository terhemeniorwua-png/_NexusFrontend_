/**
 * Canonical project classification values from the backend `ProjectType` enum.
 *
 * Classification only: it does not grant access or change permissions, and
 * changing it never deletes or hides work. Never use it in permission checks —
 * the backend remains the only authority for project access.
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

/** Tab keys that exist today in the project layout. No tab is created here. */
export type ProjectTabKey =
  | 'overview'
  | 'tasks'
  | 'sprints'
  | 'members'
  | 'checklists'
  | 'reviews'
  | 'milestones'
  | 'code'
  | 'dev-activity'
  | 'dev-activity-developers'
  | 'activity'
  | 'reports'
  | 'settings';

/** Today's order; also the fallback for GENERAL and unknown or missing types. */
export const DEFAULT_PROJECT_TAB_ORDER: readonly ProjectTabKey[] = [
  'overview',
  'tasks',
  'sprints',
  'members',
  'checklists',
  'reviews',
  'milestones',
  'code',
  'dev-activity',
  'dev-activity-developers',
  'activity',
  'reports',
  'settings',
];

/**
 * Per-type section order. GENERAL is intentionally absent so it keeps today's
 * order. Every key below already exists in the project layout.
 */
export const PROJECT_TYPE_TAB_ORDER: Partial<Record<ProjectType, readonly ProjectTabKey[]>> = {
  ENGINEERING: [
    'overview', 'tasks', 'sprints', 'code', 'dev-activity', 'dev-activity-developers', 'reviews', 'checklists',
    'milestones', 'members', 'activity', 'reports', 'settings',
  ],
  DESIGN: [
    'overview', 'tasks', 'reviews', 'checklists', 'sprints', 'milestones',
    'code', 'dev-activity', 'dev-activity-developers', 'members', 'activity', 'reports', 'settings',
  ],
  OPERATIONS: [
    'overview', 'tasks', 'checklists', 'milestones', 'members', 'activity',
    'code', 'dev-activity', 'dev-activity-developers', 'reviews', 'reports', 'settings',
  ],
  MARKETING: [
    'overview', 'tasks', 'milestones', 'checklists', 'reviews', 'members',
    'activity', 'code', 'dev-activity', 'dev-activity-developers', 'reports', 'settings',
  ],
  HR: [
    'overview', 'tasks', 'checklists', 'members', 'reviews', 'milestones',
    'activity', 'code', 'dev-activity', 'dev-activity-developers', 'reports', 'settings',
  ],
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

/**
 * Order the supplied tabs for a project type without adding or removing any.
 * Keys not present in the type's order keep their original relative order and
 * are placed after the listed keys. Unknown or missing types use today's order.
 */
export function orderTabsForType<T extends { key: string }>(
  tabs: readonly T[],
  type: unknown,
): T[] {
  const order = PROJECT_TYPE_TAB_ORDER[normaliseProjectType(type)] ?? DEFAULT_PROJECT_TAB_ORDER;
  const positions = new Map<string, number>(order.map((key, index) => [key, index]));
  return tabs
    .map((tab, index) => ({ tab, index, rank: positions.get(tab.key) ?? order.length }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ tab }) => tab);
}
