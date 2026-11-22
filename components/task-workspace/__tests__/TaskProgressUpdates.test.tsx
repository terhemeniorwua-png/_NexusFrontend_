import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskProgressUpdates } from '../TaskProgressUpdates';
import type { TaskProgressUpdate } from '@/services/tasks';

function makeUpdate(overrides: Partial<TaskProgressUpdate> = {}): TaskProgressUpdate {
  return {
    id: 'pu-1',
    taskId: 'task-1',
    authorId: 'user-1',
    note: 'Implemented API integration',
    percent: 40,
    createdAt: '2026-05-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('TaskProgressUpdates', () => {
  it('renders timeline updates with author, time, text, and self-reported percent', () => {
    render(
      <TaskProgressUpdates
        updates={[makeUpdate(), makeUpdate({ id: 'pu-2', authorId: 'user-2', note: 'No percent yet', percent: null })]}
        loading={false}
        error={null}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        canPost={false}
        onSubmit={vi.fn()}
        submitBusy={false}
        submitError={null}
        resolveAuthorName={(id) => (id === 'user-1' ? 'Alice' : 'Bob')}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Progress updates' })).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Implemented API integration')).toBeInTheDocument();
    expect(screen.getByText('No percent yet')).toBeInTheDocument();
    expect(screen.getByText('Self-reported: 40%')).toBeInTheDocument();
    expect(screen.queryByText('Self-reported: null%')).not.toBeInTheDocument();
  });

  it('handles missing optional fields safely', () => {
    render(
      <TaskProgressUpdates
        updates={[makeUpdate({ percent: null, clientRequestId: undefined })]}
        loading={false}
        error={null}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        canPost={false}
        onSubmit={vi.fn()}
        submitBusy={false}
        submitError={null}
        resolveAuthorName={() => 'Alice'}
      />,
    );

    expect(screen.getByText('Implemented API integration')).toBeInTheDocument();
    expect(screen.queryByText(/Self-reported:/)).not.toBeInTheDocument();
  });

  it('hides the form for read-only viewers when canPost is false', () => {
    render(
      <TaskProgressUpdates
        updates={[]}
        loading={false}
        error={null}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        canPost={false}
        onSubmit={vi.fn()}
        submitBusy={false}
        submitError={null}
        resolveAuthorName={(id) => id}
      />,
    );

    expect(screen.queryByLabelText('Update note')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post update' })).not.toBeInTheDocument();
    expect(screen.getByText(/read-only here/i)).toBeInTheDocument();
  });

  it('validates note and percent before submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <TaskProgressUpdates
        updates={[]}
        loading={false}
        error={null}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        canPost
        onSubmit={onSubmit}
        submitBusy={false}
        submitError={null}
        resolveAuthorName={(id) => id}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Post update' }));
    expect(screen.getByText('A progress note is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Update note'), 'Valid note');
    await user.clear(screen.getByLabelText('Self-reported percent (optional)'));
    await user.type(screen.getByLabelText('Self-reported percent (optional)'), '101');
    await user.click(screen.getByRole('button', { name: 'Post update' }));

    expect(screen.getByText('Percent must be a whole number from 0 to 100.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid update with a clientRequestId and clears the form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskProgressUpdates
        updates={[]}
        loading={false}
        error={null}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        canPost
        onSubmit={onSubmit}
        submitBusy={false}
        submitError={null}
        resolveAuthorName={(id) => id}
      />,
    );

    await user.type(screen.getByLabelText('Update note'), '  Shipped the form  ');
    await user.type(screen.getByLabelText('Self-reported percent (optional)'), '55');
    await user.click(screen.getByRole('button', { name: 'Post update' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      note: 'Shipped the form',
      percent: 55,
      clientRequestId: expect.any(String),
    });
    await waitFor(() => expect(screen.getByLabelText('Update note')).toHaveValue(''));
    expect(screen.getByLabelText('Self-reported percent (optional)')).toHaveValue(null);
  });

  it('shows backend submit and load errors', () => {
    render(
      <TaskProgressUpdates
        updates={[]}
        loading={false}
        error="Failed to load progress updates."
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        canPost
        onSubmit={vi.fn()}
        submitBusy={false}
        submitError="Only a task assignee can post a progress update"
        resolveAuthorName={(id) => id}
      />,
    );

    expect(screen.getByText('Failed to load progress updates.')).toBeInTheDocument();
    expect(screen.getByText('Only a task assignee can post a progress update')).toBeInTheDocument();
  });

  it('loads more updates when requested', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();

    render(
      <TaskProgressUpdates
        updates={[makeUpdate()]}
        loading={false}
        error={null}
        hasMore
        loadingMore={false}
        onLoadMore={onLoadMore}
        canPost={false}
        onSubmit={vi.fn()}
        submitBusy={false}
        submitError={null}
        resolveAuthorName={(id) => id}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
