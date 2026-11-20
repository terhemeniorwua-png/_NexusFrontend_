import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskWorkPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null; timeTrackingEnabled?: boolean },
  user: null as null | { id: string; name: string; email: string },
  permissionState: null as unknown,
  getTaskWorkspace: vi.fn(),
  getProject: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  submitTask: vi.fn(),
  listComments: vi.fn(),
  listFiles: vi.fn(),
  listTaskActivity: vi.fn(),
  listTaskTimeEntries: vi.fn(),
  reportTaskBlocker: vi.fn(),
  resolveTaskBlocker: vi.fn(),
  completeSubtask: vi.fn(),
  updateTask: vi.fn(),
  subtaskProps: null as null | Record<string, unknown>,
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1', taskId: 'task-1' }),
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({
    activeWorkspace: mocks.activeWorkspace,
    user: mocks.user,
    loading: false,
  }),
}));

vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => mocks.permissionState,
}));

vi.mock('@/services/tasks', () => ({
  addComment: vi.fn(),
  completeSubtask: mocks.completeSubtask,
  createTask: mocks.createTask,
  createTaskTimeEntry: vi.fn(),
  deleteComment: vi.fn(),
  deleteTask: mocks.deleteTask,
  deleteTaskTimeEntry: vi.fn(),
  getTaskWorkspace: mocks.getTaskWorkspace,
  listComments: mocks.listComments,
  listTaskActivity: mocks.listTaskActivity,
  listTaskTimeEntries: mocks.listTaskTimeEntries,
  reportTaskBlocker: mocks.reportTaskBlocker,
  resolveTaskBlocker: mocks.resolveTaskBlocker,
  submitTask: mocks.submitTask,
  updateComment: vi.fn(),
  updateTask: mocks.updateTask,
  updateTaskTimeEntry: vi.fn(),
}));

vi.mock('@/services/projects', () => ({
  getProject: mocks.getProject,
}));

vi.mock('@/services/files', () => ({
  listFiles: mocks.listFiles,
}));

vi.mock('@/services/dev-integrations', () => ({
  listProjectRepositories: vi.fn().mockResolvedValue([]),
  listRepositoryBranches: vi.fn().mockResolvedValue([]),
  listRepositoryPullRequests: vi.fn().mockResolvedValue([]),
  listTaskDevLinks: vi.fn().mockResolvedValue([]),
  linkTaskDevLink: vi.fn(),
  unlinkTaskDevLink: vi.fn(),
}));

vi.mock('@/components/task-workspace/TaskWorkspaceHeader', () => ({
  TaskWorkspaceHeader: ({ taskTitle, status, saveState }: {
    taskTitle: string;
    status: string;
    saveState: string;
  }) => (
    <div data-testid="workspace-header">
      <span>{taskTitle}</span>
      <span>{status}</span>
      <span data-testid="save-state">{saveState}</span>
    </div>
  ),
}));

vi.mock('@/components/task-workspace/TaskWorkspaceLayout', () => ({
  TaskWorkspaceLayout: ({ header, children }: { header: React.ReactNode; children: React.ReactNode }) => (
    <div>{header}{children}</div>
  ),
}));

vi.mock('@/components/task-workspace/TaskOverview', () => ({
  TaskOverview: ({ task }: { task: { title: string } }) => <div>Overview for {task.title}</div>,
}));

vi.mock('@/components/task-workspace/TaskSubmissionPanel', () => ({
  TaskSubmissionPanel: ({ onSubmit, error }: {
    onSubmit: (summary: string) => Promise<void>;
    error: string | null;
  }) => (
    <div>
      {error ? <span>{error}</span> : null}
      <button type="button" onClick={() => void onSubmit('Completed the work')}>Submit work</button>
    </div>
  ),
}));

vi.mock('@/components/task-workspace/SubtaskManager', () => ({
  SubtaskManager: (props: Record<string, unknown>) => {
    mocks.subtaskProps = props;
    return null;
  },
}));
vi.mock('@/components/task-workspace/AttachmentManager', () => ({ AttachmentManager: () => null }));
vi.mock('@/components/task-workspace/TaskDiscussion', () => ({ TaskDiscussion: () => null }));
vi.mock('@/components/task-workspace/TaskActivityTimeline', () => ({ TaskActivityTimeline: () => null }));
vi.mock('@/components/task-workspace/TaskProgressTracker', () => ({ TaskProgressTracker: () => null }));
vi.mock('@/components/task-workspace/WorkDocuments', () => ({ WorkDocuments: () => null }));
vi.mock('@/components/task-workspace/TaskTimeTracking', () => ({ TaskTimeTracking: () => null }));
vi.mock('@/components/task-workspace/TaskDevelopment', () => ({ TaskDevelopment: () => null }));

function workspaceData(status = 'IN_PROGRESS', parentTaskId: string | null = null) {
  const task = {
    id: 'task-1',
    projectId: 'project-1',
    key: 'ALP-1',
    title: 'Fix authentication',
    description: null,
    status,
    priority: 'HIGH',
    category: null,
    labels: [],
    startDate: null,
    dueDate: null,
    position: 0,
    parentTaskId,
    creatorId: 'user-1',
    creator: { id: 'user-1', name: 'Alice' },
    assignees: [{ userId: 'user-2', user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' }, assignedBy: 'user-1', createdAt: '' }],
    dependencies: [],
    blockers: [],
    subTaskCount: 0,
    commentCount: 0,
    attachmentCount: 0,
    archivedAt: null,
    completedAt: null,
    createdAt: '',
    updatedAt: '',
    hasOpenBlocker: false,
    reportedBlockers: [],
  };
  return {
    task,
    subtasks: [],
    progress: { percent: 0, completed: 0, total: 0 },
    people: { assignees: task.assignees, assignedBy: 'user-1', reviewer: null },
    schedule: { startDate: null, dueDate: null, overdue: false },
    recentActivity: [],
  };
}

describe('TaskWorkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
    mocks.subtaskProps = null;
    mocks.activeWorkspace = {
      id: 'ws-1',
      name: 'Acme',
      type: 'COMPANY',
      role: 'OWNER',
      organizationRole: null,
      timeTrackingEnabled: false,
    };
    mocks.user = { id: 'user-2', name: 'Bob', email: 'bob@example.com' };
    mocks.permissionState = {
      isLoading: false,
      accessStatus: null,
      can: (permission: string) => ['task.view', 'task.comment', 'task.create', 'task.delete', 'submission.submit'].includes(permission),
      canAny: () => true,
      canAll: () => true,
      permissions: ['task.view', 'task.comment', 'task.create', 'task.delete', 'submission.submit'],
    };
    mocks.getTaskWorkspace.mockResolvedValue(workspaceData());
    mocks.getProject.mockResolvedValue({ name: 'Alpha' });
    mocks.createTask.mockResolvedValue({ id: 'subtask-1' });
    mocks.deleteTask.mockResolvedValue({ id: 'subtask-1', deleted: true });
    mocks.submitTask.mockResolvedValue({ id: 'task-1', status: 'SUBMITTED' });
    mocks.listTaskActivity.mockResolvedValue({ items: [], nextCursor: null });
    mocks.listTaskTimeEntries.mockResolvedValue({ items: [], totalMinutes: 0 });
  });

  it('loads the workspace and submits work through the verified service', async () => {
    render(<TaskWorkPage />);

    expect(await screen.findByText('Overview for Fix authentication')).toBeInTheDocument();
    expect(screen.getByTestId('save-state')).toHaveTextContent('idle');

    await userEvent.click(screen.getByRole('button', { name: 'Submit work' }));

    await waitFor(() => {
      expect(mocks.submitTask).toHaveBeenCalledWith('ws-1', 'project-1', 'task-1', 'Completed the work');
      expect(mocks.getTaskWorkspace).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByTestId('save-state')).toHaveTextContent('saved');
  });

  it('wires subtask create and delete through the verified services', async () => {
    window.location.hash = '#subtasks';
    render(<TaskWorkPage />);

    await waitFor(() => expect(mocks.subtaskProps).not.toBeNull());
    expect(mocks.subtaskProps).toEqual(expect.objectContaining({
      canCreateSubtask: true,
      canDeleteSubtask: true,
    }));

    const input = { title: 'Write tests', parentTaskId: 'task-1', position: 0, weight: 2 };
    const onCreate = mocks.subtaskProps?.onCreate as (value: typeof input) => Promise<void>;
    await act(async () => { await onCreate(input); });
    expect(mocks.createTask).toHaveBeenCalledWith('ws-1', 'project-1', input);

    const onDelete = mocks.subtaskProps?.onDelete as (sub: { id: string }) => Promise<void>;
    await act(async () => { await onDelete({ id: 'subtask-1' }); });
    expect(mocks.deleteTask).toHaveBeenCalledWith('ws-1', 'project-1', 'subtask-1');
  });

  it('does not offer subtask creation on a subtask', async () => {
    window.location.hash = '#subtasks';
    mocks.getTaskWorkspace.mockResolvedValue(workspaceData('IN_PROGRESS', 'parent-1'));
    render(<TaskWorkPage />);

    await waitFor(() => expect(mocks.subtaskProps).not.toBeNull());
    expect(mocks.subtaskProps).toEqual(expect.objectContaining({
      canCreateSubtask: false,
      canDeleteSubtask: true,
    }));
  });
});
