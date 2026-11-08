/**
 * services/__tests__/forms.test.ts
 *
 * Contract tests for the forms service.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addFormField,
  createForm,
  deleteForm,
  getForm,
  listFormResponses,
  listForms,
  submitFormResponse,
  updateForm,
} from '../forms';

const WS = 'ws-forms-test';
const F_ID = 'form-abc';

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeForm(overrides: Partial<{ id: string; title: string; status: string }> = {}) {
  return {
    id: F_ID,
    workspaceId: WS,
    createdById: 'user-1',
    title: 'Customer Survey',
    description: 'Please fill this out',
    status: 'DRAFT',
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: [],
    _count: { responses: 0 },
    ...overrides,
  };
}

describe('listForms', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/forms', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeForm()], nextCursor: null }),
    );
    await listForms(WS);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/forms`,
      expect.any(Object),
    );
  });

  it('appends status query param when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null }),
    );
    await listForms(WS, { status: 'PUBLISHED' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('status=PUBLISHED'),
      expect.any(Object),
    );
  });
});

describe('getForm', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/forms/:formId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm()));
    await getForm(WS, F_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/forms/${F_ID}`,
      expect.any(Object),
    );
  });
});

describe('createForm', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /workspaces/:wsId/forms with title', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm(), 201));
    await createForm(WS, { title: 'Customer Survey' });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/forms`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"title":"Customer Survey"'),
      }),
    );
  });
});

describe('updateForm', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls PATCH /workspaces/:wsId/forms/:formId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok(fakeForm({ status: 'PUBLISHED' })),
    );
    await updateForm(WS, F_ID, { status: 'PUBLISHED' });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/forms/${F_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('deleteForm', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls DELETE /workspaces/:wsId/forms/:formId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await deleteForm(WS, F_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/forms/${F_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('addFormField', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /workspaces/:wsId/forms/:formId/fields with field data', async () => {
    const field = {
      id: 'field-1', formId: F_ID, label: 'Name', type: 'TEXT',
      required: true, options: [], placeholder: null, position: 0,
      createdAt: new Date().toISOString(),
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(field, 201));
    await addFormField(WS, F_ID, { label: 'Name', type: 'TEXT', required: true });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/forms/${F_ID}/fields`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"label":"Name"'),
      }),
    );
  });
});

describe('submitFormResponse', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /workspaces/:wsId/forms/:formId/responses with answers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }, 201));
    await submitFormResponse(WS, F_ID, {
      answers: [{ fieldId: 'field-1', value: 'John' }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/forms/${F_ID}/responses`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"fieldId":"field-1"'),
      }),
    );
  });
});

describe('listFormResponses', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/forms/:formId/responses', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null }),
    );
    await listFormResponses(WS, F_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/forms/${F_ID}/responses`,
      expect.any(Object),
    );
  });

  it('appends cursor and limit params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null }),
    );
    await listFormResponses(WS, F_ID, { cursor: 'cur-1', limit: 10 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('cursor=cur-1'),
      expect.any(Object),
    );
  });
});
