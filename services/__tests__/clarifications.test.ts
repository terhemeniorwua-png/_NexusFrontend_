import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiRequest: mocks.apiRequest,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

vi.mock('@/services/auth', () => ({
  refreshSession: mocks.refreshSession,
}));

const WS = 'workspace-1';
const PID = 'project-1';
const TID = 'task-1';
const CID = 'clar-1';

describe('clarifications service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSession.mockResolvedValue(undefined);
  });

  it('askClarification posts question to clarifications endpoint', async () => {
    mocks.apiRequest.mockResolvedValue({ clarification: { id: CID }, task: { id: TID, status: 'AWAITING_CLARIFICATION' } });
    const { askClarification } = await import('../clarifications');
    const result = await askClarification(WS, PID, TID, 'Need details?');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/clarifications`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ question: 'Need details?' }),
      }),
    );
    expect(result.task.status).toBe('AWAITING_CLARIFICATION');
  });

  it('listClarifications requests cursor-paginated history', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: 'next' });
    const { listClarifications } = await import('../clarifications');
    const result = await listClarifications(WS, PID, TID, { cursor: 'c1', limit: 10 });
    const url = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain(`/workspaces/${WS}/projects/${PID}/tasks/${TID}/clarifications?`);
    expect(url).toContain('cursor=c1');
    expect(url).toContain('limit=10');
    expect(result.nextCursor).toBe('next');
  });

  it('answerClarification posts answer to clarification answer endpoint', async () => {
    mocks.apiRequest.mockResolvedValue({ clarification: { id: CID, answer: 'Done' }, task: { id: TID, status: 'ASSIGNED' } });
    const { answerClarification } = await import('../clarifications');
    await answerClarification(WS, PID, TID, CID, 'Use the new API');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/${TID}/clarifications/${CID}/answer`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ answer: 'Use the new API' }),
      }),
    );
  });
});
