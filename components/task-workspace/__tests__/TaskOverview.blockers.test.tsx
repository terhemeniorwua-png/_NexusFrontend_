import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskOverview } from '../TaskOverview';
import type { TaskReportedBlocker, TaskSummary } from '@/services/tasks';

const task: TaskSummary = {
  id: 'task-1',
  projectId: 'project-1',
  key: 'NX-1',
  title: 'Task',
  description: 'Desc',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  category: null,
  labels: [],
  startDate: null,
  dueDate: null,
  position: 0,
  parentTaskId: null,
  creatorId: 'u1',
  creator: { id: 'u1', name: 'Owner' },
  assignees: [{ userId: 'u2', user: { id: 'u2', name: 'Member', email: 'm@test.com' }, assignedBy: 'u1', createdAt: '' }],
  dependencies: [],
  blockers: [],
  subTaskCount: 0,
  commentCount: 0,
  attachmentCount: 0,
  archivedAt: null,
  completedAt: null,
  createdAt: '',
  updatedAt: '',
  requiresApproval: false,
  expectedDeliverables: [],
  submissionSummary: null,
  reviewFeedback: null,
  reviewedBy: null,
};

const progress = { percent: 0, completed: 0, total: 0 };

function blocker(overrides: Partial<TaskReportedBlocker> = {}): TaskReportedBlocker {
  return {
    id: 'blocker-1',
    taskId: 'task-1',
    status: 'OPEN',
    description: 'Waiting on the API key',
    reportedById: 'u2',
    reportedBy: { id: 'u2', name: 'Member' },
    notifyUserId: null,
    notifyUser: null,
    resolvedAt: null,
    resolvedById: null,
    resolvedBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskOverview blockers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows an empty state and no blocked banner when no blockers are reported', () => {
    render(<TaskOverview task={task} progress={progress} />);

    expect(screen.getByRole('heading', { name: 'Blockers' })).toBeInTheDocument();
    expect(screen.getByText('No reported blockers.')).toBeInTheDocument();
    expect(screen.queryByText('Blocked')).not.toBeInTheDocument();
  });

  it('shows the blocked banner and open/resolved blocker details', () => {
    render(
      <TaskOverview
        task={task}
        progress={progress}
        reportedBlockers={[
          blocker(),
          blocker({
            id: 'blocker-2',
            status: 'RESOLVED',
            description: 'Previous deploy issue',
            reportedById: 'u1',
            reportedBy: { id: 'u1', name: 'Owner' },
            resolvedAt: '2026-01-02T00:00:00.000Z',
            resolvedById: 'u3',
            resolvedBy: { id: 'u3', name: 'Reviewer' },
          }),
        ]}
      />,
    );

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('This task has 1 open blocker that may need attention.')).toBeInTheDocument();
    expect(screen.getByText('Waiting on the API key')).toBeInTheDocument();
    expect(screen.getByText(/Reported by Member/)).toBeInTheDocument();
    expect(screen.getByText('Previous deploy issue')).toBeInTheDocument();
    expect(screen.getByText(/Resolved by Reviewer/)).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('lets an assignee open the report form and submit a description', async () => {
    const onOpenReport = vi.fn();
    const onReport = vi.fn(async () => undefined);
    const { rerender } = render(
      <TaskOverview
        task={task}
        progress={progress}
        canReportBlocker
        onOpenReport={onOpenReport}
        onReport={onReport}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Report a blocker' }));
    expect(onOpenReport).toHaveBeenCalledTimes(1);

    rerender(
      <TaskOverview
        task={task}
        progress={progress}
        canReportBlocker
        showReportForm
        onOpenReport={onOpenReport}
        onReport={onReport}
      />,
    );

    const submit = screen.getByRole('button', { name: 'Submit blocker' });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Describe the blocker'), '  Waiting on design  ');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    expect(onReport).toHaveBeenCalledWith('Waiting on design');
  });

  it('resolves an open blocker only when the user is allowed to', async () => {
    const onResolve = vi.fn(async () => undefined);
    const renderBlocker = (canResolve: boolean) => (
      <TaskOverview
        task={task}
        progress={progress}
        reportedBlockers={[blocker()]}
        canResolveBlocker={() => canResolve}
        onResolve={onResolve}
      />
    );

    const disallowed = render(renderBlocker(false));
    expect(screen.queryByRole('button', { name: 'Resolve blocker' })).not.toBeInTheDocument();
    disallowed.unmount();

    render(renderBlocker(true));
    await userEvent.click(screen.getByRole('button', { name: 'Resolve blocker' }));
    expect(onResolve).toHaveBeenCalledWith('blocker-1');
  });

  it('shows blocker errors and busy state while resolving', () => {
    render(
      <TaskOverview
        task={task}
        progress={progress}
        reportedBlockers={[blocker()]}
        canResolveBlocker={() => true}
        onResolve={vi.fn()}
        busyBlockerId="blocker-1"
        blockerError="Could not resolve blocker."
      />,
    );

    expect(screen.getByText('Could not resolve blocker.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolving…' })).toBeDisabled();
  });
});
