/**
 * app/app/forms/[formId]/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FormDetailPage from './page';

const WS_ID = 'ws-form-detail';
const USER_ID = 'user-creator';
const FORM_ID = 'form-detail-1';

const mockRouter = { push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ formId: FORM_ID }),
  usePathname: () => `/app/forms/${FORM_ID}`,
}));

const mockCtx = {
  activeWorkspace: { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const },
  workspaces: [],
  user: { id: USER_ID, name: 'Creator', email: 'creator@test.com' },
  loading: false,
  switchToWorkspace: vi.fn(),
};
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mockCtx }));

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function fail(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeForm(overrides: Partial<{
  status: string;
  createdById: string;
  fields: Array<Record<string, unknown>>;
}> = {}) {
  return {
    id: FORM_ID,
    workspaceId: WS_ID,
    createdById: USER_ID,
    title: 'Employee Satisfaction',
    description: 'Annual survey',
    status: 'DRAFT',
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: [
      {
        id: 'field-1', formId: FORM_ID, label: 'Name', type: 'TEXT',
        required: true, options: [], placeholder: null, position: 0,
        createdAt: new Date().toISOString(),
      },
    ],
    _count: { responses: 2 },
    ...overrides,
  };
}

describe('FormDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRouter.push.mockClear();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
    mockCtx.user = { id: USER_ID, name: 'Creator', email: 'creator@test.com' };
  });

  it('shows loading state initially', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<FormDetailPage />);
    expect(screen.getByLabelText('Loading form')).toBeInTheDocument();
    resolve(ok(fakeForm()));
  });

  it('renders the form title after load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm()));
    render(<FormDetailPage />);
    expect(await screen.findByRole('heading', { name: 'Employee Satisfaction', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('shows the description when present', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm()));
    render(<FormDetailPage />);
    expect(await screen.findByText('Annual survey')).toBeInTheDocument();
  });

  it('shows fields tab with field list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm()));
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading form')).not.toBeInTheDocument());
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Short text')).toBeInTheDocument();
  });

  it('shows Add field button for creator in DRAFT status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm({ createdById: USER_ID, status: 'DRAFT' })));
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading form')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Add field' })).toBeInTheDocument();
  });

  it('opens Add field modal when Add field is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm()));
    const user = userEvent.setup();
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add field' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add field' }));
    expect(screen.getByRole('dialog', { name: 'Add field' })).toBeInTheDocument();
  });

  it('adds a field via POST and updates the list', async () => {
    const newField = {
      id: 'field-2', formId: FORM_ID, label: 'Email', type: 'EMAIL',
      required: false, options: [], placeholder: null, position: 1,
      createdAt: new Date().toISOString(),
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if ((init as RequestInit | undefined)?.method === 'POST') return ok(newField, 201);
      return ok(fakeForm());
    });
    const user = userEvent.setup();
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add field' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Add field' }));
    await screen.findByRole('dialog', { name: 'Add field' });
    await user.type(screen.getByRole('textbox', { name: 'Question / label' }), 'Email');
    // Click the submit button inside the dialog (last "Add field" button)
    const addBtns = screen.getAllByRole('button', { name: 'Add field' });
    await user.click(addBtns[addBtns.length - 1]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/forms/${FORM_ID}/fields`),
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('shows Responses tab when clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/responses')) return ok({ items: [], nextCursor: null });
      return ok(fakeForm());
    });
    const user = userEvent.setup();
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading form')).not.toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /Responses/ }));
    expect(await screen.findByText('No responses yet')).toBeInTheDocument();
  });

  it('shows Settings tab when clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm({ createdById: USER_ID })));
    const user = userEvent.setup();
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading form')).not.toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByDisplayValue('Employee Satisfaction')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeInTheDocument();
  });

  it('previews a published form and submits a response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).includes('/responses') && (init as RequestInit | undefined)?.method === 'POST') {
        return ok({ ok: true }, 201);
      }
      if (String(url).includes('/responses')) return ok({ items: [], nextCursor: null });
      return ok(fakeForm({ status: 'PUBLISHED' }));
    });
    const user = userEvent.setup();
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading form')).not.toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: 'Preview' }));
    await user.type(screen.getByRole('textbox', { name: /Name/ }), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: 'Submit response' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([url, init]) =>
        String(url).includes(`/forms/${FORM_ID}/responses`)
        && (init as RequestInit | undefined)?.method === 'POST');
      expect(post).toBeDefined();
      expect(JSON.parse(String((post?.[1] as RequestInit).body))).toEqual({
        answers: [{ fieldId: 'field-1', value: 'Ada Lovelace' }],
      });
    });
    expect(await screen.findByText('Response submitted.')).toBeInTheDocument();
  });

  it('blocks preview submission until required fields are completed', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).includes('/responses') && (init as RequestInit | undefined)?.method === 'POST') {
        return ok({ ok: true }, 201);
      }
      return ok(fakeForm({ status: 'PUBLISHED' }));
    });
    const user = userEvent.setup();
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading form')).not.toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: 'Preview' }));
    await user.click(screen.getByRole('button', { name: 'Submit response' }));
    expect(await screen.findByText(/Complete required field/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) =>
      (init as RequestInit | undefined)?.method === 'POST')).toBe(false);
  });

  it('disables preview submission while the form is a draft', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm({ status: 'DRAFT' })));
    const user = userEvent.setup();
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading form')).not.toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: 'Preview' }));
    expect(screen.getByRole('button', { name: 'Submit response' })).toBeDisabled();
    expect(screen.getByText('Only published forms accept responses.')).toBeInTheDocument();
  });

  it('shows AccessState on 401 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('UNAUTHORIZED', 'Unauthorized', 401));
    render(<FormDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading form')).not.toBeInTheDocument());
    expect(screen.queryByText('Employee Satisfaction')).not.toBeInTheDocument();
  });

  it('redirects to /app/forms when workspace changes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeForm()));
    const { rerender } = render(<FormDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading form')).not.toBeInTheDocument());

    mockCtx.activeWorkspace = { id: 'ws-other', name: 'Other WS', type: 'COMPANY' };
    rerender(<FormDetailPage />);
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/app/forms'));
  });
});
