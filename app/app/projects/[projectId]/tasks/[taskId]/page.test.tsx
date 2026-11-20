import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import TaskDetailPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  user: null as null | { id: string; name: string; email: string },
  permissionState: null as unknown,
  getTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  archiveTask: vi.fn(),
  restoreTask: vi.fn(),
  completeTask: vi.fn(),
  reopenTask: vi.fn(),
  addAssignee: vi.fn(),
  removeAssignee: vi.fn(),
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
  listComments: vi.fn(),
  addComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  reviewTask: vi.fn(),
  submitTask: vi.fn(),
  listFiles: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  listProjectMembers: vi.fn(),
  push: vi.fn(),
}));

function setRole(role: 'PROJECT_MANAGER' | 'MEMBER' | 'COLLABORATOR' | 'VIEWER') {
  const perms: Record<string, string[]> = {
    PROJECT_MANAGER: [
      'project.view', 'task.view', 'task.update', 'task.delete', 'task.assign', 'task.reassign',
      'task.complete', 'task.comment', 'file.upload', 'file.delete.any',
      'submission.submit', 'submission.review', 'submission.approve', 'submission.reject',
      'submission.request_revision',
    ],
    MEMBER: [
      'project.view', 'task.view', 'task.update', 'task.complete', 'task.comment',
      'file.upload', 'file.delete.own',
    ],
    COLLABORATOR: [
      'project.view', 'task.view', 'task.comment', 'file.upload',
    ],
    VIEWER: ['project.view', 'task.view'],
  };
  mocks.permissionState = {
    permissions: perms[role],
    projectRole: role,
    workspaceRole: 'OWNER',
    accessSource: 'project_member',
    assignableRoles: [],
    roleDefinitions: [],
    isLoading: false,
    accessStatus: null,
    error: null,
    can: (permission: string) => perms[role].includes(permission),
    canAny: (list: string[]) => list.some((p) => perms[role].includes(p)),
    canAll: (list: string[]) => list.every((p) => perms[role].includes(p)),
    refresh: vi.fn(),
  };
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: mocks.push }),
  useParams: () => ({ projectId: 'project-1', taskId: 'task-1' }),
  usePathname: () => '/app/projects/project-1/tasks/task-1',
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
  getTask: mocks.getTask,
  updateTask: mocks.updateTask,
  deleteTask: mocks.deleteTask,
  archiveTask: mocks.archiveTask,
  restoreTask: mocks.restoreTask,
  completeTask: mocks.completeTask,
  reopenTask: mocks.reopenTask,
  addAssignee: mocks.addAssignee,
  removeAssignee: mocks.removeAssignee,
  addDependency: mocks.addDependency,
  removeDependency: mocks.removeDependency,
  listComments: mocks.listComments,
  addComment: mocks.addComment,
  updateComment: mocks.updateComment,
  deleteComment: mocks.deleteComment,
  reviewTask: mocks.reviewTask,
  submitTask: mocks.submitTask,
}));

vi.mock('@/services/projects', () => ({
  listProjectMembers: mocks.listProjectMembers,
}));

vi.mock('@/services/files', () => ({
  deleteFile: mocks.deleteFile,
  formatBytes: () => '1 KB',
  listFiles: mocks.listFiles,
  uploadFile: mocks.uploadFile,
}));

const task1 = {
  id: 'task-1', projectId: 'project-1', key: 'NX-1', title: 'Fix authentication bug',
  description: null, status: 'ASSIGNED', priority: 'HIGH', category: null, labels: [],
  startDate: null, dueDate: null, position: 0, parentTaskId: null,
  creatorId: 'user-1', creator: { id: 'user-1', name: 'Alice' },
  assignees: [
    { userId: 'user-2', user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' }, assignedBy: 'user-1', createdAt: '2026-01-01T00:00:00.000Z' },
  ],
  dependencies: [], blockers: [],
  subTaskCount: 0, commentCount: 2, attachmentCount: 0,
  archivedAt: null, completedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TaskDetailPage — four roles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.user = { id: 'user-2', name: 'Bob', email: 'bob@example.com' };
    mocks.getTask.mockResolvedValue(task1);
    mocks.listComments.mockResolvedValue([]);
    mocks.listFiles.mockResolvedValue({ items: [], nextCursor: null, totalBytes: 0 });
    mocks.listProjectMembers.mockResolvedValue([]);
    mocks.reviewTask.mockResolvedValue({ ...task1, status: 'APPROVED' });
    mocks.submitTask.mockResolvedValue({ ...task1, status: 'SUBMITTED' });
    mocks.completeTask.mockResolvedValue({ status: 'APPROVED', completedAt: '2026-01-01T00:00:00.000Z' });
  });

  it('PROJECT_MANAGER sees edit, complete, archive, delete, assign controls', async () => {
    setRole('PROJECT_MANAGER');
    render(<TaskDetailPage />);
    expect(await screen.findByText('Fix authentication bug')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('MEMBER can complete but cannot archive or delete', async () => {
    setRole('MEMBER');
    render(<TaskDetailPage />);
    expect(await screen.findByText('Fix authentication bug')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('COLLABORATOR cannot edit, archive, or delete', async () => {
    setRole('COLLABORATOR');
    render(<TaskDetailPage />);
    expect(await screen.findByText('Fix authentication bug')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit task' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('VIEWER cannot edit or take any action', async () => {
    setRole('VIEWER');
    render(<TaskDetailPage />);
    expect(await screen.findByText('Fix authentication bug')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit task' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Mark complete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('hides review controls when the submission is owned by the viewer', async () => {
    setRole('PROJECT_MANAGER');
    // Task assigned to the current user -> own submission
    const ownTask = { ...task1, assignees: [{ userId: 'user-2', user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' }, assignedBy: 'user-1', createdAt: '2026-01-01T00:00:00.000Z' }] };
    mocks.getTask.mockResolvedValue(ownTask);
    render(<TaskDetailPage />);
    await waitFor(() => expect(screen.getByText(/You are assigned to this task/)).toBeInTheDocument());
    // Approve/Reject/Request revision should be hidden for own submissions
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request revision' })).not.toBeInTheDocument();
    // Submit for review should still be available (assigned + permitted + status allows)
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeInTheDocument();
  });

  it('shows review controls for a submission not owned by the viewer', async () => {
    setRole('PROJECT_MANAGER');
    // Current user is NOT an assignee -> not own submission
    mocks.user = { id: 'user-3', name: 'Carol', email: 'carol@example.com' };
    const submittedTask = { ...task1, status: 'SUBMITTED' };
    mocks.getTask.mockResolvedValue(submittedTask);
    render(<TaskDetailPage />);
    await waitFor(() => expect(screen.getByText('Fix authentication bug')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Start review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request revision' })).toBeInTheDocument();
  });

  it('starts review through the verified review endpoint', async () => {
    setRole('PROJECT_MANAGER');
    mocks.user = { id: 'user-3', name: 'Carol', email: 'carol@example.com' };
    mocks.getTask.mockResolvedValue({ ...task1, status: 'SUBMITTED' });
    mocks.reviewTask.mockResolvedValueOnce({ ...task1, status: 'UNDER_REVIEW' });
    render(<TaskDetailPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Start review' }));

    await waitFor(() => {
      expect(mocks.reviewTask).toHaveBeenCalledWith('ws-1', 'project-1', 'task-1', 'START_REVIEW');
      expect(mocks.updateTask).not.toHaveBeenCalled();
    });
  });

  it('approves through the verified review endpoint', async () => {
    setRole('PROJECT_MANAGER');
    mocks.user = { id: 'user-3', name: 'Carol', email: 'carol@example.com' };
    mocks.getTask.mockResolvedValue({ ...task1, status: 'SUBMITTED' });
    render(<TaskDetailPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(mocks.reviewTask).toHaveBeenCalledWith('ws-1', 'project-1', 'task-1', 'APPROVE');
      expect(mocks.updateTask).not.toHaveBeenCalled();
    });
  });

  it('requires feedback before recording a request for changes', async () => {
    setRole('PROJECT_MANAGER');
    mocks.user = { id: 'user-3', name: 'Carol', email: 'carol@example.com' };
    mocks.getTask.mockResolvedValue({ ...task1, status: 'SUBMITTED' });
    render(<TaskDetailPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Request revision' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Request changes' });

    await userEvent.click(confirm);
    expect(await within(dialog).findByText('Feedback is required when requesting changes.')).toBeInTheDocument();
    expect(mocks.reviewTask).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Feedback/), 'Add the missing tests');
    await userEvent.click(confirm);

    await waitFor(() => {
      expect(mocks.reviewTask).toHaveBeenCalledWith(
        'ws-1',
        'project-1',
        'task-1',
        'REQUEST_CHANGES',
        'Add the missing tests',
      );
    });
  });

  it('maps Reject to REQUEST_CHANGES with the same required feedback', async () => {
    setRole('PROJECT_MANAGER');
    mocks.user = { id: 'user-3', name: 'Carol', email: 'carol@example.com' };
    mocks.getTask.mockResolvedValue({ ...task1, status: 'SUBMITTED' });
    render(<TaskDetailPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Reject submission' })).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText(/Feedback/), 'Does not meet the acceptance criteria');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Request changes' }));

    await waitFor(() => {
      expect(mocks.reviewTask).toHaveBeenCalledWith(
        'ws-1',
        'project-1',
        'task-1',
        'REQUEST_CHANGES',
        'Does not meet the acceptance criteria',
      );
    });
  });

  it('shows the backend error when a review fails', async () => {
    setRole('PROJECT_MANAGER');
    mocks.user = { id: 'user-3', name: 'Carol', email: 'carol@example.com' };
    mocks.getTask.mockResolvedValue({ ...task1, status: 'SUBMITTED' });
    mocks.reviewTask.mockRejectedValueOnce(new ApiRequestError('Review already completed', 409));
    render(<TaskDetailPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Review already completed')).toBeInTheDocument();
  });

  it('shows AccessState when the task load fails with 403', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    setRole('VIEWER');
    mocks.getTask.mockRejectedValue(new ApiRequestError('Forbidden', 403));
    render(<TaskDetailPage />);
    expect(await screen.findByText('You do not have access')).toBeInTheDocument();
  });

  it('shows project-not-found state when the task load fails with 404', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    setRole('VIEWER');
    mocks.getTask.mockRejectedValue(new ApiRequestError('Not found', 404));
    render(<TaskDetailPage />);
    expect(await screen.findByText(/task.*access/i)).toBeInTheDocument();
  });

  it('shows a comment load failure with a working Retry action', async () => {
    setRole('MEMBER');
    mocks.listComments
      .mockRejectedValueOnce(new ApiRequestError('Comment service failed', 500))
      .mockResolvedValueOnce([{
        id: 'comment-1', taskId: 'task-1', authorId: 'user-1',
        author: { id: 'user-1', name: 'Alice' }, body: 'Loaded after retry',
        parentId: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      }]);
    const user = userEvent.setup();
    render(<TaskDetailPage />);
    expect(await screen.findByText('Comment service failed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Loaded after retry')).toBeInTheDocument();
    expect(mocks.listComments).toHaveBeenCalledTimes(2);
  });

  it('marks a task complete when complete is clicked', async () => {
    setRole('PROJECT_MANAGER');
    render(<TaskDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark complete' })).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Mark complete' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Mark complete' }));
    await waitFor(() => expect(mocks.completeTask).toHaveBeenCalledWith('ws-1', 'project-1', 'task-1'));
  });

  it('shows the backend 403 message when Start fails and keeps the task status unchanged', async () => {
    setRole('MEMBER');
    mocks.updateTask.mockRejectedValueOnce(new ApiRequestError('Only the assignee can start this task', 403));
    render(<TaskDetailPage />);
    const user = userEvent.setup();
    const startButton = await screen.findByRole('button', { name: 'Start' });
    await user.click(startButton);

    expect(await screen.findByText('Only the assignee can start this task')).toBeInTheDocument();
    expect(mocks.updateTask).toHaveBeenCalledWith('ws-1', 'project-1', 'task-1', { status: 'IN_PROGRESS' });
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('starts an assigned task and opens its workspace', async () => {
    setRole('MEMBER');
    mocks.updateTask.mockResolvedValueOnce({ ...task1, status: 'IN_PROGRESS' });
    render(<TaskDetailPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(mocks.updateTask).toHaveBeenCalledWith('ws-1', 'project-1', 'task-1', { status: 'IN_PROGRESS' });
      expect(mocks.push).toHaveBeenCalledWith('/app/projects/project-1/tasks/task-1/work');
    });
  });

  it('resumes a task with requested changes and opens its workspace', async () => {
    setRole('MEMBER');
    mocks.getTask.mockResolvedValue({ ...task1, status: 'CHANGES_REQUESTED' });
    mocks.updateTask.mockResolvedValueOnce({ ...task1, status: 'IN_PROGRESS' });
    render(<TaskDetailPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Resume' }));

    await waitFor(() => {
      expect(mocks.updateTask).toHaveBeenCalledWith('ws-1', 'project-1', 'task-1', { status: 'IN_PROGRESS' });
      expect(mocks.push).toHaveBeenCalledWith('/app/projects/project-1/tasks/task-1/work');
    });
  });

  it('shows the backend error when Resume fails', async () => {
    setRole('MEMBER');
    mocks.getTask.mockResolvedValue({ ...task1, status: 'CHANGES_REQUESTED' });
    mocks.updateTask.mockRejectedValueOnce(new ApiRequestError('Resolve review feedback first', 409));
    render(<TaskDetailPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Resume' }));

    expect(await screen.findByText('Resolve review feedback first')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });

  it('shows the backend error when Complete fails', async () => {
    setRole('MEMBER');
    mocks.completeTask.mockRejectedValueOnce(new ApiRequestError('Task has open blockers', 409));
    render(<TaskDetailPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Mark complete' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Mark complete' }));

    expect(await screen.findByText('Task has open blockers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeInTheDocument();
  });

  it('shows the backend error when Reopen fails', async () => {
    setRole('MEMBER');
    mocks.getTask.mockResolvedValue({
      ...task1,
      status: 'APPROVED',
      completedAt: '2026-01-02T00:00:00.000Z',
    });
    mocks.reopenTask.mockRejectedValueOnce(new ApiRequestError('Reopen window has closed', 409));
    render(<TaskDetailPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Reopen' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reopen task' }));

    expect(await screen.findByText('Reopen window has closed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  it('shows a permission error when a status edit fails', async () => {
    setRole('PROJECT_MANAGER');
    mocks.updateTask.mockRejectedValueOnce(new ApiRequestError('Forbidden', 403));
    render(<TaskDetailPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Edit task' }));
    await user.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Your current role does not allow this action.')).toBeInTheDocument();
    expect(mocks.updateTask).toHaveBeenCalledWith(
      'ws-1',
      'project-1',
      'task-1',
      expect.objectContaining({ status: 'IN_PROGRESS' }),
    );
  });

  it('requires a work summary before submitting through the verified endpoint', async () => {
    setRole('PROJECT_MANAGER');
    render(<TaskDetailPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Submit for review' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Submit for review' });

    await user.click(confirm);
    expect(await within(dialog).findByText('Work summary is required.')).toBeInTheDocument();
    expect(mocks.submitTask).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/Work summary/), '  Finished the fix  ');
    await user.click(confirm);

    await waitFor(() => {
      expect(mocks.submitTask).toHaveBeenCalledWith('ws-1', 'project-1', 'task-1', 'Finished the fix');
      expect(mocks.updateTask).not.toHaveBeenCalled();
    });
  });

  it('shows the backend submit error inside the dialog', async () => {
    setRole('PROJECT_MANAGER');
    mocks.submitTask.mockRejectedValueOnce(new ApiRequestError('Expected deliverables are missing', 400));
    render(<TaskDetailPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Submit for review' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Work summary/), 'Ready for review');
    await user.click(within(dialog).getByRole('button', { name: 'Submit for review' }));

    expect(await within(dialog).findByText('Expected deliverables are missing')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
