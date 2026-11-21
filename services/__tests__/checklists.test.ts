import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  refreshSession: vi.fn(),
  showToast: vi.fn(),
  onPermissionDenied: vi.fn(),
  notifyPermissionDenied: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiRequest: mocks.apiRequest,
  showToast: mocks.showToast,
  onPermissionDenied: mocks.onPermissionDenied,
  notifyPermissionDenied: mocks.notifyPermissionDenied,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    code?: string;
    details?: unknown;

    constructor(message: string, status: number, code?: string, details?: unknown) {
      super(message);
      this.name = 'ApiRequestError';
      this.status = status;
      this.code = code;
      this.details = details;
    }
  },
}));

vi.mock('@/services/auth', () => ({
  refreshSession: mocks.refreshSession,
}));

const WS = 'workspace-1';
const PROJECT = 'project-1';
const CHECKLIST = 'checklist-1';
const ITEM = 'item-1';
const FEEDBACK = 'feedback-1';
const BASE = `/workspaces/${WS}/projects/${PROJECT}/checklists`;

describe('checklists service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSession.mockResolvedValue(undefined);
  });

  it('listChecklists sends pagination query and normalises a page', async () => {
    mocks.apiRequest.mockResolvedValue({
      items: [{ id: CHECKLIST, title: 'Launch' }],
      nextCursor: CHECKLIST,
    });
    const { listChecklists } = await import('../checklists');

    const result = await listChecklists(WS, PROJECT, { cursor: 'cursor-1', limit: 10 });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}?cursor=cursor-1&limit=10`,
      expect.objectContaining({ authenticated: true }),
    );
    expect(result.nextCursor).toBe(CHECKLIST);
    expect(result.items[0]).toMatchObject({
      id: CHECKLIST,
      title: 'Launch',
      description: null,
      revision: 0,
    });
  });

  it('createChecklist posts the checklist input', async () => {
    mocks.apiRequest.mockResolvedValue({ checklist: { id: CHECKLIST, title: 'Launch' } });
    const { createChecklist } = await import('../checklists');

    const result = await createChecklist(WS, PROJECT, { title: 'Launch', description: null });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ title: 'Launch', description: null }),
      }),
    );
    expect(result.checklist.id).toBe(CHECKLIST);
  });

  it('getChecklist reads one checklist', async () => {
    mocks.apiRequest.mockResolvedValue({ checklist: { id: CHECKLIST, title: 'Launch' } });
    const { getChecklist } = await import('../checklists');

    const result = await getChecklist(WS, PROJECT, CHECKLIST);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}`,
      expect.objectContaining({ authenticated: true }),
    );
    expect(result.checklist.title).toBe('Launch');
    expect(result.checklist.description).toBeNull();
    expect(result.checklist.createdById).toBe('');
  });

  it('updateChecklist patches the checklist', async () => {
    mocks.apiRequest.mockResolvedValue({ checklist: { id: CHECKLIST, title: 'Updated' } });
    const { updateChecklist } = await import('../checklists');

    const result = await updateChecklist(WS, PROJECT, CHECKLIST, { title: 'Updated' });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}`,
      expect.objectContaining({
        authenticated: true,
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated' }),
      }),
    );
    expect(result.checklist.title).toBe('Updated');
  });

  it('deleteChecklist deletes the checklist', async () => {
    mocks.apiRequest.mockResolvedValue({ ok: true });
    const { deleteChecklist } = await import('../checklists');

    const result = await deleteChecklist(WS, PROJECT, CHECKLIST);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}`,
      expect.objectContaining({ authenticated: true, method: 'DELETE' }),
    );
    expect(result.ok).toBe(true);
  });

  it('listChecklistItems reads all live items', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [{ id: ITEM, text: 'Step one' }] });
    const { listChecklistItems } = await import('../checklists');

    const result = await listChecklistItems(WS, PROJECT, CHECKLIST);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items`,
      expect.objectContaining({ authenticated: true }),
    );
    expect(result.items[0]).toMatchObject({ id: ITEM, text: 'Step one', completed: false });
  });

  it('createChecklistItem posts item text', async () => {
    mocks.apiRequest.mockResolvedValue({ item: { id: ITEM, text: 'Step one' }, revision: 2 });
    const { createChecklistItem } = await import('../checklists');

    const result = await createChecklistItem(WS, PROJECT, CHECKLIST, { text: 'Step one' });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ text: 'Step one' }),
      }),
    );
    expect(result.revision).toBe(2);
  });

  it('reorderChecklistItems posts the complete ordered id list', async () => {
    const itemIds = [ITEM, 'item-2'];
    mocks.apiRequest.mockResolvedValue({ items: [], revision: 3 });
    const { reorderChecklistItems } = await import('../checklists');

    await reorderChecklistItems(WS, PROJECT, CHECKLIST, { itemIds });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/reorder`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ itemIds }),
      }),
    );
  });

  it('updateChecklistItem patches item text', async () => {
    mocks.apiRequest.mockResolvedValue({ item: { id: ITEM, text: 'Edited' }, revision: 4 });
    const { updateChecklistItem } = await import('../checklists');

    const result = await updateChecklistItem(WS, PROJECT, CHECKLIST, ITEM, { text: 'Edited' });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}`,
      expect.objectContaining({
        authenticated: true,
        method: 'PATCH',
        body: JSON.stringify({ text: 'Edited' }),
      }),
    );
    expect(result.item.text).toBe('Edited');
  });

  it('deleteChecklistItem deletes the item', async () => {
    mocks.apiRequest.mockResolvedValue({ ok: true, revision: 5 });
    const { deleteChecklistItem } = await import('../checklists');

    const result = await deleteChecklistItem(WS, PROJECT, CHECKLIST, ITEM);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}`,
      expect.objectContaining({ authenticated: true, method: 'DELETE' }),
    );
    expect(result).toMatchObject({ ok: true, revision: 5 });
  });

  it('completeChecklistItem posts to complete', async () => {
    mocks.apiRequest.mockResolvedValue({ item: { id: ITEM, text: 'Step one' }, revision: 6 });
    const { completeChecklistItem } = await import('../checklists');

    await completeChecklistItem(WS, PROJECT, CHECKLIST, ITEM);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}/complete`,
      expect.objectContaining({ authenticated: true, method: 'POST' }),
    );
  });

  it('uncompleteChecklistItem posts to uncomplete', async () => {
    mocks.apiRequest.mockResolvedValue({ item: { id: ITEM, text: 'Step one' }, revision: 7 });
    const { uncompleteChecklistItem } = await import('../checklists');

    await uncompleteChecklistItem(WS, PROJECT, CHECKLIST, ITEM);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}/uncomplete`,
      expect.objectContaining({ authenticated: true, method: 'POST' }),
    );
  });

  it('signOffChecklistItem posts to sign-off', async () => {
    mocks.apiRequest.mockResolvedValue({ item: { id: ITEM, text: 'Step one' }, revision: 8 });
    const { signOffChecklistItem } = await import('../checklists');

    await signOffChecklistItem(WS, PROJECT, CHECKLIST, ITEM);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}/sign-off`,
      expect.objectContaining({ authenticated: true, method: 'POST' }),
    );
  });

  it('removeChecklistItemSignOff deletes the sign-off', async () => {
    mocks.apiRequest.mockResolvedValue({ item: { id: ITEM, text: 'Step one' }, revision: 9 });
    const { removeChecklistItemSignOff } = await import('../checklists');

    await removeChecklistItemSignOff(WS, PROJECT, CHECKLIST, ITEM);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}/sign-off`,
      expect.objectContaining({ authenticated: true, method: 'DELETE' }),
    );
  });

  it('listChecklistFeedback reads a feedback page', async () => {
    mocks.apiRequest.mockResolvedValue({
      items: [{ id: FEEDBACK, authorId: 'user-1', body: 'Looks good' }],
      nextCursor: FEEDBACK,
    });
    const { listChecklistFeedback } = await import('../checklists');

    const result = await listChecklistFeedback(WS, PROJECT, CHECKLIST, ITEM, {
      cursor: 'cursor-2',
      limit: 5,
    });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}/feedback?cursor=cursor-2&limit=5`,
      expect.objectContaining({ authenticated: true }),
    );
    expect(result.items[0]).toMatchObject({ id: FEEDBACK, authorId: 'user-1', body: 'Looks good' });
    expect(result.nextCursor).toBe(FEEDBACK);
  });

  it('createChecklistFeedback posts feedback body', async () => {
    mocks.apiRequest.mockResolvedValue({
      feedback: { id: FEEDBACK, authorId: 'user-1', body: 'Looks good' },
    });
    const { createChecklistFeedback } = await import('../checklists');

    const result = await createChecklistFeedback(WS, PROJECT, CHECKLIST, ITEM, {
      body: 'Looks good',
    });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}/feedback`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ body: 'Looks good' }),
      }),
    );
    expect(result.feedback.id).toBe(FEEDBACK);
  });

  it('updateChecklistFeedback patches feedback body', async () => {
    mocks.apiRequest.mockResolvedValue({
      feedback: { id: FEEDBACK, authorId: 'user-1', body: 'Revised' },
    });
    const { updateChecklistFeedback } = await import('../checklists');

    const result = await updateChecklistFeedback(WS, PROJECT, CHECKLIST, ITEM, FEEDBACK, {
      body: 'Revised',
    });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}/feedback/${FEEDBACK}`,
      expect.objectContaining({
        authenticated: true,
        method: 'PATCH',
        body: JSON.stringify({ body: 'Revised' }),
      }),
    );
    expect(result.feedback.body).toBe('Revised');
  });

  it('deleteChecklistFeedback deletes the feedback', async () => {
    mocks.apiRequest.mockResolvedValue({ ok: true });
    const { deleteChecklistFeedback } = await import('../checklists');

    const result = await deleteChecklistFeedback(WS, PROJECT, CHECKLIST, ITEM, FEEDBACK);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${CHECKLIST}/items/${ITEM}/feedback/${FEEDBACK}`,
      expect.objectContaining({ authenticated: true, method: 'DELETE' }),
    );
    expect(result.ok).toBe(true);
  });

  it('propagates the backend status, code and message for every service function', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    const modules = await import('../checklists');
    const cases: Array<{
      label: string;
      status: number;
      code: string;
      message: string;
      call: () => Promise<unknown>;
    }> = [
      {
        label: 'listChecklists',
        status: 403,
        code: 'PERMISSION_DENIED',
        message: 'You do not have access to this project',
        call: () => modules.listChecklists(WS, PROJECT),
      },
      {
        label: 'createChecklist',
        status: 403,
        code: 'PERMISSION_DENIED',
        message: 'project.update is required',
        call: () => modules.createChecklist(WS, PROJECT, { title: 'Launch' }),
      },
      {
        label: 'getChecklist',
        status: 404,
        code: 'CHECKLIST_NOT_FOUND',
        message: 'That checklist does not exist',
        call: () => modules.getChecklist(WS, PROJECT, CHECKLIST),
      },
      {
        label: 'updateChecklist',
        status: 403,
        code: 'PERMISSION_DENIED',
        message: 'project.update is required',
        call: () => modules.updateChecklist(WS, PROJECT, CHECKLIST, { title: 'Launch' }),
      },
      {
        label: 'deleteChecklist',
        status: 403,
        code: 'PERMISSION_DENIED',
        message: 'project.update is required',
        call: () => modules.deleteChecklist(WS, PROJECT, CHECKLIST),
      },
      {
        label: 'listChecklistItems',
        status: 403,
        code: 'PERMISSION_DENIED',
        message: 'You do not have access to this project',
        call: () => modules.listChecklistItems(WS, PROJECT, CHECKLIST),
      },
      {
        label: 'createChecklistItem',
        status: 409,
        code: 'CHECKLIST_ITEM_LIMIT',
        message: 'A checklist can contain at most 200 live items',
        call: () => modules.createChecklistItem(WS, PROJECT, CHECKLIST, { text: 'Too many' }),
      },
      {
        label: 'reorderChecklistItems',
        status: 409,
        code: 'CHECKLIST_ITEMS_MISMATCH',
        message: 'itemIds must be the complete ordered list of live checklist item ids',
        call: () => modules.reorderChecklistItems(WS, PROJECT, CHECKLIST, { itemIds: [ITEM] }),
      },
      {
        label: 'updateChecklistItem',
        status: 404,
        code: 'CHECKLIST_ITEM_NOT_FOUND',
        message: 'That checklist item does not exist',
        call: () => modules.updateChecklistItem(WS, PROJECT, CHECKLIST, ITEM, { text: 'Gone' }),
      },
      {
        label: 'deleteChecklistItem',
        status: 403,
        code: 'PERMISSION_DENIED',
        message: 'project.update is required',
        call: () => modules.deleteChecklistItem(WS, PROJECT, CHECKLIST, ITEM),
      },
      {
        label: 'completeChecklistItem',
        status: 409,
        code: 'CHECKLIST_ITEM_CONFLICT',
        message: 'The item state changed concurrently',
        call: () => modules.completeChecklistItem(WS, PROJECT, CHECKLIST, ITEM),
      },
      {
        label: 'uncompleteChecklistItem',
        status: 409,
        code: 'ITEM_SIGNED_OFF',
        message: 'A signed-off item cannot be uncompleted',
        call: () => modules.uncompleteChecklistItem(WS, PROJECT, CHECKLIST, ITEM),
      },
      {
        label: 'signOffChecklistItem/not-completed',
        status: 409,
        code: 'ITEM_NOT_COMPLETED',
        message: 'Only a completed item can be signed off',
        call: () => modules.signOffChecklistItem(WS, PROJECT, CHECKLIST, ITEM),
      },
      {
        label: 'signOffChecklistItem/self-review',
        status: 403,
        code: 'SELF_REVIEW_FORBIDDEN',
        message: 'You cannot approve your own submission',
        call: () => modules.signOffChecklistItem(WS, PROJECT, CHECKLIST, ITEM),
      },
      {
        label: 'removeChecklistItemSignOff',
        status: 403,
        code: 'PERMISSION_DENIED',
        message: 'You are not allowed to remove the sign-off of this checklist item',
        call: () => modules.removeChecklistItemSignOff(WS, PROJECT, CHECKLIST, ITEM),
      },
      {
        label: 'listChecklistFeedback',
        status: 403,
        code: 'PERMISSION_DENIED',
        message: 'You do not have access to this project',
        call: () => modules.listChecklistFeedback(WS, PROJECT, CHECKLIST, ITEM),
      },
      {
        label: 'createChecklistFeedback',
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Feedback body must be between 1 and 4000 non-blank characters',
        call: () => modules.createChecklistFeedback(WS, PROJECT, CHECKLIST, ITEM, { body: '' }),
      },
      {
        label: 'updateChecklistFeedback',
        status: 403,
        code: 'FEEDBACK_FORBIDDEN',
        message: 'Only the author can edit this feedback',
        call: () => modules.updateChecklistFeedback(WS, PROJECT, CHECKLIST, ITEM, FEEDBACK, { body: 'Nope' }),
      },
      {
        label: 'deleteChecklistFeedback',
        status: 403,
        code: 'FEEDBACK_FORBIDDEN',
        message: 'Only the author or an admin can delete this feedback',
        call: () => modules.deleteChecklistFeedback(WS, PROJECT, CHECKLIST, ITEM, FEEDBACK),
      },
    ];

    for (const entry of cases) {
      mocks.apiRequest.mockRejectedValueOnce(
        new ApiRequestError(entry.message, entry.status, entry.code),
      );
      await expect(entry.call(), entry.label).rejects.toMatchObject({
        status: entry.status,
        code: entry.code,
        message: entry.message,
      });
    }
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes the session and retries once after a 401', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.apiRequest
      .mockRejectedValueOnce(new ApiRequestError('Unauthorized', 401))
      .mockResolvedValueOnce({ checklist: { id: CHECKLIST, title: 'Launch' } });
    const { getChecklist } = await import('../checklists');

    const result = await getChecklist(WS, PROJECT, CHECKLIST);

    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.apiRequest).toHaveBeenCalledTimes(2);
    expect(result.checklist.id).toBe(CHECKLIST);
  });

  it('does not crash when newer optional response fields are missing', async () => {
    mocks.apiRequest.mockResolvedValue({
      items: [{ id: ITEM, text: 'Legacy item' }],
      itemsChecklist: undefined,
    });
    const { listChecklistItems } = await import('../checklists');

    const result = await listChecklistItems(WS, PROJECT, CHECKLIST);

    expect(result.items[0]).toMatchObject({
      id: ITEM,
      text: 'Legacy item',
      completed: false,
      completedById: null,
      signedOffById: null,
    });
  });
});
