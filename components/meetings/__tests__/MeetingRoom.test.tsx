import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import { MeetingRoom, meetingJoinErrorMessage } from '../MeetingRoom';

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="live-room" />,
}));

const getMeetingToken = vi.fn();
const joinMeeting = vi.fn();
const leaveMeeting = vi.fn();
vi.mock('@/services/meetings', () => ({
  getMeetingToken: (...a: unknown[]) => getMeetingToken(...a),
  joinMeeting: (...a: unknown[]) => joinMeeting(...a),
  leaveMeeting: (...a: unknown[]) => leaveMeeting(...a),
}));

function setup() {
  return render(<MeetingRoom workspaceId="ws-1" meetingId="m-1" title="Standup" />);
}

describe('MeetingRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    joinMeeting.mockResolvedValue({ ok: true });
    leaveMeeting.mockResolvedValue({ ok: true });
  });

  it('shows the pre-join screen with mic and camera options', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Join meeting' })).toBeInTheDocument();
    expect(screen.getByLabelText('Microphone on')).toBeChecked();
    expect(screen.getByLabelText('Camera on')).toBeChecked();
    expect(getMeetingToken).not.toHaveBeenCalled();
  });

  it('requests the token before recording the join, then shows the room', async () => {
    getMeetingToken.mockResolvedValue({ token: 't', url: 'wss://x', room: 'r' });
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Join meeting' }));

    await waitFor(() => expect(screen.getByTestId('live-room')).toBeInTheDocument());
    expect(getMeetingToken).toHaveBeenCalledWith('ws-1', 'm-1');
    expect(joinMeeting).toHaveBeenCalledWith('ws-1', 'm-1');
    expect(getMeetingToken.mock.invocationCallOrder[0]).toBeLessThan(
      joinMeeting.mock.invocationCallOrder[0],
    );
  });

  it.each([
    [403, /do not have access/i],
    [409, /ended or been cancelled/i],
    [503, /not available right now/i],
  ])('shows a clear message and does not join when the token request returns %i', async (status, message) => {
    getMeetingToken.mockRejectedValue(new ApiRequestError('boom', status));
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Join meeting' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(joinMeeting).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Join meeting' })).toBeInTheDocument();
  });

  it('maps browser permission errors', () => {
    const err = new Error('denied');
    err.name = 'NotAllowedError';
    expect(meetingJoinErrorMessage(err)).toMatch(/blocked/i);
  });
});
