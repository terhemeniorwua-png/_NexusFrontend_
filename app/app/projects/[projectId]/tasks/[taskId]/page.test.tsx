import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  listFiles: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  listProjectMembers: vi.fn(),
}));

const defaultPermissions = [
  'project.view', 'task.view',
];

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
  useRouter: () => ({ replace: vi.fn() }),
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
    mocks.completeTask.mockResolvedValue({ status: 'APPROVED', completedAt: '2026-01-01T00:00:00.000Z' });
  });

  it('PROJECT_MANAGER sees edit, complete, archive, delete, assign controls', async () => {
    setRole('PROJECT_MANAGER');
    render(<TaskDetailPage />);
    expect(await screen.findByText('Fix authentication bug')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('VIEWER cannot edit or take any action', async () => {
    setRole('VIEWER');
    render(<TaskDetailPage />);
    expect(await screen.findByText('Fix authentication bug')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark complete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('hides review controls when the submission is owned by the viewer', async () => {
    setRole('PROJECT_MANAGER');
    // Task assigned to the current user -> own submission
    const ownTask = { ...task1, assignees: [{ userId: 'user-2', user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' }, assignedBy: 'user-1', createdAt: '2026-01-01T00:00:00.000Z' }] };
    mocks.getTask.mockResolvedValue(ownTask);
    render(<TaskDetailPage />);
    await waitFor(() => expect(screen.getByText('You are assigned to this task')).toBeInTheDocument());
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
});
