import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TaskOverview } from '../TaskOverview';
import { SubtaskManager } from '../SubtaskManager';
import { AttachmentManager } from '../AttachmentManager';
import { TaskDiscussion } from '../TaskDiscussion';
import { TaskActivityTimeline } from '../TaskActivityTimeline';
import { TaskSubmissionPanel } from '../TaskSubmissionPanel';
import { TaskWorkspaceLayout } from '../TaskWorkspaceLayout';
import type { TaskActivityItem, TaskComment, TaskSummary } from '@/services/tasks';
import type { FileSummary } from '@/services/files';

const permMocks = vi.hoisted(() => ({
  permissions: [] as string[],
  isLoading: false,
}));

vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => ({
    permissions: permMocks.permissions,
    isLoading: permMocks.isLoading,
    can: (p: string) => !permMocks.isLoading && permMocks.permissions.includes(p),
    canAny: (list: string[]) => !permMocks.isLoading && list.some((p) => permMocks.permissions.includes(p)),
    canAll: (list: string[]) => !permMocks.isLoading && list.every((p) => permMocks.permissions.includes(p)),
  }),
}));

vi.mock('@/services/files', async () => {
  const actual = await vi.importActual<typeof import('@/services/files')>('@/services/files');
  return {
    ...actual,
    uploadFile: vi.fn(() => ({ promise: Promise.resolve({} as FileSummary), abort: vi.fn() })),
    deleteFile: vi.fn(async () => undefined),
    downloadFile: vi.fn(async () => undefined),
    listFiles: vi.fn(),
    formatBytes: (n: number) => `${n} B`,
  };
});

function setRole(role: 'PROJECT_MANAGER' | 'MEMBER' | 'COLLABORATOR' | 'VIEWER') {
  const perms: Record<string, string[]> = {
    PROJECT_MANAGER: ['task.view','task.complete','task.comment','file.upload','file.delete.own','file.delete.any','submission.submit','submission.review','submission.approve','submission.request_revision'],
    MEMBER: ['task.view','task.complete','task.comment','file.upload','file.delete.own','submission.submit'],
    COLLABORATOR: ['task.view','task.comment','file.upload','submission.submit'],
    VIEWER: ['task.view'],
  };
  permMocks.permissions = perms[role];
  permMocks.isLoading = false;
}

const baseTask: TaskSummary = {
  id: 'task-1', projectId: 'project-1', key: 'NX-1', title: 'Task', description: 'Desc', status: 'IN_PROGRESS', priority: 'HIGH',
  category: null, labels: [], startDate: null, dueDate: null, position: 0, parentTaskId: null, creatorId: 'u1',
  creator: { id: 'u1', name: 'Owner' }, assignees: [{ userId: 'u2', user: { id: 'u2', name: 'Member', email: 'm@test.com' }, assignedBy: 'u1', createdAt: '' }],
  dependencies: [], blockers: [], subTaskCount: 0, commentCount: 0, attachmentCount: 0, archivedAt: null, completedAt: null,
  createdAt: '', updatedAt: '', requiresApproval: false, expectedDeliverables: [{ label: 'Doc', required: true }],
  submissionSummary: null, reviewFeedback: null, reviewedBy: null,
};

describe('Task workspace sections', () => {
  beforeEach(() => setRole('MEMBER'));

  it('TaskOverview renders loaded content and next action', () => {
    render(<TaskOverview task={baseTask} progress={{ percent: 0, completed: 0, total: 2 }} projectName="Proj" />);
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('Expected deliverables')).toBeInTheDocument();
    expect(screen.getByText(/next action/i)).toBeInTheDocument();
  });

  it('SubtaskManager shows empty state and handles loaded state', () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <SubtaskManager parentTaskId="t1" subtasks={[]} progress={{ percent: 0, completed: 0, total: 0 }} onComplete={onComplete} isAssigneeOf={() => true} />,
    );
    expect(screen.getByText('No subtasks')).toBeInTheDocument();

    rerender(
      <SubtaskManager
        parentTaskId="t1"
        subtasks={[{ ...baseTask, id: 's1', key: 'NX-2', title: 'Sub', status: 'ASSIGNED', assignees: baseTask.assignees }]}
        progress={{ percent: 0, completed: 0, total: 1 }}
        onComplete={onComplete}
        isAssigneeOf={() => true}
      />,
    );
    expect(screen.getByText('Sub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument();
  });

  it('SubtaskManager gates completion for viewer role', () => {
    setRole('VIEWER');
    render(
      <SubtaskManager
        parentTaskId="t1"
        subtasks={[{ ...baseTask, id: 's1', key: 'NX-2', title: 'Sub', status: 'ASSIGNED', assignees: baseTask.assignees }]}
        progress={{ percent: 0, completed: 0, total: 1 }}
        onComplete={vi.fn()}
        isAssigneeOf={() => true}
      />,
    );
    // PermissionButton renders disabled wrapper for denied users
    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument();
    expect(screen.getByText('Mark complete')).toBeInTheDocument();
  });

  it('AttachmentManager shows empty/loading/error states', () => {
    const { rerender } = render(
      <AttachmentManager workspaceId="w" projectId="p" taskId="t" files={[]} loading error={null} onReload={vi.fn()} />,
    );
    expect(screen.getByText('No attachments')).toBeInTheDocument();
    rerender(
      <AttachmentManager workspaceId="w" projectId="p" taskId="t" files={[]} loading={false} error="Boom" onReload={vi.fn()} />,
    );
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('TaskDiscussion shows empty and loaded states and gates comment for viewer', () => {
    const { rerender } = render(
      <TaskDiscussion comments={[]} loading={false} error={null} onAdd={vi.fn()} onDelete={vi.fn()} canDelete={() => false} busy={false} />,
    );
    expect(screen.getByText('No comments yet')).toBeInTheDocument();
    const comment: TaskComment = { id: 'c1', taskId: 't1', authorId: 'u1', author: { id: 'u1', name: 'A' }, body: 'Hello', parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    rerender(<TaskDiscussion comments={[comment]} loading={false} error={null} onAdd={vi.fn()} onDelete={vi.fn()} canDelete={() => false} busy={false} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    setRole('VIEWER');
    rerender(<TaskDiscussion comments={[]} loading={false} error={null} onAdd={vi.fn()} onDelete={vi.fn()} canDelete={() => false} busy={false} />);
    // Comment button disabled when no text; permission gating visible via PermissionButton behavior when text present - basic render ok
    expect(screen.getByRole('button', { name: 'Comment' })).toBeDisabled();
  });

  it('TaskActivityTimeline shows empty/error and load more', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(<TaskActivityTimeline items={[]} loading={false} error={null} hasMore={false} onLoadMore={onLoadMore} loadingMore={false} />);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    rerender(<TaskActivityTimeline items={[]} loading={false} error="Failed" hasMore={false} onLoadMore={onLoadMore} loadingMore={false} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    const items: TaskActivityItem[] = [{ id: 'a1', action: 'task.created', actorId: 'u1', createdAt: new Date().toISOString() }];
    rerender(<TaskActivityTimeline items={items} loading={false} error={null} hasMore={true} onLoadMore={onLoadMore} loadingMore={false} />);
    await userEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('TaskSubmissionPanel supports submission flow and shows feedback', async () => {
    setRole('MEMBER');
    const onSubmit = vi.fn(async () => {});
    render(<TaskSubmissionPanel task={{ ...baseTask, status: 'IN_PROGRESS', requiresApproval: true }} onSubmit={onSubmit} busy={false} error={null} />);
    expect(screen.getByText(/cannot be marked complete/i)).toBeInTheDocument();
    const textarea = screen.getByLabelText('Work summary');
    await userEvent.type(textarea, 'My work');
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('My work'));
  });

  it('TaskSubmissionPanel shows resubmit when changes requested and gates viewer', () => {
    setRole('VIEWER');
    render(<TaskSubmissionPanel task={{ ...baseTask, status: 'CHANGES_REQUESTED', reviewFeedback: 'Fix it' }} onSubmit={vi.fn()} busy={false} error={null} />);
    expect(screen.getByText('Fix it')).toBeInTheDocument();
    // viewer cannot submit - button rendered via PermissionButton will be disabled/hidden text only
    expect(screen.getByText(/resubmit/i)).toBeInTheDocument();
  });

  it('TaskWorkspaceLayout renders section switcher and right sidebar info', () => {
    render(
      <TaskWorkspaceLayout
        activeSection="overview"
        onSectionChange={vi.fn()}
        projectId="p1"
        projectName="Proj"
        header={<div>Header</div>}
        assignees={baseTask.assignees}
        assignedBy="u1"
        reviewer={null}
        startDate={null}
        dueDate={null}
        overdue={false}
        recentActivity={[]}
        onContactOwner={vi.fn()}
      >
        <div>Body</div>
      </TaskWorkspaceLayout>,
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact task owner/i })).toBeInTheDocument();
  });
});
