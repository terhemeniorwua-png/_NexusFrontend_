import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessagesPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  user: null as null | { id: string; name: string; email: string },
  socket: null as null | { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn>; io: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> } },
  listChannels: vi.fn(),
  createChannel: vi.fn(),
  archiveChannel: vi.fn(),
  deleteChannel: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  listWorkspaceMembers: vi.fn(),
  listTeams: vi.fn(),
  listDepartments: vi.fn(),
  getUnreadCount: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({
    activeWorkspace: mocks.activeWorkspace,
    user: mocks.user,
    loading: false,
  }),
}));

vi.mock('@/providers/SocketProvider', () => ({
  useSocket: () => ({
    socket: mocks.socket,
    status: 'connected',
  }),
}));

vi.mock('@/services/channels', () => ({
  listChannels: mocks.listChannels,
  createChannel: mocks.createChannel,
  archiveChannel: mocks.archiveChannel,
  deleteChannel: mocks.deleteChannel,
  updateChannel: vi.fn(),
  addChannelMember: vi.fn(),
  removeChannelMember: vi.fn(),
}));

vi.mock('@/services/messages', () => ({
  listMessages: mocks.listMessages,
  sendMessage: mocks.sendMessage,
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
  pinMessage: vi.fn(),
  unpinMessage: vi.fn(),
  getReplies: vi.fn().mockResolvedValue([]),
  addReaction: vi.fn(),
  markMessageRead: vi.fn(),
  getUnreadCount: mocks.getUnreadCount,
}));

vi.mock('@/services/workspaces', () => ({
  listWorkspaceMembers: mocks.listWorkspaceMembers,
}));

vi.mock('@/services/organization-structure', () => ({
  listTeams: mocks.listTeams,
  listDepartments: mocks.listDepartments,
}));

const channelA = {
  id: 'channel-1', workspaceId: 'ws-1', type: 'WORKSPACE', name: 'general',
  description: 'General chat', teamId: null, departmentId: null, projectId: null,
  archivedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  memberCount: null,
};

const message1 = {
  id: 'msg-1', channelId: 'channel-1', authorId: 'user-1', authorName: 'Alice',
  body: 'Hello world!', parentId: null, editedAt: null, pinnedAt: null,
  createdAt: '2026-01-01T12:00:00.000Z', updatedAt: '2026-01-01T12:00:00.000Z',
  deletedAt: null, replyCount: 0, reactionCount: 0,
};

describe('MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    mocks.socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn(), io: { on: vi.fn(), off: vi.fn() } };
    mocks.listChannels.mockResolvedValue({ items: [channelA], nextCursor: null });
    mocks.listMessages.mockResolvedValue({ items: [message1], nextCursor: null });
    mocks.listWorkspaceMembers.mockResolvedValue([]);
    mocks.listTeams.mockResolvedValue([]);
    mocks.listDepartments.mockResolvedValue([]);
    mocks.getUnreadCount.mockResolvedValue({ unreadCount: 0 });
  });

  it('shows channels loaded from the API', async () => {
    render(<MessagesPage />);
    expect(await screen.findByText('general')).toBeInTheDocument();
  });

  it('shows empty state when there are no channels', async () => {
    mocks.listChannels.mockResolvedValue({ items: [], nextCursor: null });
    render(<MessagesPage />);
    await waitFor(() => expect(screen.getByText(/no channels/i)).toBeInTheDocument());
  });

  it('shows AccessState on 401 load failure', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listChannels.mockRejectedValue(new ApiRequestError('Unauthorized', 401));
    render(<MessagesPage />);
    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
  });

  it('shows the create channel modal on button click', async () => {
    const user = userEvent.setup();
    render(<MessagesPage />);
    const btn = await screen.findByRole('button', { name: /new channel/i });
    await user.click(btn);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/new channel/i);
  });

  it('selects a channel and shows messages', async () => {
    const user = userEvent.setup();
    render(<MessagesPage />);
    await screen.findByText('general');
    await user.click(screen.getByText('general'));
    expect(await screen.findByText('Hello world!')).toBeInTheDocument();
  });

  it('shows empty message state when channel has no messages', async () => {
    mocks.listMessages.mockResolvedValue({ items: [], nextCursor: null });
    const user = userEvent.setup();
    render(<MessagesPage />);
    await screen.findByText('general');
    await user.click(screen.getByText('general'));
    await waitFor(() => expect(screen.getByText(/no messages yet/i)).toBeInTheDocument());
  });

  it('clears selected channel when workspace changes', async () => {
    mocks.listChannels.mockResolvedValueOnce({ items: [channelA], nextCursor: null })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const user = userEvent.setup();
    const view = render(<MessagesPage />);
    await screen.findByText('general');
    await user.click(screen.getByText('general'));
    expect(await screen.findByText('Hello world!')).toBeInTheDocument();
    mocks.activeWorkspace = { id: 'ws-2', name: 'Other', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    view.rerender(<MessagesPage />);
    await waitFor(() => expect(screen.queryByText('Hello world!')).not.toBeInTheDocument());
  });
});
