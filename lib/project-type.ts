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

export type ProjectStarterPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ProjectStarterTaskTemplate {
  name: string;
  description?: string;
  status: 'ASSIGNED';
  priority: ProjectStarterPriority;
  category: string;
  labels: readonly string[];
}

export interface ProjectStarterChecklist {
  name: string;
  items: readonly string[];
}

export interface ProjectTypeStarter {
  workflowMode: 'SPRINTS' | 'BACKLOG_ONLY';
  taskTemplates: readonly ProjectStarterTaskTemplate[];
  checklist: ProjectStarterChecklist | null;
}

/** Optional, type-specific setup suggestions offered when creating a project. */
export const PROJECT_TYPE_STARTERS: Record<ProjectType, ProjectTypeStarter> = {
  GENERAL: {
    workflowMode: 'BACKLOG_ONLY',
    taskTemplates: [],
    checklist: null,
  },
  ENGINEERING: {
    workflowMode: 'SPRINTS',
    taskTemplates: [
      {
        name: 'Bug triage',
        description: 'Reproduce, confirm severity, assign an owner.',
        status: 'ASSIGNED',
        priority: 'HIGH',
        category: 'Engineering',
        labels: ['bug', 'triage'],
      },
      {
        name: 'Feature implementation',
        status: 'ASSIGNED',
        priority: 'MEDIUM',
        category: 'Engineering',
        labels: ['feature'],
      },
    ],
    checklist: {
      name: 'Definition of done',
      items: [
        'Requirements confirmed',
        'Implementation complete',
        'Tests added or updated',
        'Review approved',
        'Merged to default branch',
      ],
    },
  },
  DESIGN: {
    workflowMode: 'BACKLOG_ONLY',
    taskTemplates: [
      {
        name: 'Design review',
        description: 'Link the latest artwork and list the decisions needed.',
        status: 'ASSIGNED',
        priority: 'MEDIUM',
        category: 'Design',
        labels: ['design', 'review'],
      },
      {
        name: 'Design iteration',
        status: 'ASSIGNED',
        priority: 'MEDIUM',
        category: 'Design',
        labels: ['design', 'iteration'],
      },
    ],
    checklist: {
      name: 'Critique checklist',
      items: [
        'Brief and goals confirmed',
        'Latest files linked',
        'Accessibility and contrast checked',
        'Stakeholder feedback captured',
        'Final version approved',
      ],
    },
  },
  OPERATIONS: {
    workflowMode: 'BACKLOG_ONLY',
    taskTemplates: [
      {
        name: 'Operational request',
        status: 'ASSIGNED',
        priority: 'MEDIUM',
        category: 'Operations',
        labels: ['ops', 'request'],
      },
      {
        name: 'Process update',
        status: 'ASSIGNED',
        priority: 'LOW',
        category: 'Operations',
        labels: ['ops', 'process'],
      },
    ],
    checklist: {
      name: 'Process runbook',
      items: [
        'Owner assigned',
        'Current process documented',
        'Exceptions and escalation noted',
        'Review date set',
      ],
    },
  },
  MARKETING: {
    workflowMode: 'BACKLOG_ONLY',
    taskTemplates: [
      {
        name: 'Campaign asset',
        status: 'ASSIGNED',
        priority: 'MEDIUM',
        category: 'Marketing',
        labels: ['campaign', 'asset'],
      },
      {
        name: 'Campaign launch check',
        status: 'ASSIGNED',
        priority: 'HIGH',
        category: 'Marketing',
        labels: ['campaign', 'launch'],
      },
    ],
    checklist: {
      name: 'Campaign launch',
      items: [
        'Audience and channel confirmed',
        'Copy approved',
        'Assets finalised',
        'Tracking links verified',
        'Launch date confirmed',
      ],
    },
  },
  HR: {
    workflowMode: 'BACKLOG_ONLY',
    taskTemplates: [
      {
        name: 'Onboarding task',
        status: 'ASSIGNED',
        priority: 'MEDIUM',
        category: 'HR',
        labels: ['people', 'onboarding'],
      },
      {
        name: 'Policy review',
        status: 'ASSIGNED',
        priority: 'LOW',
        category: 'HR',
        labels: ['people', 'policy'],
      },
    ],
    checklist: {
      name: 'Onboarding checklist',
      items: [
        'Access request submitted',
        'Workspace and team membership confirmed',
        'Policies acknowledged',
        'Manager check-in scheduled',
      ],
    },
  },
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
