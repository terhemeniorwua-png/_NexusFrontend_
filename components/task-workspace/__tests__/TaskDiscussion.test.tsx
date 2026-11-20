import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDiscussion } from '../TaskDiscussion';
import type { TaskComment } from '@/services/tasks';

vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => ({
    permissions: ['task.view', 'task.comment'],
    isLoading: false,
    can: (permission: string) => permission === 'task.comment',
    canAny: () => true,
    canAll: () => true,
  }),
}));

const timestamp = '2026-01-01T00:00:00.000Z';

function comment(overrides: Partial<TaskComment> = {}): TaskComment {
  return {
    id: 'c1',
    taskId: 'task-1',
    authorId: 'u1',
    author: { id: 'u1', name: 'Alice' },
    body: 'Original comment',
    parentId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe('TaskDiscussion inline comment editing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves an edited comment and shows the edited marker', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const view = render(
      <TaskDiscussion
        comments={[comment()]}
        loading={false}
        error={null}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
        canDelete={() => false}
        canEdit
        currentUserId="u1"
        busy={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit comment' }));
    const input = screen.getByRole('textbox', { name: 'Edit comment' });
    await user.clear(input);
    await user.type(input, 'Updated comment');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onEdit).toHaveBeenCalledWith('c1', 'Updated comment'));
    view.rerender(
      <TaskDiscussion
        comments={[comment({ body: 'Updated comment', updatedAt: '2026-01-02T00:00:00.000Z' })]}
        loading={false}
        error={null}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
        canDelete={() => false}
        canEdit
        currentUserId="u1"
        busy={false}
      />,
    );
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('rejects empty and too-long edits without calling the API', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <TaskDiscussion
        comments={[comment()]}
        loading={false}
        error={null}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
        canDelete={() => false}
        canEdit
        currentUserId="u1"
        busy={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit comment' }));
    const input = screen.getByRole('textbox', { name: 'Edit comment' });
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Comment cannot be empty')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'a'.repeat(10001) } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Comment must be at most 10 000 characters')).toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('hides edit for comments authored by another user', () => {
    render(
      <TaskDiscussion
        comments={[comment({ authorId: 'u2', author: { id: 'u2', name: 'Bob' } })]}
        loading={false}
        error={null}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        canDelete={() => false}
        canEdit
        currentUserId="u1"
        busy={false}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Edit comment' })).not.toBeInTheDocument();
  });

  it('hides edit from viewers', () => {
    render(
      <TaskDiscussion
        comments={[comment()]}
        loading={false}
        error={null}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        canDelete={() => false}
        canEdit={false}
        currentUserId="u1"
        busy={false}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Edit comment' })).not.toBeInTheDocument();
  });
});
