/**
 * services/__tests__/insights.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildProjectCsv,
  loadWorkspaceInsights,
  type InsightsRange,
} from '@/services/insights';
import type { ProjectSummary } from '@/services/projects';
import type { TaskSummary } from '@/services/tasks';
import type { WorkspaceMember } from '@/services/workspaces';
import type { ActivityEntry } from '@/services/notifications';
import { ApiRequestError } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listTasks: vi.fn(),
  listWorkspaceMembers: vi.fn(),
  listActivity: vi.fn(),
  getFileUsage: vi.fn(),
  getBillingSummary: vi.fn(),
}));

vi.mock('@/services/projects', () => ({ listProjects: mocks.listProjects }));
vi.mock('@/services/tasks', () => ({ listTasks: mocks.listTasks }));
vi.mock('@/services/workspaces', () => ({ listWorkspaceMembers: mocks.listWorkspaceMembers }));
vi.mock('@/services/notifications', () => ({ listActivity: mocks.listActivity }));
vi.mock('@/services/files', () => ({ getFileUsage: mocks.getFileUsage }));
vi.mock('@/services/billing', () => ({ getBillingSummary: mocks.getBillingSummary }));

const NOW = new Date('2026-11-09T12:00:00.000Z');

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 'project-1',
    workspaceId: 'ws-1',
    teamId: null,
    departmentId: null,
    name: 'Website redesign',
    key: 'WEB',
    description: null,
    category: null,
    labels: [],
    status: 'ACTIVE',
    visibility: 'WORKSPACE',
    startDate: null,
    dueDate: '2026-12-01T00:00:00.000Z',
    ownerId: 'user-1',
    owner: { id: 'user-1', name: 'Ada' },
    memberCount: 4,
    taskCount: 10,
    myRole: 'PROJECT_MANAGER',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z',
    ...overrides,
  };
}

function task(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: 'task-1',
    projectId: 'project-1',
    key: 'WEB-1',
    title: 'Ship it',
    description: null,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    category: null,
    labels: [],
    startDate: null,
    dueDate: '2026-11-01T00:00:00.000Z',
    position: 0,
    parentTaskId: null,
    creatorId: 'user-1',
    creator: { id: 'user-1', name: 'Ada' },
    assignees: [],
    dependencies: [],
    blockers: [],
    subTaskCount: 0,
    commentCount: 0,
    attachmentCount: 0,
    archivedAt: null,
    completedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

function member(overrides: Partial<WorkspaceMember> = {}): WorkspaceMember {
  return {
    id: 'member-1',
    userId: 'user-1',
    name: 'Ada',
    email: 'ada@example.com',
    status: 'ACTIVE',
    role: 'MEMBER',
    organizationRole: 'COMPANY_MEMBER',
    membershipStatus: 'ACTIVE',
    joinedAt: '2026-01-01T00:00:00.000Z',
    owner: false,
    ...overrides,
  };
}

function activity(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id: 'activity-1',
    action: 'PROJECT_CREATED',
    actorId: 'user-1',
    targetType: 'PROJECT',
    targetId: 'project-1',
    metadata: null,
    createdAt: '2026-11-08T00:00:00.000Z',
    ...overrides,
  };
}

function range(): InsightsRange {
  return '30d';
}

function setupHappyPath() {
  mocks.listProjects.mockResolvedValue({
    items: [
      project(),
      project({
        id: 'project-2',
        name: 'Mobile app',
        key: 'MOB',
        status: 'COMPLETED',
        visibility: 'PRIVATE',
        taskCount: 5,
        memberCount: 2,
        dueDate: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-11-07T00:00:00.000Z',
      }),
    ],
    nextCursor: null,
  });
  mocks.listTasks.mockImplementation((_workspaceId: string, projectId: string) =>
    Promise.resolve({
      items:
        projectId === 'project-1'
          ? [
              task({ id: 'task-1', status: 'IN_PROGRESS', priority: 'HIGH' }),
              task({
                id: 'task-2',
                status: 'APPROVED',
                priority: 'LOW',
                completedAt: '2026-11-05T00:00:00.000Z',
                dueDate: null,
              }),
              task({ id: 'task-3', status: 'ASSIGNED', priority: 'URGENT' }),
            ]
          : [task({ id: 'task-4', projectId: 'project-2', status: 'APPROVED', completedAt: '2026-09-01T00:00:00.000Z', dueDate: null })],
      nextCursor: null,
    }),
  );
  mocks.listWorkspaceMembers.mockResolvedValue([
    member(),
    member({ id: 'member-2', userId: 'user-2', organizationRole: 'COMPANY_ADMIN' }),
    member({ id: 'member-3', userId: 'user-3', organizationRole: null, role: 'VIEWER', membershipStatus: 'SUSPENDED' }),
  ]);
  mocks.listActivity.mockResolvedValue({
    items: [
      activity({ id: 'a-1', action: 'PROJECT_CREATED', createdAt: '2026-11-08T00:00:00.000Z' }),
      activity({ id: 'a-2', action: 'PROJECT_CREATED', createdAt: '2026-11-07T00:00:00.000Z' }),
      activity({ id: 'a-3', action: 'TASK_COMPLETED', createdAt: '2026-09-01T00:00:00.000Z' }),
    ],
    nextCursor: null,
  });
  mocks.getFileUsage.mockResolvedValue({ totalBytes: 2048, fileCount: 4 });
  mocks.getBillingSummary.mockResolvedValue({
    subscription: {
      id: 'sub-1',
      plan: 'BUSINESS',
      interval: 'MONTHLY',
      currency: 'USD',
      status: 'ACTIVE',
      billableSeats: 3,
      currentPeriodStart: '2026-11-01T00:00:00.000Z',
      currentPeriodEnd: '2026-12-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      pendingChange: null,
    },
    activeBillableSeats: 3,
    includedSeats: 5,
    additionalSeats: 0,
    nextRenewalAt: '2026-12-01T00:00:00.000Z',
  });
}

describe('loadWorkspaceInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPath();
  });

  it('aggregates projects, tasks, members, activity, storage, and billing', async () => {
    const insights = await loadWorkspaceInsights('ws-1', { range: range(), now: NOW });

    expect(insights.projects.total).toBe(2);
    expect(insights.projects.active).toBe(1);
    expect(insights.projects.completed).toBe(1);
    expect(insights.projects.byStatus.find((entry) => entry.key === 'ACTIVE')?.count).toBe(1);
    expect(insights.projects.byVisibility.find((entry) => entry.key === 'PRIVATE')?.count).toBe(1);

    expect(insights.tasks.totalAcrossProjects).toBe(15);
    expect(insights.tasks.sampledProjects).toBe(2);
    expect(insights.tasks.sampledTasks).toBe(4);
    expect(insights.tasks.byStatus.find((entry) => entry.key === 'APPROVED')?.count).toBe(2);
    expect(insights.tasks.byPriority.find((entry) => entry.key === 'URGENT')?.count).toBe(1);
    expect(insights.tasks.overdue).toBe(2);

    expect(insights.members?.total).toBe(3);
    expect(insights.members?.active).toBe(2);
    expect(insights.members?.suspended).toBe(1);
    expect(insights.members?.byRole).toEqual([
      { role: 'COMPANY_ADMIN', count: 1 },
      { role: 'COMPANY_MEMBER', count: 1 },
      { role: 'VIEWER', count: 1 },
    ]);

    expect(insights.activity?.totalInRange).toBe(2);
    expect(insights.activity?.byAction).toEqual([{ action: 'PROJECT_CREATED', count: 2 }]);

    expect(insights.storage).toEqual({ totalBytes: 2048, fileCount: 4 });
    expect(insights.billing?.subscription?.plan).toBe('BUSINESS');
    expect(insights.warnings).toEqual([]);
  });

  it('filters activity and completed tasks to the selected range', async () => {
    const insights = await loadWorkspaceInsights('ws-1', { range: '7d', now: NOW });

    // 2026-11-08 and 2026-11-07 are within 7 days; 2026-09-01 is not.
    expect(insights.activity?.totalInRange).toBe(2);
    // Only task-2 completed within 7 days.
    expect(insights.tasks.completedInRange).toBe(1);
  });

  it('includes all activity for the "all" range', async () => {
    const insights = await loadWorkspaceInsights('ws-1', { range: 'all', now: NOW });
    expect(insights.activity?.totalInRange).toBe(3);
    expect(insights.tasks.completedInRange).toBe(2);
  });

  it('degrades gracefully when individual sources fail', async () => {
    mocks.listWorkspaceMembers.mockRejectedValue(new ApiRequestError('Forbidden', 403, 'FORBIDDEN'));
    mocks.getFileUsage.mockRejectedValue(new ApiRequestError('Unavailable', 503));
    mocks.getBillingSummary.mockRejectedValue(new ApiRequestError('No billing', 404));

    const insights = await loadWorkspaceInsights('ws-1', { now: NOW });

    expect(insights.members).toBeNull();
    expect(insights.storage).toBeNull();
    expect(insights.billing).toBeNull();
    expect(insights.warnings.map((warning) => warning.source)).toEqual([
      'members',
      'storage',
      'billing',
    ]);
    // Healthy sources still return data.
    expect(insights.projects.total).toBe(2);
  });

  it('records a task warning when a sampled project fails', async () => {
    mocks.listTasks.mockImplementation((_workspaceId: string, projectId: string) => {
      if (projectId === 'project-1') return Promise.reject(new ApiRequestError('Denied', 403));
      return Promise.resolve({ items: [task({ id: 't', projectId: 'project-2' })], nextCursor: null });
    });

    const insights = await loadWorkspaceInsights('ws-1', { now: NOW });

    expect(insights.warnings.some((warning) => warning.source === 'tasks')).toBe(true);
    expect(insights.tasks.sampledProjects).toBe(1);
  });

  it('marks truncated project and task samples', async () => {
    mocks.listProjects.mockResolvedValue({
      items: [project()],
      nextCursor: 'more',
    });
    mocks.listTasks.mockResolvedValue({ items: [task()], nextCursor: 'more' });

    const insights = await loadWorkspaceInsights('ws-1', { now: NOW });

    expect(insights.projects.truncated).toBe(true);
    expect(insights.tasks.truncated).toBe(true);
  });
});

describe('buildProjectCsv', () => {
  it('escapes commas and quotes in project names', async () => {
    mocks.listProjects.mockResolvedValue({
      items: [project({ name: 'Website, "final"' })],
      nextCursor: null,
    });
    const insights = await loadWorkspaceInsights('ws-1', { now: NOW });

    const csv = buildProjectCsv(insights);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Project,Key,Status,Visibility,Tasks,Members,Due date,Overdue');
    expect(lines[1]).toContain('"Website, ""final"""');
  });
});
