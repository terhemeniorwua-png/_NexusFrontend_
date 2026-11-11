'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { ApiRequestError } from '@/lib/api';
import { addAiActionProposals, type ProposedAiAction } from '@/lib/ai-action-proposals';
import { queryAI, type AiQueryResponse } from '@/services/ai';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: AiQueryResponse['references'];
  serviceMessage?: string;
  error?: string;
  timestamp?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

// ─── localStorage persistence ───────────────────────────────────────────────
// Conversations are scoped to the active workspace so history never leaks
// between workspaces (key includes the workspace id).

const CONVERSATIONS_KEY_PREFIX = 'nexus-ai-conversations';

function conversationsKey(workspaceId: string): string {
  return `${CONVERSATIONS_KEY_PREFIX}-${workspaceId}-v1`;
}

function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string'
  );
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.title === 'string' &&
    Array.isArray(c.messages) &&
    c.messages.every(isMessage) &&
    typeof c.updatedAt === 'string'
  );
}

function readConversations(workspaceId: string): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(conversationsKey(workspaceId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isConversation)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeConversations(workspaceId: string, items: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(conversationsKey(workspaceId), JSON.stringify(items));
  } catch {
    // Conversation history is a convenience; storage failures are non-fatal.
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function newId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function messageTimestamp(msg: Message): string {
  if (msg.timestamp) return msg.timestamp;
  // Backward-compat: recover the timestamp embedded in older message ids.
  const parts = msg.id.split('-');
  if (parts.length >= 2) {
    const recovered = new Date(Number(parts[1]));
    if (!Number.isNaN(recovered.getTime())) return formatTime(recovered);
  }
  return formatTime();
}

function conversationTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'New conversation';
  return trimmed.length > 40 ? `${trimmed.slice(0, 37)}...` : trimmed;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposedCount, setProposedCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Messages are derived from the selected conversation so there is a single
  // source of truth that is also persisted to localStorage.
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages: Message[] = activeConversation?.messages ?? [];

  // Load persisted conversations when the active workspace changes.
  // setState is deferred into a microtask callback to avoid cascading renders
  // from synchronous state updates inside an effect body.
  useEffect(() => {
    let active = true;
    const run = async (): Promise<void> => {
      if (!workspaceId) {
        if (active) {
          setConversations([]);
          setActiveConversationId(null);
        }
        return;
      }
      const saved = readConversations(workspaceId);
      if (active) {
        setConversations(saved);
        setActiveConversationId(saved.length > 0 ? saved[0].id : null);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  // Persist conversations whenever they change and a workspace is active.
  useEffect(() => {
    if (!workspaceId) return;
    writeConversations(workspaceId, conversations);
  }, [workspaceId, conversations]);

  function selectConversation(id: string): void {
    setActiveConversationId(id);
    setError(null);
  }

  function startNewConversation(): void {
    setActiveConversationId(null);
    setInput('');
    setError(null);
  }

  async function handleSend() {
    const query = input.trim();
    if (!query || loading) return;

    let targetConversationId = activeConversationId;
    const isNewConversation = !targetConversationId;

    const userMsg: Message = {
      id: newId(),
      role: 'user',
      content: query,
      timestamp: formatTime(),
    };

    if (isNewConversation) {
      const newConversation: Conversation = {
        id: newConversationId(),
        title: conversationTitle(query),
        messages: [userMsg],
        updatedAt: new Date().toISOString(),
      };
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
      targetConversationId = newConversation.id;
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConversationId
            ? { ...c, messages: [...c.messages, userMsg], updatedAt: new Date().toISOString() }
            : c
        )
      );
    }

    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await queryAI(query, workspaceId);
      const assistantMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: response.answer ?? response.message,
        references: response.references,
        serviceMessage: response.answer === null ? response.message : undefined,
        timestamp: formatTime(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConversationId
            ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: new Date().toISOString() }
            : c
        )
      );

      // Queue any actions the backend proposed. The approval surface lives at
      // /app/ai-actions and never executes anything without explicit approval.
      if (workspaceId && response.proposedActions?.length) {
        const proposals: ProposedAiAction[] = response.proposedActions.map((action) => ({
          id: action.id,
          workspaceId,
          actionType: action.actionType,
          description: action.description,
          payload: action.payload,
          proposedAt: action.proposedAt,
          status: 'PENDING',
        }));
        addAiActionProposals(proposals);
        setProposedCount((count) => count + proposals.length);
      }
    } catch (err) {
      const errText = err instanceof ApiRequestError ? err.message : 'Request failed. Please try again.';
      setError(errText);
      const errorMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: '',
        error: errText,
        timestamp: formatTime(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConversationId
            ? { ...c, messages: [...c.messages, errorMsg], updatedAt: new Date().toISOString() }
            : c
        )
      );
    } finally {
      setLoading(false);
      setTimeout(() => {
        // Guard for environments (and test DOMs) where scrollIntoView is not
        // implemented; scrolling is a progressive enhancement only.
        if (typeof bottomRef.current?.scrollIntoView === 'function') {
          bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your workspace, tasks, and documents."
      />

      {/* Service availability notice */}
      <Alert variant="warning" className="mb-4">
        <strong>Preview mode:</strong> The Nexus AI service is not yet connected to a live AI model.
        Responses will acknowledge your query but cannot provide real answers until the Python AI
        service is configured.
      </Alert>

      {proposedCount > 0 && (
        <Alert variant="info" className="mb-4">
          {proposedCount} AI-proposed action{proposedCount !== 1 ? 's' : ''} awaiting your review.{' '}
          <Link className="font-medium underline" href="/app/ai-actions">
            Review AI actions
          </Link>
        </Alert>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Conversation list sidebar */}
        <aside className="w-full lg:w-72 lg:max-w-none flex-shrink-0 flex flex-col gap-2">
          <div className="flex flex-col gap-2 px-4 py-2 sm:px-0 lg:px-4">
            <Button
              onClick={startNewConversation}
              disabled={loading}
              size="sm"
              variant="secondary"
              className="w-full justify-between gap-2"
            >
              New conversation
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 lg:p-4">
            {conversations.length === 0 ? (
              <EmptyState
                title="No conversations yet"
                description="Your recent AI conversations will appear here."
                className="py-4"
              />
            ) : (
              <>
                {conversations.map((conv) => {
                  const isActive = activeConversationId === conv.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => selectConversation(conv.id)}
                      aria-pressed={isActive}
                      className={[
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 border border-transparent',
                        isActive
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] border-[var(--color-border)]',
                      ].join(' ')}
                    >
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{conv.title}</p>
                          <Badge variant="default">{conv.messages.length}</Badge>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {formatTime(new Date(conv.updatedAt))}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </aside>

        {/* Conversation */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            className="min-h-[320px] flex-1 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            aria-label="AI conversation"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <EmptyState
                title="Start a conversation"
                description={
                  activeConversationId
                    ? 'Ask a question about your workspace, projects, or tasks. Press Enter or click Send.'
                    : 'Open a conversation from the list, or start a new one.'
                }
              />
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-1">
                    <div className="w-full">
                      <div className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {messageTimestamp(msg)}
                        </span>
                      </div>
                      <div
                        className={['flex', msg.role === 'user' ? 'justify-end' : 'justify-start'].join(' ')}
                      >
                        <div
                          className={[
                            'max-w-[80%] rounded-[var(--radius-lg)] px-4 py-3 text-sm',
                            msg.role === 'user'
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]',
                          ].join(' ')}
                        >
                          {msg.error ? (
                            <p className="text-[var(--color-error)]">{msg.error}</p>
                          ) : (
                            <>
                              {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                              {msg.serviceMessage && !msg.content && (
                                <p className="italic text-[var(--color-text-muted)]">{msg.serviceMessage}</p>
                              )}
                              {msg.references && msg.references.length > 0 && (
                                <div className="mt-2 border-t border-[var(--color-border)] pt-2">
                                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">References:</p>
                                  <ul className="mt-1 space-y-0.5">
                                    {msg.references.map((ref) => (
                                      <li key={ref.id} className="text-xs text-[var(--color-text-muted)]">
                                        [{ref.type}] {ref.title}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] px-4 py-3">
                      <Spinner className="h-4 w-4" />
                      <span className="text-sm text-[var(--color-text-muted)]">Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <Card className="p-3 mt-4">
            <div className="flex gap-2">
              <Textarea
                id="ai-input"
                label="Your question"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your projects, tasks, or workspace… (Enter to send, Shift+Enter for new line)"
                rows={2}
                disabled={loading}
              />
              <Button
                onClick={() => { void handleSend(); }}
                loading={loading}
                disabled={loading || !input.trim()}
                className="self-end"
                aria-label="Send message"
              >
                Send
              </Button>
            </div>
            {error && <Alert variant="error" className="mt-2">{error}</Alert>}
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
              Results are scoped to your workspace. The AI service may not have access to all resources.
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
