import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubtaskManager } from '../SubtaskManager';
import type { TaskSummary } from '@/services/tasks';

vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
  }),
}));

const task: TaskSummary = {
  id: 'task-1',
  projectId: 'project-1',
  key: 'ALP-1',
  title: 'Parent task',
  description: null,
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
  assignees: [],
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

const subtask: TaskSummary = {
  ...task,
  id: 'sub-1',
  key: 'ALP-2',
  title: 'Write tests',
  parentTaskId: 'task-1',
  weight: 2,
};

const progress = { percent: 0, completed: 0, total: 0 };

function renderManager(overrides: Partial<Parameters<typeof SubtaskManager>[0]> = {}) {
  return render(
    <SubtaskManager
      parentTaskId="task-1"
      subtasks={[]}
      progress={progress}
      onComplete={vi.fn()}
      isAssigneeOf={() => false}
      {...overrides}
    />,
  );
}

describe('SubtaskManager create/delete actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a subtask with parentTaskId, append position, and weight', async () => {
    const onCreate = vi.fn(async () => undefined);
    renderManager({ canCreateSubtask: true, onCreate });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Add subtask' }));
    await user.type(screen.getByLabelText(/^Title/), 'Write tests');
    await user.clear(screen.getByLabelText('Weight'));
    await user.type(screen.getByLabelText('Weight'), '3');
    await user.click(screen.getByRole('button', { name: 'Create subtask' }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        title: 'Write tests',
        parentTaskId: 'task-1',
        position: 0,
        weight: 3,
      });
    });
  });

  it('validates title and weight before creating', async () => {
    const onCreate = vi.fn(async () => undefined);
    renderManager({ canCreateSubtask: true, onCreate });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Add subtask' }));
    await user.click(screen.getByRole('button', { name: 'Create subtask' }));
    expect(screen.getByText('Title must be between 2 and 200 characters.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Title/), 'Write tests');
    await user.clear(screen.getByLabelText('Weight'));
    await user.type(screen.getByLabelText('Weight'), '0');
    await user.click(screen.getByRole('button', { name: 'Create subtask' }));

    expect(screen.getByText('Weight must be a positive integer.')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('hides creation when the caller is not allowed to create subtasks', () => {
    renderManager({ canCreateSubtask: false, onCreate: vi.fn() });
    expect(screen.queryByRole('button', { name: 'Add subtask' })).not.toBeInTheDocument();
  });

  it('deletes a subtask only after confirmation', async () => {
    const onDelete = vi.fn(async () => undefined);
    renderManager({ subtasks: [subtask], canDeleteSubtask: true, onDelete });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Delete Write tests' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(dialog.querySelector('button') ?? screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls the delete handler after confirmation and shows failures', async () => {
    const onDelete = vi.fn(async () => undefined);
    renderManager({ subtasks: [subtask], canDeleteSubtask: true, onDelete });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Delete Write tests' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await waitFor(() => {
      const button = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Delete subtask');
      if (!button) throw new Error('Delete subtask button not found');
      return button;
    }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(subtask));
  });

  it('surfaces delete errors in the subtask list', async () => {
    const onDelete = vi.fn(async () => { throw new Error('Subtask deletion denied'); });
    renderManager({ subtasks: [subtask], canDeleteSubtask: true, onDelete });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Delete Write tests' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Delete subtask');
    if (!confirm) throw new Error('Delete subtask button not found');
    await user.click(confirm);

    expect(await screen.findByText('Subtask deletion denied')).toBeInTheDocument();
  });
});
