/**
 * app/app/ai-actions/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AIActionsPage from './page';
import {
  addAiActionProposals,
  resetAiActionProposalsForTests,
  type ProposedAiAction,
} from '@/lib/ai-action-proposals';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/ai-actions',
}));

const mockCtx = {
  activeWorkspace: { id: 'ws-1', name: 'Test WS', type: 'COMPANY' as const },
  workspaces: [],
  user: { id: 'user-1', name: 'Ada', email: 'ada@test.com' },
  loading: false,
  switchToWorkspace: vi.fn(),
};
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mockCtx }));

vi.mock('@/services/ai', () => ({
  approveAiAction: vi.fn(),
}));
import { approveAiAction } from '@/services/ai';
const mockApprove = vi.mocked(approveAiAction);

function proposal(overrides: Partial<ProposedAiAction> = {}): ProposedAiAction {
  return {
    id: 'proposal-1',
    workspaceId: 'ws-1',
    actionType: 'CREATE_TASK',
    description: 'Create a task "Review Q4 report"',
    payload: { title: 'Review Q4 report', priority: 'HIGH' },
    proposedAt: new Date().toISOString(),
    status: 'PENDING',
    ...overrides,
  };
}

describe('AIActionsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetAiActionProposalsForTests();
    mockCtx.activeWorkspace = { id: 'ws-1', name: 'Test WS', type: 'COMPANY' };
    mockApprove.mockResolvedValue({
      actionType: 'CREATE_TASK',
      executed: false,
      message: 'AI action execution not yet implemented. The approval was valid.',
    });
  });

  it('renders the AI Action Approvals heading', () => {
    render(<AIActionsPage />);
    expect(screen.getByRole('heading', { name: 'AI Action Approvals', level: 1 })).toBeInTheDocument();
  });

  it('shows the preview mode notice', () => {
    render(<AIActionsPage />);
    expect(screen.getByText(/Preview mode/)).toBeInTheDocument();
  });

  it('shows the approval rules card', () => {
    render(<AIActionsPage />);
    expect(screen.getByText('How AI action approval works')).toBeInTheDocument();
    expect(screen.getByText(/AI never silently performs mutations/)).toBeInTheDocument();
  });

  it('shows an honest empty state when no backend proposal exists', () => {
    render(<AIActionsPage />);
    expect(screen.getByText('No pending actions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows a workspace prompt when no workspace is active', () => {
    mockCtx.activeWorkspace = null as unknown as typeof mockCtx.activeWorkspace;
    render(<AIActionsPage />);
    expect(screen.getByText('Choose a workspace')).toBeInTheDocument();
  });

  it('renders proposals supplied by the AI response', () => {
    addAiActionProposals([proposal()]);
    render(<AIActionsPage />);
    expect(screen.getByText('Create a task')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('ignores proposals from another workspace', () => {
    addAiActionProposals([proposal({ workspaceId: 'other-ws' })]);
    render(<AIActionsPage />);
    expect(screen.getByText('No pending actions')).toBeInTheDocument();
  });

  it('shows confirm dialog when Approve is clicked', async () => {
    const user = userEvent.setup();
    addAiActionProposals([proposal()]);
    render(<AIActionsPage />);

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByRole('dialog', { name: 'Approve AI action' })).toBeInTheDocument();
  });

  it('calls approveAiAction and shows the backend result after confirmation', async () => {
    const user = userEvent.setup();
    addAiActionProposals([proposal()]);
    render(<AIActionsPage />);

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await screen.findByRole('dialog', { name: 'Approve AI action' });
    await user.click(screen.getByRole('button', { name: 'Approve and execute' }));

    await waitFor(() =>
      expect(mockApprove).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          actionType: 'CREATE_TASK',
        }),
      ),
    );
    expect(await screen.findByText('APPROVED')).toBeInTheDocument();
    expect(
      screen.getByText('AI action execution not yet implemented. The approval was valid.'),
    ).toBeInTheDocument();
  });

  it('marks action as Rejected when Reject is clicked', async () => {
    const user = userEvent.setup();
    addAiActionProposals([proposal()]);
    render(<AIActionsPage />);

    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(await screen.findByText('REJECTED')).toBeInTheDocument();
  });

  it('shows EXPIRED badge for stale pending actions and hides approval controls', () => {
    addAiActionProposals([
      proposal({ proposedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString() }),
    ]);
    render(<AIActionsPage />);
    expect(screen.getByText('EXPIRED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});
