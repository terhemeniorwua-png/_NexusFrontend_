import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiRequest: mocks.apiRequest,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

vi.mock('@/services/auth', () => ({
  refreshSession: mocks.refreshSession,
}));

const WS = 'workspace-1';
const PID = 'project-1';
const TID = 'task-1';

describe('tasks service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSession.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // listTasks
  // ---------------------------------------------------------------------------

  it('listTasks calls the correct workspace/project-scoped path', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listTasks } = await import('../tasks');
    await listTasks(WS, PID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('listTasks passes status, priority, and search query params', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listTasks } = await import('../tasks');
    await listTasks(WS, PID, { status: 'IN_PROGRESS', priority: 'HIGH', search: 'auth' });
    const url: string = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain('status=IN_PROGRESS');
    expect(url).toContain('priority=HIGH');
    expect(url).toContain('search=auth');
  });

  it('listTasks passes includeArchived and sortBy params', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listTasks } = await import('../tasks');
    await listTasks(WS, PID, { includeArchived: true, sortBy: 'dueDate', sortOrder: 'desc' });
    const url: string = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain('includeArchived=true');
    expect(url).toContain('sortBy=dueDate');
    expect(url).toContain('sortOrder=desc');
  });

  // ---------------------------------------------------------------------------
  // getTask
  // ---------------------------------------------------------------------------

  it('getTask calls the correct task path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: TID });
    const { getTask } = await import('../tasks');
    await getTask(WS, PID, TID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  // ---------------------------------------------------------------------------
  // createTask
  // ---------------------------------------------------------------------------

  it('createTask sends POST to the tasks collection path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: TID });
    const { createTask } = await import('../tasks');
    await createTask(WS, PID, { title: 'Fix bug', priority: 'HIGH' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks`,
      expect.objectContaining({ method: 'POST', authenticated: true }),
    );
  });

  it('createTask includes the input body in the request', async () => {
    mocks.apiRequest.mockResolvedValue({ id: TID });
    const { createTask } = await import('../tasks');
    await createTask(WS, PID, { title: 'Fix bug', priority: 'HIGH', labels: ['bug'] });
    const callOptions = mocks.apiRequest.mock.calls[0][1] as { body: string };
    const body = JSON.parse(callOptions.body) as { title: string; priority: string; labels: string[] };
    expect(body.title).toBe('Fix bug');
    expect(body.priority).toBe('HIGH');
    expect(body.labels).toEqual(['bug']);
  });

  // ---------------------------------------------------------------------------
  // updateTask
  // ---------------------------------------------------------------------------

  it('updateTask sends PATCH to the correct task path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: TID });
    const { updateTask } = await import('../tasks');
    await updateTask(WS, PID, TID, { title: 'Updated title' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}`,
      expect.objectContaining({ method: 'PATCH', authenticated: true }),
    );
  });

  // ---------------------------------------------------------------------------
  // deleteTask
  // ---------------------------------------------------------------------------

  it('deleteTask sends DELETE to the correct task path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: TID, deleted: true });
    const { deleteTask } = await import('../tasks');
    await deleteTask(WS, PID, TID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}`,
      expect.objectContaining({ method: 'DELETE', authenticated: true }),
    );
  });

  // ---------------------------------------------------------------------------
  // Archive / Restore
  // ---------------------------------------------------------------------------

  it('archiveTask sends POST to the archive sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: TID, archived: true });
    const { archiveTask } = await import('../tasks');
    await archiveTask(WS, PID, TID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/archive`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('restoreTask sends POST to the restore sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: TID, archived: false });
    const { restoreTask } = await import('../tasks');
    await restoreTask(WS, PID, TID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/restore`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  // ---------------------------------------------------------------------------
  // Complete / Reopen
  // ---------------------------------------------------------------------------

  it('completeTask sends POST to the complete sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: TID, status: 'APPROVED', completedAt: '2026-01-01T00:00:00Z' });
    const { completeTask } = await import('../tasks');
    await completeTask(WS, PID, TID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/complete`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('reopenTask sends POST to the reopen sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: TID, status: 'IN_PROGRESS', completedAt: null });
    const { reopenTask } = await import('../tasks');
    await reopenTask(WS, PID, TID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/reopen`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  // ---------------------------------------------------------------------------
  // Assignees
  // ---------------------------------------------------------------------------

  it('addAssignee sends POST to the assignees sub-path with targetUserId', async () => {
    mocks.apiRequest.mockResolvedValue({ taskId: TID, userId: 'user-2', user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' }, assignedBy: 'user-1' });
    const { addAssignee } = await import('../tasks');
    await addAssignee(WS, PID, TID, 'user-2');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/assignees`,
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((mocks.apiRequest.mock.calls[0][1] as { body: string }).body) as { targetUserId: string };
    expect(body.targetUserId).toBe('user-2');
  });

  it('removeAssignee sends DELETE to the assignees/:userId sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ taskId: TID, userId: 'user-2', removed: true });
    const { removeAssignee } = await import('../tasks');
    await removeAssignee(WS, PID, TID, 'user-2');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/assignees/user-2`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  // ---------------------------------------------------------------------------
  // Dependencies
  // ---------------------------------------------------------------------------

  it('addDependency sends POST to the dependencies sub-path with dependsOnTaskId', async () => {
    mocks.apiRequest.mockResolvedValue({ taskId: TID, dependsOnTaskId: 'task-2', dependsOnTask: { id: 'task-2', key: 'NX-2', title: 'Other', status: 'ASSIGNED' } });
    const { addDependency } = await import('../tasks');
    await addDependency(WS, PID, TID, 'task-2');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/dependencies`,
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((mocks.apiRequest.mock.calls[0][1] as { body: string }).body) as { dependsOnTaskId: string };
    expect(body.dependsOnTaskId).toBe('task-2');
  });

  it('removeDependency sends DELETE to the dependencies/:dependsOnTaskId sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ taskId: TID, dependsOnTaskId: 'task-2', removed: true });
    const { removeDependency } = await import('../tasks');
    await removeDependency(WS, PID, TID, 'task-2');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/dependencies/task-2`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  it('listComments calls the comments sub-path', async () => {
    mocks.apiRequest.mockResolvedValue([]);
    const { listComments } = await import('../tasks');
    await listComments(WS, PID, TID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/comments`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('listComments passes the limit query param when provided', async () => {
    mocks.apiRequest.mockResolvedValue([]);
    const { listComments } = await import('../tasks');
    await listComments(WS, PID, TID, 25);
    const url: string = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain('limit=25');
  });

  it('addComment sends POST to the comments sub-path with body', async () => {
    mocks.apiRequest.mockResolvedValue({ id: 'comment-1', body: 'LGTM' });
    const { addComment } = await import('../tasks');
    await addComment(WS, PID, TID, 'LGTM');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/comments`,
      expect.objectContaining({ method: 'POST' }),
    );
    const payload = JSON.parse((mocks.apiRequest.mock.calls[0][1] as { body: string }).body) as { body: string; parentId: null };
    expect(payload.body).toBe('LGTM');
    expect(payload.parentId).toBeNull();
  });

  it('updateComment sends PATCH to the correct comment path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: 'comment-1', body: 'Updated' });
    const { updateComment } = await import('../tasks');
    await updateComment(WS, PID, TID, 'comment-1', 'Updated');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/comments/comment-1`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('deleteComment sends DELETE to the correct comment path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: 'comment-1', deleted: true });
    const { deleteComment } = await import('../tasks');
    await deleteComment(WS, PID, TID, 'comment-1');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/comments/comment-1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  // ---------------------------------------------------------------------------
  // Session refresh retry
  // ---------------------------------------------------------------------------

  it('refreshes session and retries request on 401', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.apiRequest
      .mockRejectedValueOnce(new ApiRequestError('Unauthorized', 401))
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const { listTasks } = await import('../tasks');
    await listTasks(WS, PID);
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-401 errors', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.apiRequest.mockRejectedValueOnce(new ApiRequestError('Server error', 500));
    const { listTasks } = await import('../tasks');
    await expect(listTasks(WS, PID)).rejects.toThrow();
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
  });
});
