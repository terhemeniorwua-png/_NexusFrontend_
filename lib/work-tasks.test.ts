import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyTasksQuery } from './work-tasks';

const mocks = vi.hoisted(() => ({
  listMineTasks: vi.fn(),
  listTasks: vi.fn(),
  listProjects: vi.fn(),
}));

vi.mock('@/services/tasks', () => ({
  listMineTasks: mocks.listMineTasks,
  listTasks: mocks.listTasks,
}));

vi.mock('@/services/projects', () => ({
  listProjects: mocks.listProjects,
}));

function task(id: string) {
  return {
    id,
    title: `Task ${id}`,
    status: 'IN_PROGRESS',
  };
}

describe('listMyTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listProjects.mockResolvedValue({ items: [], nextCursor: null });
    mocks.listTasks.mockResolvedValue({ items: [], nextCursor: null });
  });

  it('uses GET /workspaces/{workspaceId}/tasks/mine when available', async () => {
    const mineTask = { ...task('mine-1'), projectName: 'Alpha', projectKeyLabel: 'ALP' };
    mocks.listMineTasks.mockResolvedValue({ items: [mineTask], nextCursor: null });

    const { listMyTasks } = await import('./work-tasks');
    const result = await listMyTasks('ws-1', 'user-1', { status: 'IN_PROGRESS', limit: 25 });

    expect(result.items).toEqual([mineTask]);
    expect(mocks.listMineTasks).toHaveBeenCalledWith('ws-1', {
      status: 'IN_PROGRESS',
      priority: undefined,
      limit: 25,
    });
    expect(mocks.listProjects).not.toHaveBeenCalled();
    expect(mocks.listTasks).not.toHaveBeenCalled();
  });

  it('falls back to project-scoped lists when the mine route returns 404', async () => {
    mocks.listMineTasks.mockRejectedValue({ status: 404 });
    mocks.listProjects.mockResolvedValue({
      items: [{ id: 'project-1', name: 'Alpha', key: 'ALP' }],
      nextCursor: null,
    });
    mocks.listTasks.mockResolvedValue({ items: [task('fallback-1')], nextCursor: null });

    const { listMyTasks } = await import('./work-tasks');
    const result = await listMyTasks('ws-1', 'user-1', { status: 'IN_PROGRESS', limit: 25 });

    expect(result.items).toEqual([{
      ...task('fallback-1'),
      projectName: 'Alpha',
      projectKeyLabel: 'ALP',
    }]);
    expect(mocks.listTasks).toHaveBeenCalledWith('ws-1', 'project-1', {
      status: 'IN_PROGRESS',
      limit: 100,
      assigneeId: 'user-1',
    });
  });

  it('does not fall back for non-404 failures', async () => {
    mocks.listMineTasks.mockRejectedValue({ status: 500, message: 'Server error' });

    const { listMyTasks } = await import('./work-tasks');
    await expect(listMyTasks('ws-1', 'user-1')).rejects.toMatchObject({ status: 500 });
    expect(mocks.listProjects).not.toHaveBeenCalled();
    expect(mocks.listTasks).not.toHaveBeenCalled();
  });

  it('does not forward generic task-list filters ignored by the mine route', async () => {
    const mineTask = { ...task('mine-2'), projectName: 'Alpha', projectKeyLabel: 'ALP' };
    mocks.listMineTasks.mockResolvedValue({ items: [mineTask], nextCursor: null });
    const query = {
      status: 'IN_PROGRESS',
      limit: 25,
      assigneeId: 'user-1',
      labels: ['bug'],
      search: 'auth',
      sortBy: 'priority',
      sortOrder: 'desc',
    } as MyTasksQuery & {
      assigneeId: string;
      labels: string[];
      search: string;
      sortBy: string;
      sortOrder: string;
    };

    const { listMyTasks } = await import('./work-tasks');
    await listMyTasks('ws-1', 'user-1', query);

    expect(mocks.listMineTasks).toHaveBeenCalledWith('ws-1', {
      status: 'IN_PROGRESS',
      priority: undefined,
      limit: 25,
    });
  });

  it('does not leak ignored filters into the project-scoped fallback', async () => {
    mocks.listMineTasks.mockRejectedValue({ status: 404 });
    mocks.listProjects.mockResolvedValue({
      items: [{ id: 'project-1', name: 'Alpha', key: 'ALP' }],
      nextCursor: null,
    });
    mocks.listTasks.mockResolvedValue({ items: [task('fallback-2')], nextCursor: null });
    const query = {
      status: 'IN_PROGRESS',
      limit: 25,
      labels: ['bug'],
      search: 'auth',
    } as MyTasksQuery & { labels: string[]; search: string };

    const { listMyTasks } = await import('./work-tasks');
    await listMyTasks('ws-1', 'user-1', query);

    expect(mocks.listTasks).toHaveBeenCalledWith('ws-1', 'project-1', {
      status: 'IN_PROGRESS',
      priority: undefined,
      assigneeId: 'user-1',
      limit: 100,
    });
  });
});
