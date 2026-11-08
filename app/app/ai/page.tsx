'use client';

import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { ApiRequestError } from '@/lib/api';
import { queryAI, type AiQueryResponse } from '@/services/ai';

// ─── Message types ────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: AiQueryResponse['references'];
  serviceMessage?: string;
  error?: string;
}

function newId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSend() {
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: Message = { id: newId(), role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
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
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errText = err instanceof ApiRequestError ? err.message : 'Request failed. Please try again.';
      setError(errText);
      setMessages((prev) => [...prev, {
        id: newId(),
        role: 'assistant',
        content: '',
        error: errText,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

      <div className="flex flex-col gap-4">
        {/* Conversation */}
        <div
          className="min-h-[320px] max-h-[60vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          aria-label="AI conversation"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <EmptyState
              title="Start a conversation"
              description="Ask a question about your workspace, projects, or tasks. Press Enter or click Send."
            />
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={[
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  ].join(' ')}
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
        <Card className="p-3">
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

        {/* Clear history */}
        {messages.length > 0 && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { setMessages([]); setError(null); }}
              disabled={loading}
            >
              Clear conversation
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
