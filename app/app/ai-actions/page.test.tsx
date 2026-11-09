/**
 * app/app/ai-actions/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AIActionsPage from './page';

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

describe('AIActionsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it('shows pending demo actions', () => {
    render(<AIActionsPage />);
    expect(screen.getByText('Create a task')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('shows Approve and Reject buttons for pending actions', () => {
    render(<AIActionsPage />);
    expect(screen.getAllByRole('button', { name: 'Approve' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Reject' }).length).toBeGreaterThan(0);
  });

  it('shows confirm dialog when Approve is clicked', async () => {
    const user = userEvent.setup();
    render(<AIActionsPage />);

    const approveBtns = screen.getAllByRole('button', { name: 'Approve' });
    await user.click(approveBtns[0]);
    expect(screen.getByRole('dialog', { name: 'Approve AI action' })).toBeInTheDocument();
  });

  it('calls approveAiAction and shows result after confirmation', async () => {
    const user = userEvent.setup();
    render(<AIActionsPage />);

    const approveBtns = screen.getAllByRole('button', { name: 'Approve' });
    await user.click(approveBtns[0]);
    await screen.findByRole('dialog', { name: 'Approve AI action' });

    await user.click(screen.getByRole('button', { name: 'Approve and execute' }));

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        actionType: 'CREATE_TASK',
      }),
    ));
  });

  it('marks action as Rejected when Reject is clicked', async () => {
    const user = userEvent.setup();
    render(<AIActionsPage />);

    const rejectBtns = screen.getAllByRole('button', { name: 'Reject' });
    await user.click(rejectBtns[0]);

    expect(await screen.findByText('REJECTED')).toBeInTheDocument();
  });

  it('shows EXPIRED badge for expired actions', () => {
    render(<AIActionsPage />);
    expect(screen.getByText('EXPIRED')).toBeInTheDocument();
  });
});
