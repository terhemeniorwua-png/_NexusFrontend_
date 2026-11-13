import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StartCallButton } from '../StartCallButton';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const createMeeting = vi.fn();
const updateMeeting = vi.fn();
vi.mock('@/services/meetings', () => ({
  createMeeting: (...a: unknown[]) => createMeeting(...a),
  updateMeeting: (...a: unknown[]) => updateMeeting(...a),
}));

describe('StartCallButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMeeting.mockResolvedValue({ id: 'm-9' });
    updateMeeting.mockResolvedValue({});
  });

  it('creates a live call with the target and opens it with autojoin', async () => {
    const user = userEvent.setup();
    render(<StartCallButton workspaceId="ws-1" targetUserId="u-2" targetName="Ada" />);
    await user.click(screen.getByRole('button', { name: 'Call Ada' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/meetings/m-9?autojoin=1'));
    expect(createMeeting).toHaveBeenCalledWith('ws-1', expect.objectContaining({
      title: 'Call with Ada', participantIds: ['u-2'],
    }));
    expect(updateMeeting).toHaveBeenCalledWith('ws-1', 'm-9', { status: 'LIVE' });
  });

  it('shows an error and stays put when creation fails', async () => {
    createMeeting.mockRejectedValue(new Error('x'));
    const user = userEvent.setup();
    render(<StartCallButton workspaceId="ws-1" />);
    await user.click(screen.getByRole('button', { name: 'Start a call' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
