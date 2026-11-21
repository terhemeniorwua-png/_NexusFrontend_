import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import ProjectChecklistsPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  user: null as null | { id: string; name: string; email: string },
  permissionState: null as unknown,
  listChecklists: vi.fn(),
  createChecklist: vi.fn(),
  getChecklist: vi.fn(),
  updateChecklist: vi.fn(),
  deleteChecklist: vi.fn(),
  listChecklistItems: vi.fn(),
  createChecklistItem: vi.fn(),
  reorderChecklistItems: vi.fn(),
  updateChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  completeChecklistItem: vi.fn(),
  uncompleteChecklistItem: vi.fn(),
  signOffChecklistItem: vi.fn(),
  removeChecklistItemSignOff: vi.fn(),
  listChecklistFeedback: vi.fn(),
  createChecklistFeedback: vi.fn(),
  updateChecklistFeedback: vi.fn(),
  deleteChecklistFeedback: vi.fn(),
  listWorkspaceMembers: vi.fn(),
  createReview: vi.fn(),
}));

type Role = 'PROJECT_MANAGER' | 'MEMBER' | 'COLLABORATOR' | 'VIEWER';

function setRole(role: Role, extraPermissions: string[] = []) {
  const permissions: Record<Role, string[]> = {
    PROJECT_MANAGER: ['project.view', 'project.update', 'submission.approve'],
    MEMBER: ['project.view'],
    COLLABORATOR: ['project.view'],
    VIEWER: ['project.view'],
  };
  const granted = [...permissions[role], ...extraPermissions];
  mocks.permissionState = {
    permissions: granted,
    projectRole: role,
    workspaceRole: role === 'PROJECT_MANAGER' ? 'PROJECT_MANAGER' : 'MEMBER',
    accessSource: 'project_member',
    assignableRoles: [],
    roleDefinitions: [],
    isLoading: false,
    accessStatus: null,
    error: null,
    can: (permission: string) => granted.includes(permission),
    canAny: (list: string[]) => list.some((permission) => granted.includes(permission)),
    canAll: (list: string[]) => list.every((permission) => granted.includes(permission)),
    refresh: vi.fn(),
  };
}

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/app/projects/project-1/checklists',
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

vi.mock('@/services/checklists', () => ({
  listChecklists: mocks.listChecklists,
  createChecklist: mocks.createChecklist,
  getChecklist: mocks.getChecklist,
  updateChecklist: mocks.updateChecklist,
  deleteChecklist: mocks.deleteChecklist,
  listChecklistItems: mocks.listChecklistItems,
  createChecklistItem: mocks.createChecklistItem,
  reorderChecklistItems: mocks.reorderChecklistItems,
  updateChecklistItem: mocks.updateChecklistItem,
  deleteChecklistItem: mocks.deleteChecklistItem,
  completeChecklistItem: mocks.completeChecklistItem,
  uncompleteChecklistItem: mocks.uncompleteChecklistItem,
  signOffChecklistItem: mocks.signOffChecklistItem,
  removeChecklistItemSignOff: mocks.removeChecklistItemSignOff,
  listChecklistFeedback: mocks.listChecklistFeedback,
  createChecklistFeedback: mocks.createChecklistFeedback,
  updateChecklistFeedback: mocks.updateChecklistFeedback,
  deleteChecklistFeedback: mocks.deleteChecklistFeedback,
}));

vi.mock('@/services/workspaces', () => ({
  listWorkspaceMembers: mocks.listWorkspaceMembers,
}));

vi.mock('@/services/reviews', () => ({
  createReview: mocks.createReview,
}));

const checklist = {
  id: 'cl-1',
  workspaceId: 'ws-1',
  projectId: 'project-1',
  title: 'Launch checklist',
  description: 'Prepare the launch',
  revision: 1,
  createdById: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const baseItems = [
  {
    id: 'item-1',
    checklistId: 'cl-1',
    position: 0,
    text: 'Draft plan',
    completed: false,
    completedById: null,
    completedAt: null,
    signedOffById: null,
    signedOffAt: null,
  },
  {
    id: 'item-2',
    checklistId: 'cl-1',
    position: 1,
    text: 'Review plan',
    completed: true,
    completedById: 'user-2',
    completedAt: '2026-01-02T00:00:00.000Z',
    signedOffById: null,
    signedOffAt: null,
  },
];

async function renderPage(): Promise<void> {
  render(<ProjectChecklistsPage />);
  expect(await screen.findByRole('heading', { name: 'Launch checklist' })).toBeInTheDocument();
}

describe('ProjectChecklistsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = {
      id: 'ws-1',
      name: 'Test Workspace',
      type: 'COMPANY',
      role: 'PROJECT_MANAGER',
      organizationRole: null,
    };
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    setRole('PROJECT_MANAGER');
    mocks.listChecklists.mockResolvedValue({ items: [checklist], nextCursor: null });
    mocks.listChecklistItems.mockResolvedValue({ items: baseItems });
    mocks.listChecklistFeedback.mockResolvedValue({ items: [], nextCursor: null });
    mocks.listWorkspaceMembers.mockResolvedValue([
      { userId: 'user-2', name: 'Bob', email: 'bob@example.com' },
    ]);
    mocks.createChecklist.mockResolvedValue({ checklist });
    mocks.updateChecklist.mockResolvedValue({ checklist });
    mocks.deleteChecklist.mockResolvedValue({ ok: true });
    mocks.createChecklistItem.mockResolvedValue({ item: baseItems[0], revision: 2 });
    mocks.updateChecklistItem.mockResolvedValue({ item: baseItems[0], revision: 2 });
    mocks.deleteChecklistItem.mockResolvedValue({ ok: true, revision: 2 });
    mocks.reorderChecklistItems.mockImplementation(
      async (_workspaceId: string, _projectId: string, _checklistId: string, input: { itemIds: string[] }) => ({
        items: input.itemIds.map((id) => baseItems.find((item) => item.id === id)),
        revision: 2,
      }),
    );
    mocks.completeChecklistItem.mockResolvedValue({ item: baseItems[0], revision: 2 });
    mocks.uncompleteChecklistItem.mockResolvedValue({ item: baseItems[1], revision: 2 });
    mocks.signOffChecklistItem.mockResolvedValue({ item: baseItems[1], revision: 2 });
    mocks.removeChecklistItemSignOff.mockResolvedValue({ item: baseItems[1], revision: 2 });
    mocks.createChecklistFeedback.mockResolvedValue({
      feedback: { id: 'f-1', authorId: 'user-1', body: 'Looks good' },
    });
    mocks.updateChecklistFeedback.mockResolvedValue({
      feedback: { id: 'f-1', authorId: 'user-1', body: 'Revised' },
    });
    mocks.deleteChecklistFeedback.mockResolvedValue({ ok: true });
    mocks.createReview.mockResolvedValue({ review: { id: 'review-1' } });
  });

  it('lists checklists with derived progress and supports cursor load-more', async () => {
    mocks.listChecklists
      .mockResolvedValueOnce({ items: [checklist], nextCursor: 'cursor-1' })
      .mockResolvedValueOnce({
        items: [{ ...checklist, id: 'cl-2', title: 'Second checklist' }],
        nextCursor: null,
      });
    const user = userEvent.setup();
    await renderPage();

    expect(screen.getByText('1/2 items complete')).toBeInTheDocument();
    expect(mocks.listChecklists).toHaveBeenNthCalledWith(1, 'ws-1', 'project-1', { limit: 25 });

    await user.click(screen.getByRole('button', { name: 'Load more checklists' }));

    await waitFor(() => {
      expect(mocks.listChecklists).toHaveBeenCalledWith('ws-1', 'project-1', {
        cursor: 'cursor-1',
        limit: 25,
      });
    });
    expect(await screen.findByText('Second checklist')).toBeInTheDocument();
  });

  it('creates a checklist from the dialog', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'New checklist' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), '  New list  ');
    await user.type(within(dialog).getByLabelText('Description'), '  Notes  ');
    await user.click(within(dialog).getByRole('button', { name: 'Create checklist' }));

    await waitFor(() => {
      expect(mocks.createChecklist).toHaveBeenCalledWith('ws-1', 'project-1', {
        title: 'New list',
        description: 'Notes',
      });
    });
  });

  it('edits and deletes a checklist through confirmation', async () => {
    const user = userEvent.setup();
    await renderPage();

    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'Renamed checklist' } });
    await user.click(screen.getByRole('button', { name: 'Save checklist' }));
    await waitFor(() => {
      expect(mocks.updateChecklist).toHaveBeenCalledWith('ws-1', 'project-1', 'cl-1', {
        title: 'Renamed checklist',
        description: 'Prepare the launch',
      });
    });

    await user.click(screen.getByRole('button', { name: 'Delete checklist' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete checklist' }));
    await waitFor(() => {
      expect(mocks.deleteChecklist).toHaveBeenCalledWith('ws-1', 'project-1', 'cl-1');
    });
  });

  it('adds, edits and deletes items', async () => {
    const user = userEvent.setup();
    await renderPage();

    const addInput = screen.getByLabelText('Add item');
    const addButton = screen.getByRole('button', { name: 'Add item' });
    expect(addButton).toBeDisabled();
    await user.type(addInput, '  New step  ');
    expect(screen.getByText('8/500 characters')).toBeInTheDocument();
    expect(addButton).toBeEnabled();
    await user.click(addButton);
    await waitFor(() => {
      expect(mocks.createChecklistItem).toHaveBeenCalledWith('ws-1', 'project-1', 'cl-1', {
        text: 'New step',
      });
    });

    await user.click(screen.getAllByRole('button', { name: 'Edit item' })[0]);
    const editInput = await screen.findByLabelText('Edit item');
    await user.clear(editInput);
    await user.type(editInput, 'Updated step');
    await user.click(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() => {
      expect(mocks.updateChecklistItem).toHaveBeenCalledWith(
        'ws-1',
        'project-1',
        'cl-1',
        'item-1',
        { text: 'Updated step' },
      );
    });

    await user.click(screen.getAllByRole('button', { name: 'Delete item' })[0]);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete item' }));
    await waitFor(() => {
      expect(mocks.deleteChecklistItem).toHaveBeenCalledWith('ws-1', 'project-1', 'cl-1', 'item-1');
    });
  });

  it('reorders using the full ordered live-id list', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Move up Review plan' }));

    await waitFor(() => {
      expect(mocks.reorderChecklistItems).toHaveBeenCalledWith('ws-1', 'project-1', 'cl-1', {
        itemIds: ['item-2', 'item-1'],
      });
    });
  });

  it('refetches after a checklist items mismatch', async () => {
    const user = userEvent.setup();
    mocks.reorderChecklistItems.mockRejectedValueOnce(
      new ApiRequestError(
        'itemIds must be the complete ordered list of live checklist item ids',
        409,
        'CHECKLIST_ITEMS_MISMATCH',
      ),
    );
    await renderPage();
    const callsBeforeConflict = mocks.listChecklists.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Move up Review plan' }));

    expect(await screen.findByText('itemIds must be the complete ordered list of live checklist item ids')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.listChecklists.mock.calls.length).toBeGreaterThan(callsBeforeConflict);
    });
  });

  it('guards double submits with an in-flight key', async () => {
    let resolveAction: (() => void) | undefined;
    mocks.createChecklistItem.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = () => resolve({ item: baseItems[0], revision: 2 });
        }),
    );
    await renderPage();

    const form = screen.getByLabelText('Add item').closest('form');
    if (!form) throw new Error('Add item form not found');
    await userEvent.type(screen.getByLabelText('Add item'), 'Step');
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(mocks.createChecklistItem).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveAction?.();
    });
  });

  it('shows Complete and Uncomplete only where permitted', async () => {
    const user = userEvent.setup();
    await renderPage();

    expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uncomplete' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => {
      expect(mocks.completeChecklistItem).toHaveBeenCalledWith('ws-1', 'project-1', 'cl-1', 'item-1');
    });
  });

  it('hides Complete for members but shows Uncomplete on their own completed item', async () => {
    setRole('MEMBER');
    mocks.listChecklistItems.mockResolvedValue({
      items: [baseItems[0], { ...baseItems[1], completedById: 'user-1' }],
    });
    await renderPage();

    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uncomplete' })).toBeInTheDocument();
  });

  it('hides sign-off from regular members', async () => {
    setRole('MEMBER');
    await renderPage();
    expect(screen.queryByRole('button', { name: 'Sign off' })).not.toBeInTheDocument();
  });

  it('hides sign-off from the item completer', async () => {
    mocks.listChecklistItems.mockResolvedValue({
      items: [baseItems[0], { ...baseItems[1], completedById: 'user-1' }],
    });
    await renderPage();
    expect(screen.queryByRole('button', { name: 'Sign off' })).not.toBeInTheDocument();
  });

  it('sends sign-off and sign-off removal requests', async () => {
    const user = userEvent.setup();
    mocks.listChecklistItems.mockResolvedValue({
      items: [
        baseItems[0],
        baseItems[1],
        { ...baseItems[1], id: 'item-3', text: 'Approve plan', signedOffById: 'user-2', signedOffAt: '2026-01-03T00:00:00.000Z' },
      ],
    });
    await renderPage();

    expect(screen.getAllByText(/Completed by Bob/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Signed off by Bob/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign off' }));
    await waitFor(() => {
      expect(mocks.signOffChecklistItem).toHaveBeenCalledWith('ws-1', 'project-1', 'cl-1', 'item-2');
    });

    await user.click(screen.getByRole('button', { name: 'Remove sign-off' }));
    await waitFor(() => {
      expect(mocks.removeChecklistItemSignOff).toHaveBeenCalledWith(
        'ws-1',
        'project-1',
        'cl-1',
        'item-3',
      );
    });
  });

  it('shows the backend 409 message and refreshes on conflict', async () => {
    const user = userEvent.setup();
    mocks.uncompleteChecklistItem.mockRejectedValue(
      new ApiRequestError('A signed-off item cannot be uncompleted', 409, 'ITEM_SIGNED_OFF'),
    );
    mocks.listChecklistItems.mockResolvedValue({
      items: [baseItems[0], { ...baseItems[1], signedOffById: 'user-2', signedOffAt: '2026-01-03T00:00:00.000Z' }],
    });
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Uncomplete' }));

    expect(await screen.findByText('A signed-off item cannot be uncompleted')).toBeInTheDocument();
    expect(mocks.listChecklists.mock.calls.length).toBeGreaterThan(1);
  });

  it('shows the backend 403 self-review message', async () => {
    const user = userEvent.setup();
    mocks.signOffChecklistItem.mockRejectedValue(
      new ApiRequestError('You cannot approve your own submission', 403, 'SELF_REVIEW_FORBIDDEN'),
    );
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Sign off' }));

    expect(await screen.findByText('You cannot approve your own submission')).toBeInTheDocument();
  });

  it('shows the backend ITEM_NOT_COMPLETED message and refreshes', async () => {
    const user = userEvent.setup();
    mocks.signOffChecklistItem.mockRejectedValue(
      new ApiRequestError('Only a completed item can be signed off', 409, 'ITEM_NOT_COMPLETED'),
    );
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Sign off' }));

    expect(await screen.findByText('Only a completed item can be signed off')).toBeInTheDocument();
    expect(mocks.listChecklists.mock.calls.length).toBeGreaterThan(1);
  });

  it('shows the backend CHECKLIST_ITEM_LIMIT message and refreshes', async () => {
    const user = userEvent.setup();
    mocks.createChecklistItem.mockRejectedValue(
      new ApiRequestError('A checklist can contain at most 200 live items', 409, 'CHECKLIST_ITEM_LIMIT'),
    );
    await renderPage();
    const callsBeforeLimit = mocks.listChecklists.mock.calls.length;

    await user.type(screen.getByLabelText('Add item'), 'One too many');
    await user.click(screen.getByRole('button', { name: 'Add item' }));

    expect(await screen.findByText('A checklist can contain at most 200 live items')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.listChecklists.mock.calls.length).toBeGreaterThan(callsBeforeLimit);
    });
  });

  it('does not show an error for an idempotent 200 no-op', async () => {
    const user = userEvent.setup();
    mocks.completeChecklistItem.mockResolvedValue({ item: baseItems[0], revision: 2 });
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Complete' }));

    expect(await screen.findByText('Item updated.')).toBeInTheDocument();
    expect(screen.queryByText('Request failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Unable to complete item.')).not.toBeInTheDocument();
  });

  it('shows the 200-item cap and disables adding at the cap', async () => {
    const cappedItems = Array.from({ length: 200 }, (_, index) => ({
      ...baseItems[0],
      id: `item-${index + 1}`,
      text: `Step ${index + 1}`,
      position: index,
    }));
    mocks.listChecklistItems.mockResolvedValue({ items: cappedItems });
    await renderPage();

    expect(screen.getByText('200/200 live items')).toBeInTheDocument();
    expect(screen.getByText('A checklist can contain at most 200 live items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled();
    expect(screen.getByLabelText('Add item')).toBeDisabled();
  }, 60_000);

  it('allows managers to add, edit and delete feedback', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Feedback for item-1' }));
    expect(await screen.findByText('No feedback yet.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Add feedback'), 'Looks good');
    await user.click(screen.getByRole('button', { name: 'Add feedback' }));
    await waitFor(() => {
      expect(mocks.createChecklistFeedback).toHaveBeenCalledWith(
        'ws-1',
        'project-1',
        'cl-1',
        'item-1',
        { body: 'Looks good' },
      );
    });

    mocks.listChecklistFeedback.mockResolvedValue({
      items: [
        {
          id: 'f-2',
          checklistItemId: 'item-2',
          authorId: 'user-1',
          body: 'Review note',
          createdAt: '2026-01-03T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
          editedAt: null,
        },
      ],
      nextCursor: null,
    });
    mocks.updateChecklistFeedback.mockResolvedValue({
      feedback: { id: 'f-2', authorId: 'user-1', body: 'Revised' },
    });
    await user.click(screen.getByRole('button', { name: 'Feedback for item-2' }));
    const itemTwo = screen.getByRole('button', { name: 'Feedback for item-2' }).closest('li');
    if (!itemTwo) throw new Error('Item two feedback panel not found');
    expect(await within(itemTwo).findByText('Review note')).toBeInTheDocument();

    await user.click(within(itemTwo).getByRole('button', { name: 'Edit feedback' }));
    const editFeedback = await within(itemTwo).findByLabelText('Edit feedback');
    await user.clear(editFeedback);
    await user.type(editFeedback, 'Revised');
    await user.click(within(itemTwo).getByRole('button', { name: 'Save feedback' }));
    await waitFor(() => {
      expect(mocks.updateChecklistFeedback).toHaveBeenCalledWith(
        'ws-1',
        'project-1',
        'cl-1',
        'item-2',
        'f-2',
        { body: 'Revised' },
      );
    });

    await user.click(within(itemTwo).getByRole('button', { name: 'Delete feedback' }));
    await waitFor(() => {
      expect(mocks.deleteChecklistFeedback).toHaveBeenCalledWith(
        'ws-1',
        'project-1',
        'cl-1',
        'item-2',
        'f-2',
      );
    });
  });

  it('hides mutation controls and feedback posting from viewers', async () => {
    setRole('VIEWER');
    await renderPage();

    expect(screen.queryByRole('button', { name: 'New checklist' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save checklist' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete checklist' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add item' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit item' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete item' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign off' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move up/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
    expect(mocks.createReview).not.toHaveBeenCalled();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Feedback for item-1' }));
    expect(await screen.findByText('No feedback yet.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add feedback')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add feedback' })).not.toBeInTheDocument();
  });

  it('submits the selected checklist for review when submission is permitted', async () => {
    const user = userEvent.setup();
    setRole('PROJECT_MANAGER', ['submission.submit']);
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Submit for review' }));

    await waitFor(() => expect(mocks.createReview).toHaveBeenCalledWith('ws-1', 'project-1', {
      checklistId: 'cl-1',
    }));
    expect(mocks.createReview).toHaveBeenCalledTimes(1);
  });

  it('renders older responses with missing optional fields', async () => {
    mocks.listChecklists.mockResolvedValue({
      items: [{ id: 'cl-1', title: 'Legacy checklist' }],
      nextCursor: null,
    });
    mocks.listChecklistItems.mockResolvedValue({
      items: [{ id: 'item-1', text: 'Legacy item' }],
    });
    render(<ProjectChecklistsPage />);
    expect(await screen.findByRole('heading', { name: 'Legacy checklist' })).toBeInTheDocument();

    expect(screen.getByText('Legacy item')).toBeInTheDocument();
    expect(screen.getByText('0/1 items complete')).toBeInTheDocument();
  });
});
