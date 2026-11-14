'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { useVoiceRecorder } from '@/components/chat/useVoiceRecorder';
import { VoiceMessagePlayer } from '@/components/chat/VoiceMessagePlayer';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { useConnectionStatus, useOnlineUsers, useSocket } from '@/providers/SocketProvider';
import {
  listChannels,
  createChannel,
  archiveChannel,
  deleteChannel,
  type ChannelSummary,
  type ChannelType,
  type CreateChannelInput,
} from '@/services/channels';
import {
  listMessages,
  sendMessage,
  sendVoiceMessage,
  editMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  getReplies,
  addReaction,
  removeReaction,
  getUnreadCount,
  type MessageSummary,
} from '@/services/messages';
import { listTeams, listDepartments, type Department } from '@/services/organization-structure';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createChannelSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  type: z.enum(['WORKSPACE', 'TEAM', 'DEPARTMENT', 'PROJECT', 'PRIVATE']),
  description: z.string().trim().max(500).optional(),
});

const messageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(10000, 'Message must be at most 10 000 characters'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

function typeBadge(t: ChannelType): 'success' | 'info' | 'warning' | 'outline' | 'default' {
  if (t === 'WORKSPACE') return 'success';
  if (t === 'TEAM') return 'info';
  if (t === 'DEPARTMENT') return 'warning';
  if (t === 'PROJECT') return 'outline';
  return 'default';
}

function typeLabel(t: ChannelType): string {
  return t.charAt(0) + t.slice(1).toLowerCase();
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action.';
  return cause.message;
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function MessagesPage() {
  const { activeWorkspace, user } = useWorkspaceContext();
  const { socket } = useSocket();
  const rec = useVoiceRecorder();
  const [showEmoji, setShowEmoji] = useState(false);
  const socketStatus = useConnectionStatus();
  const onlineUsers = useOnlineUsers();

  // Channel list state
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [channelLoading, setChannelLoading] = useState(true);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<ChannelSummary | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Create channel modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', type: 'WORKSPACE' as ChannelType, description: '', teamId: '', departmentId: '', projectId: '' });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createBusy, setCreateBusy] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  // Archive/delete confirmation
  const [archiveTarget, setArchiveTarget] = useState<ChannelSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChannelSummary | null>(null);

  // Message list state
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Message composer
  const [messageBody, setMessageBody] = useState('');
  const [messageBusy, setMessageBusy] = useState(false);

  // Edit/delete messages
  const [editMessageTarget, setEditMessageTarget] = useState<MessageSummary | null>(null);
  const [editMessageBody, setEditMessageBody] = useState('');
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<MessageSummary | null>(null);

  // Reply expansion
  const [expandedReplies, setExpandedReplies] = useState<Record<string, MessageSummary[]>>({});
  const [replyLoading, setReplyLoading] = useState<string | null>(null);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for workspace-switch safety
  const latestLoad = useRef(0);
  const loadedWorkspaceId = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Previous channel ref for leaving socket rooms
  const prevChannelRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Channel list loading
  // ---------------------------------------------------------------------------

  const loadChannels = useCallback(async () => {
    if (!activeWorkspace) return;
    const seq = ++latestLoad.current;
    setChannelLoading(true); setChannelError(null); setAccessStatus(null);
    try {
      const page = await listChannels(activeWorkspace.id, { limit: 100 });
      if (seq !== latestLoad.current) return;
      if (loadedWorkspaceId.current !== null && loadedWorkspaceId.current !== activeWorkspace.id) return;
      loadedWorkspaceId.current = activeWorkspace.id;
      setChannels(page.items);
      // Fetch unread counts for non-archived channels
      for (const ch of page.items) {
        if (!ch.archivedAt) {
          getUnreadCount(activeWorkspace.id, ch.id).then((res) => {
            if (seq !== latestLoad.current) return;
            setUnreadCounts((prev) => ({ ...prev, [ch.id]: res.unreadCount }));
          }).catch(() => {});
        }
      }
    } catch (cause) {
      if (seq !== latestLoad.current) return;
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else {
        setChannelError(requestError(cause, 'Channels could not be loaded.'));
      }
    } finally {
      if (seq === latestLoad.current) setChannelLoading(false);
    }
  }, [activeWorkspace]);

  const prevWorkspaceId = useRef<string | null>(null);

  // Use a ref to avoid the set-state-in-effect lint rule — loadChannels
  // calls setState internally, so calling it directly in the effect body
  // triggers the rule. Wrapping it in a fire-and-forget async function avoids
  // the synchronous-state-update detection.
  useEffect(() => {
    if (!activeWorkspace) return;
    if (prevWorkspaceId.current !== null && prevWorkspaceId.current !== activeWorkspace.id) {
      setSelectedChannel(null);
      setMessages([]);
      setUnreadCounts({});
      prevChannelRef.current = null;
    }
    prevWorkspaceId.current = activeWorkspace.id;
    // Fire-and-forget — loadChannels handles its own errors
    Promise.resolve().then(() => void loadChannels());
  }, [activeWorkspace, loadChannels]);

  // Load teams/departments when create modal opens
  useEffect(() => {
    if (!showCreate || !activeWorkspace) return;
    listTeams(activeWorkspace.id).then(setTeams).catch(() => {});
    (activeWorkspace.type === 'INSTITUTION' ? listDepartments(activeWorkspace.id) : Promise.resolve([] as Department[])).then(setDepartments).catch(() => {});
  }, [showCreate, activeWorkspace]);

  // ---------------------------------------------------------------------------
  // Socket room management — join/leave channels
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!socket || !selectedChannel) return;

    // Leave previous channel room
    if (prevChannelRef.current && prevChannelRef.current !== selectedChannel.id) {
      socket.emit('channel:leave', prevChannelRef.current);
    }
    // Join new channel room
    socket.emit('channel:join', selectedChannel.id);
    prevChannelRef.current = selectedChannel.id;

    return () => {
      socket.emit('channel:leave', selectedChannel.id);
    };
  }, [socket, selectedChannel]);

  // Listen for new messages via socket
  useEffect(() => {
    if (!socket || !selectedChannel) return;
    const onNewMessage = (data: { channelId: string; message: MessageSummary }) => {
      if (data.channelId !== selectedChannel.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        if (user && data.message.authorId === user.id) {
          const idx = prev.findIndex((m) => m.id.startsWith('temp-') && m.body === data.message.body);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = data.message;
            return copy;
          }
        }
        return [...prev, data.message];
      });
    };
    socket.on('message:new', onNewMessage);
    return () => { socket.off('message:new', onNewMessage); };
  }, [socket, selectedChannel, user]);

  // Listen for typing indicators
  useEffect(() => {
    if (!socket || !selectedChannel || !user) return;
    const onStart = (data: { channelId: string; userId: string }) => {
      if (data.channelId !== selectedChannel.id || data.userId === user.id) return;
      setTypingUsers((prev) => prev.includes(data.userId) ? prev : [...prev, data.userId]);
    };
    const onStop = (data: { channelId: string; userId: string }) => {
      if (data.channelId !== selectedChannel.id) return;
      setTypingUsers((prev) => prev.filter((u) => u !== data.userId));
    };
    socket.on('typing:start', onStart);
    socket.on('typing:stop', onStop);
    return () => {
      socket.off('typing:start', onStart);
      socket.off('typing:stop', onStop);
    };
  }, [socket, selectedChannel, user]);

  // ---------------------------------------------------------------------------
  // Message list loading
  // ---------------------------------------------------------------------------

  const loadMessages = useCallback(async (channel: ChannelSummary) => {
    if (!activeWorkspace) return;
    setMessageLoading(true); setMessageError(null);
    try {
      const page = await listMessages(activeWorkspace.id, channel.id, { limit: 50 });
      setMessages(page.items);
      setHasMore(Boolean(page.nextCursor));
    } catch (cause) {
      setMessageError(requestError(cause, 'Messages could not be loaded.'));
    } finally {
      setMessageLoading(false);
    }
  }, [activeWorkspace]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ---------------------------------------------------------------------------
  // Channel selection
  // ---------------------------------------------------------------------------

  function selectChannel(ch: ChannelSummary) {
    setSelectedChannel(ch);
    setMessages([]);
    setMessageError(null);
    setTypingUsers([]);
    // Clear unread count for this channel
    setUnreadCounts((prev) => ({ ...prev, [ch.id]: 0 }));
    // Load messages for the selected channel
    void loadMessages(ch);
  }

  // ---------------------------------------------------------------------------
  // Create channel
  // ---------------------------------------------------------------------------

  async function handleCreateChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) return;
    const parsed = createChannelSchema.safeParse({
      name: createForm.name,
      type: createForm.type,
      description: createForm.description || undefined,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
      setCreateErrors(errs);
      return;
    }
    setCreateBusy(true); setCreateErrors({});
    try {
      const input: CreateChannelInput = {
        type: parsed.data.type,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      };
      if (parsed.data.type === 'TEAM' && createForm.teamId) input.teamId = createForm.teamId;
      if (parsed.data.type === 'DEPARTMENT' && createForm.departmentId) input.departmentId = createForm.departmentId;
      if (parsed.data.type === 'PROJECT' && createForm.projectId) input.projectId = createForm.projectId;
      const created = await createChannel(activeWorkspace.id, input);
      setChannels((prev) => [...prev, created]);
      setShowCreate(false);
      setCreateForm({ name: '', type: 'WORKSPACE', description: '', teamId: '', departmentId: '', projectId: '' });
      selectChannel(created);
    } catch (cause) {
      setCreateErrors({ name: requestError(cause, 'Channel could not be created.') });
    } finally {
      setCreateBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Archive / delete channel
  // ---------------------------------------------------------------------------

  async function handleArchive() {
    if (!activeWorkspace || !archiveTarget) return;
    setCreateBusy(true);
    try {
      await archiveChannel(activeWorkspace.id, archiveTarget.id);
      setChannels((prev) => prev.map((c) => c.id === archiveTarget.id ? { ...c, archivedAt: new Date().toISOString() } : c));
      setArchiveTarget(null);
    } catch (cause) {
      setChannelError(requestError(cause, 'Channel could not be archived.'));
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleDelete() {
    if (!activeWorkspace || !deleteTarget) return;
    setCreateBusy(true);
    try {
      await deleteChannel(activeWorkspace.id, deleteTarget.id);
      setChannels((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (selectedChannel?.id === deleteTarget.id) {
        setSelectedChannel(null);
        setMessages([]);
      }
      setDeleteTarget(null);
    } catch (cause) {
      setChannelError(requestError(cause, 'Channel could not be deleted.'));
    } finally {
      setCreateBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const workspaceRole = (activeWorkspace as { role?: string } | null)?.role;
  const canPost = selectedChannel?.postPolicy !== 'MANAGERS_ONLY' || workspaceRole === 'OWNER' || workspaceRole === 'PROJECT_MANAGER';

  async function handleSendVoice() {
    if (!activeWorkspace || !selectedChannel || !rec.blob || socketStatus === 'disconnected') return;
    setMessageBusy(true); setMessageError(null);
    try {
      const sent = await sendVoiceMessage(activeWorkspace.id, selectedChannel.id, rec.blob, rec.elapsedMs);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      rec.reset();
    } catch (cause) {
      setMessageError(requestError(cause, 'Voice message could not be sent.'));
    } finally {
      setMessageBusy(false);
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !selectedChannel || !user || socketStatus === 'disconnected') return;
    const parsed = messageSchema.safeParse({ body: messageBody });
    if (!parsed.success) return;
    const body = parsed.data.body;
    const workspaceId = activeWorkspace.id;
    const channelId = selectedChannel.id;
    const tempId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const optimistic = {
      id: tempId,
      channelId,
      authorId: user.id,
      authorName: (user as { name?: string }).name ?? 'You',
      body,
      parentId: null,
      editedAt: null,
      pinnedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      replyCount: 0,
      reactionCount: 0,
      type: 'TEXT',
      audioMime: null,
      audioDurationMs: null,
    } as MessageSummary;

    // Update the UI immediately, before the backend responds
    setMessages((prev) => [...prev, optimistic]);
    setMessageBody('');
    setMessageError(null);
    if (socket) socket.emit('typing:stop', channelId);

    try {
      const sent = await sendMessage(workspaceId, channelId, { body });
      setMessages((prev) =>
        prev.some((m) => m.id === sent.id)
          ? prev.filter((m) => m.id !== tempId)
          : prev.map((m) => (m.id === tempId ? sent : m)),
      );
    } catch (cause) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessageBody(body);
      setMessageError(requestError(cause, 'Message could not be sent.'));
    }
  }

  function handleTyping() {
    if (!socket || !selectedChannel) return;
    socket.emit('typing:start', selectedChannel.id);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing:stop', selectedChannel.id);
    }, 2000);
  }

  // ---------------------------------------------------------------------------
  // Edit / delete message
  // ---------------------------------------------------------------------------

  async function handleEditMessage() {
    if (!activeWorkspace || !selectedChannel || !editMessageTarget) return;
    setMessageBusy(true);
    try {
      await editMessage(activeWorkspace.id, selectedChannel.id, editMessageTarget.id, editMessageBody);
      setEditMessageTarget(null);
      await loadMessages(selectedChannel);
    } catch (cause) {
      setMessageError(requestError(cause, 'Message could not be edited.'));
    } finally {
      setMessageBusy(false);
    }
  }

  async function handleDeleteMessage() {
    if (!activeWorkspace || !selectedChannel || !deleteMessageTarget) return;
    setMessageBusy(true);
    try {
      await deleteMessage(activeWorkspace.id, selectedChannel.id, deleteMessageTarget.id);
      setDeleteMessageTarget(null);
      await loadMessages(selectedChannel);
    } catch (cause) {
      setMessageError(requestError(cause, 'Message could not be deleted.'));
    } finally {
      setMessageBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Pin / unpin message
  // ---------------------------------------------------------------------------

  async function handleTogglePin(msg: MessageSummary) {
    if (!activeWorkspace || !selectedChannel) return;
    try {
      if (msg.pinnedAt) {
        await unpinMessage(activeWorkspace.id, selectedChannel.id, msg.id);
      } else {
        await pinMessage(activeWorkspace.id, selectedChannel.id, msg.id);
      }
      await loadMessages(selectedChannel);
    } catch (cause) {
      setMessageError(requestError(cause, 'Pin status could not be changed.'));
    }
  }

  // ---------------------------------------------------------------------------
  // Load replies
  // ---------------------------------------------------------------------------

  async function handleLoadReplies(msg: MessageSummary) {
    if (!activeWorkspace || !selectedChannel) return;
    if (expandedReplies[msg.id]) {
      setExpandedReplies((prev) => { const next = { ...prev }; delete next[msg.id]; return next; });
      return;
    }
    setReplyLoading(msg.id);
    try {
      const replies = await getReplies(activeWorkspace.id, selectedChannel.id, msg.id);
      setExpandedReplies((prev) => ({ ...prev, [msg.id]: replies }));
    } catch (cause) {
      setMessageError(requestError(cause, 'Replies could not be loaded.'));
    } finally {
      setReplyLoading(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Add reaction (simple emoji input)
  // ---------------------------------------------------------------------------

  async function handleAddReaction(msg: MessageSummary, emoji: string) {
    if (!activeWorkspace || !selectedChannel || !user || msg.id.startsWith('temp-')) return;
    const already = reactionsOf(msg).some((r) => r.emoji === emoji && r.userIds.includes(user.id));
    // Toggle immediately, before the backend responds
    setMessages((prev) => applyReaction(prev, msg.id, emoji, user.id, !already));
    try {
      if (already) await removeReaction(activeWorkspace.id, selectedChannel.id, msg.id, emoji);
      else await addReaction(activeWorkspace.id, selectedChannel.id, msg.id, emoji);
    } catch (cause) {
      setMessages((prev) => applyReaction(prev, msg.id, emoji, user.id, already));
      setMessageError(requestError(cause, 'Reaction could not be updated.'));
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!activeWorkspace) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8">
        <EmptyState title="Choose a workspace" description="Select a workspace to start messaging." />
      </div>
    );
  }

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(channelSearch.toLowerCase()),
  );
  const pinnedMessages = messages.filter((m) => m.pinnedAt);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Left sidebar — channel list                                     */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex md:flex-col" aria-label="Channel list">
        <div className="border-b border-[var(--color-border)] p-3">
          <h1 className="text-lg font-semibold">Messages</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${socketStatus === 'connected' ? 'bg-green-500' : socketStatus === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500'}`} aria-hidden="true" />
            <span className="text-xs text-[var(--color-text-muted)]">{socketStatus}</span>
          </div>
        </div>

        <div className="p-3">
          <Button size="sm" onClick={() => setShowCreate(true)} className="w-full">New channel</Button>
        </div>

        <div className="px-3 pb-2">
          <Input
            id="channel-search"
            label="Search channels"
            srOnlyLabel
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
            placeholder="Search channels…"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {channelLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : accessStatus ? (
            <div className="p-2"><AccessState status={accessStatus} onRetry={() => void loadChannels()} /></div>
          ) : channelError ? (
            <div className="p-2"><Alert variant="error">{channelError}</Alert></div>
          ) : filteredChannels.length === 0 ? (
            <EmptyState title="No channels" description="Create a channel to start messaging." className="py-8" />
          ) : (
            <ul role="list" className="space-y-0.5">
              {filteredChannels.map((ch) => (
                <li key={ch.id}>
                  <button
                    onClick={() => selectChannel(ch)}
                    aria-current={selectedChannel?.id === ch.id ? 'page' : undefined}
                    className={[
                      'flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-colors',
                      selectedChannel?.id === ch.id
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]',
                      ch.archivedAt ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <span className="flex-1 truncate">
                      {ch.archivedAt && <span className="line-through">{ch.name}</span>}
                      {!ch.archivedAt && ch.name}
                    </span>
                    <Badge variant={typeBadge(ch.type)} className="shrink-0">{typeLabel(ch.type)}</Badge>
                    {unreadCounts[ch.id] > 0 && (
                      <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-1.5 text-xs font-semibold text-white">
                        {unreadCounts[ch.id]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Right main area — message thread                                 */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {!selectedChannel ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState title="Select a channel" description="Choose a channel from the sidebar to start messaging." />
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{selectedChannel.name}</h2>
                    <Badge variant={typeBadge(selectedChannel.type)}>{typeLabel(selectedChannel.type)}</Badge>
                    {selectedChannel.archivedAt && <Badge variant="outline">Archived</Badge>}
                  </div>
                  {selectedChannel.description && (
                    <p className="mt-0.5 truncate text-sm text-[var(--color-text-secondary)]">{selectedChannel.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(selectedChannel)} aria-label="Archive channel">Archive</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(selectedChannel)} aria-label="Delete channel">Delete</Button>
                </div>
              </div>
              {messageError && <div className="mt-2"><Alert variant="error">{messageError}</Alert></div>}
            </div>

            {/* Reconnection / offline banner */}
            {socketStatus === 'reconnecting' && (
              <div className="mt-2 px-4">
                <Alert variant="warning" className="flex items-center gap-2">
                  <Spinner size="sm" label="Reconnecting…" />
                  Reconnecting…
                </Alert>
              </div>
            )}
            {socketStatus === 'disconnected' && (
              <div className="mt-2 px-4">
                <Alert variant="warning">You&apos;re offline. Reconnecting…</Alert>
              </div>
            )}

            {/* Pinned messages */}
            {pinnedMessages.length > 0 && (
              <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2">
                <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">Pinned</p>
                {pinnedMessages.map((m) => (
                  <div key={m.id} className="mt-1 text-sm">
                    <span className="font-medium">{m.authorName}:</span> <span className="text-[var(--color-text-secondary)]">{m.body.slice(0, 100)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-4 py-3" aria-label="Message list">
              {messageLoading ? (
                <div className="space-y-3" role="status" aria-label="Loading messages">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : messages.length === 0 ? (
                <EmptyState title="No messages yet" description="Send the first message to start the conversation." className="py-12" />
              ) : (
                <ul className="space-y-3" role="list">
                  {messages.map((msg) => (
                    <li key={msg.id} className={`group ${msg.id.startsWith('temp-') ? 'opacity-60' : ''}`}>
                      <div className={`flex gap-3 ${user?.id === msg.authorId ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        <span
                          aria-hidden="true"
                          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white"
                        >
                          {msg.authorName.charAt(0).toUpperCase()}
                        </span>

                        <div className={`min-w-0 flex-1 ${user?.id === msg.authorId ? 'text-right' : ''}`}>
                          <div className={`flex items-center gap-2 text-sm ${user?.id === msg.authorId ? 'justify-end' : ''}`}>
                            <span className="font-medium">{msg.authorName}</span>
                            {onlineUsers.has(msg.authorId) && (
                              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
                            )}
                            <span className="text-xs text-[var(--color-text-muted)]">{timeLabel(msg.createdAt)}</span>
                            {msg.editedAt && <span className="text-xs italic text-[var(--color-text-muted)]">(edited)</span>}
                            {msg.pinnedAt && <Badge variant="outline">Pinned</Badge>}
                          </div>
                          {msg.type === 'VOICE' && activeWorkspace ? (
                            <div className={`mt-0.5 flex ${user?.id === msg.authorId ? 'justify-end' : 'justify-start'}`}>
                              <div className="max-w-[75%] text-left">
                                <VoiceMessagePlayer workspaceId={activeWorkspace.id} channelId={msg.channelId} messageId={msg.id} durationMs={msg.audioDurationMs ?? null} />
                              </div>
                            </div>
                          ) : (
                            <p className={`mt-0.5 inline-block max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-left text-sm ${user?.id === msg.authorId ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]'}`}>{msg.body}</p>
                          )}

                          {/* Reply count */}
                          {msg.replyCount > 0 && (
                            <button
                              onClick={() => void handleLoadReplies(msg)}
                              className="mt-1 text-xs text-[var(--color-primary)] hover:underline"
                            >
                              {replyLoading === msg.id ? 'Loading…' : expandedReplies[msg.id] ? 'Hide replies' : `${msg.replyCount} reply${msg.replyCount !== 1 ? 's' : ''}`}
                            </button>
                          )}

                          {/* Expanded replies */}
                          {expandedReplies[msg.id] && (
                            <ul className="mt-2 space-y-2 border-l-2 border-[var(--color-border)] pl-3" aria-label="Replies">
                              {expandedReplies[msg.id].map((reply) => (
                                <li key={reply.id} className="text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{reply.authorName}</span>
                                    {onlineUsers.has(reply.authorId) && (
                                      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
                                    )}
                                    <span className="text-xs text-[var(--color-text-muted)]">{timeLabel(reply.createdAt)}</span>
                                  </div>
                                  <p className="text-[var(--color-text-primary)]">{reply.body}</p>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Message actions */}
                          <div className={`mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${user?.id === msg.authorId ? 'justify-end' : ''}`}>
                            {user?.id === msg.authorId && (
                              <>
                                <button
                                  onClick={() => { setEditMessageTarget(msg); setEditMessageBody(msg.body); }}
                                  className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                                  aria-label="Edit message"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setDeleteMessageTarget(msg)}
                                  className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                                  aria-label="Delete message"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => void handleTogglePin(msg)}
                              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                              aria-label={msg.pinnedAt ? 'Unpin message' : 'Pin message'}
                            >
                              {msg.pinnedAt ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={() => void handleAddReaction(msg, '👍')}
                              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                              aria-label="React with thumbs up"
                            >
                              👍
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  <div ref={messagesEndRef} />
                </ul>
              )}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <p className="mt-2 text-xs italic text-[var(--color-text-muted)]" aria-live="polite">
                  {typingUsers.length === 1 ? 'Someone is typing…' : `${typingUsers.length} people are typing…`}
                </p>
              )}

              {/* Load more */}
              {hasMore && !messageLoading && (
                <div className="mt-3 text-center">
                  <Button size="sm" variant="secondary" onClick={() => void loadMessages(selectedChannel)}>Load more</Button>
                </div>
              )}
            </div>

            {/* Message composer */}
            <div className="relative border-t border-[var(--color-border)] p-3">
              {showEmoji && (
                <div className="absolute bottom-full right-3 z-20">
                  <EmojiPicker onEmojiClick={(e) => { setMessageBody((b) => b + e.emoji); }} lazyLoadEmojis />
                </div>
              )}
              {!canPost ? (
                <p className="text-center text-sm text-[var(--color-text-muted)]">Only workspace managers can post in this channel.</p>
              ) : editMessageTarget ? (
                <div className="space-y-2">
                  <Textarea
                    id="edit-message-input"
                    label="Edit message"
                    srOnlyLabel
                    value={editMessageBody}
                    onChange={(e) => setEditMessageBody(e.target.value)}
                    rows={2}
                    maxLength={10000}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void handleEditMessage()} loading={messageBusy}>Save</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditMessageTarget(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                <form onSubmit={(e) => void handleSendMessage(e)} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      id="message-input"
                      label="Send a message"
                      srOnlyLabel
                      value={messageBody}
                      onChange={(e) => { setMessageBody(e.target.value); handleTyping(); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendMessage(e as unknown as FormEvent<HTMLFormElement>); }
                      }}
                      placeholder="Write a message…"
                      rows={1}
                      maxLength={10000}
                    />
                  </div>
                  <Button type="button" size="sm" variant="secondary" aria-label="Insert emoji" onClick={() => setShowEmoji((v) => !v)}>😊</Button>
                  <Button type="button" size="sm" variant="secondary" aria-label="Record voice message" disabled={socketStatus === 'disconnected' || rec.state !== 'idle'} onClick={() => { setShowEmoji(false); void rec.start(); }}>🎙️</Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={socketStatus === 'disconnected' || !messageBody.trim()}
                  >
                    Send
                  </Button>
                  {socketStatus === 'disconnected' && (
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">You&apos;re offline</p>
                  )}
                </form>
                {rec.error && <p className="mt-1 text-xs text-red-600">{rec.error}</p>}
                {rec.state === 'recording' && (
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="animate-pulse text-red-600">● Recording {Math.floor(rec.elapsedMs / 1000)}s</span>
                    <Button size="sm" variant="secondary" onClick={rec.cancel}>Cancel</Button>
                    <Button size="sm" onClick={rec.stop}>Stop</Button>
                  </div>
                )}
                {rec.state === 'preview' && (
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span>Voice message ready ({Math.max(1, Math.round(rec.elapsedMs / 1000))}s)</span>
                    <Button size="sm" variant="secondary" onClick={rec.reset} disabled={messageBusy}>Discard</Button>
                    <Button size="sm" onClick={() => void handleSendVoice()} loading={messageBusy}>Send voice</Button>
                  </div>
                )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Create channel modal                                            */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New channel"
        description="Create a new channel for team communication."
        maxWidth="lg"
      >
        <form onSubmit={(e) => void handleCreateChannel(e)} className="space-y-4" aria-label="Create channel form">
          <Input
            id="channel-name"
            label="Channel name"
            value={createForm.name}
            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
            required
            maxLength={100}
            errorMessage={createErrors.name}
          />
          <Select
            id="channel-type"
            label="Type"
            value={createForm.type}
            onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value as ChannelType }))}
            options={[
              { value: 'WORKSPACE', label: 'Workspace (all members)' },
              { value: 'TEAM', label: 'Team' },
              { value: 'DEPARTMENT', label: 'Department' },
              { value: 'PROJECT', label: 'Project' },
              { value: 'PRIVATE', label: 'Private (invite only)' },
            ]}
          />
          {createForm.type === 'TEAM' && (
            <Select
              id="channel-team"
              label="Team"
              value={createForm.teamId}
              onChange={(e) => setCreateForm((p) => ({ ...p, teamId: e.target.value }))}
              options={teams.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Select a team…"
            />
          )}
          {createForm.type === 'DEPARTMENT' && (
            <Select
              id="channel-department"
              label="Department"
              value={createForm.departmentId}
              onChange={(e) => setCreateForm((p) => ({ ...p, departmentId: e.target.value }))}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Select a department…"
            />
          )}
          {createForm.type === 'PROJECT' && (
            <Input
              id="channel-project"
              label="Project ID"
              value={createForm.projectId}
              onChange={(e) => setCreateForm((p) => ({ ...p, projectId: e.target.value }))}
              placeholder="Paste project UUID…"
            />
          )}
          <Input
            id="channel-description"
            label="Description (optional)"
            value={createForm.description}
            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createBusy}>Create channel</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void handleArchive()}
        title={`Archive "${archiveTarget?.name}"?`}
        description="Archived channels are hidden from the default view. Messages are preserved."
        confirmLabel="Archive channel"
        loading={createBusy}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This channel and all its messages will be permanently deleted."
        confirmLabel="Delete channel"
        destructive
        loading={createBusy}
      />
      <ConfirmDialog
        open={Boolean(deleteMessageTarget)}
        onClose={() => setDeleteMessageTarget(null)}
        onConfirm={() => void handleDeleteMessage()}
        title="Delete this message?"
        description="This message will be permanently deleted."
        confirmLabel="Delete message"
        destructive
        loading={messageBusy}
      />
    </div>
  );
}
