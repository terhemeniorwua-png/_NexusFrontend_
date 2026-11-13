/**
 * app/app/ai/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AIAssistantPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/ai',
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
  queryAI: vi.fn(),
  getAiHealth: vi.fn(),
}));
import { queryAI, getAiHealth, type AiHealthStatus } from '@/services/ai';
const mockQuery = vi.mocked(queryAI);
const mockGetAiHealth = vi.mocked(getAiHealth);

describe('AIAssistantPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    mockQuery.mockResolvedValue({
      query: 'test',
      answer: null,
      references: [],
      message: 'AI service not yet configured.',
    });
    // Healthy provider by default: no banner is shown.
    mockGetAiHealth.mockResolvedValue({
      configured: true,
      status: 'up',
      latencyMs: 10,
    } as AiHealthStatus);
  });

  it('renders the AI assistant heading', () => {
    render(<AIAssistantPage />);
    expect(screen.getByRole('heading', { name: 'AI Assistant', level: 1 })).toBeInTheDocument();
  });

  it('shows an empty conversation initially', () => {
    render(<AIAssistantPage />);
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });

  it('shows no banner when the AI provider is healthy', () => {
    mockGetAiHealth.mockResolvedValue({
      configured: true,
      status: 'up',
      latencyMs: 10,
    } as AiHealthStatus);
    render(<AIAssistantPage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows "AI is not enabled on this server" when not configured', async () => {
    mockGetAiHealth.mockResolvedValue({
      configured: false,
      status: 'down',
      latencyMs: 0,
    } as AiHealthStatus);
    render(<AIAssistantPage />);
    expect(
      await screen.findByText('AI is not enabled on this server.'),
    ).toBeInTheDocument();
  });

  it('shows "temporarily unavailable" when the provider is down', async () => {
    mockGetAiHealth.mockResolvedValue({
      configured: true,
      status: 'down',
      latencyMs: 0,
    } as AiHealthStatus);
    render(<AIAssistantPage />);
    expect(
      await screen.findByText('The AI service is temporarily unavailable.'),
    ).toBeInTheDocument();
  });

  it('shows "temporarily unavailable" when the health request fails', async () => {
    mockGetAiHealth.mockRejectedValue(new Error('network down'));
    render(<AIAssistantPage />);
    expect(
      await screen.findByText('The AI service is temporarily unavailable.'),
    ).toBeInTheDocument();
  });

  it('shows nothing while the health check is loading', async () => {
    let resolveHealth: ((value: AiHealthStatus) => void) | undefined;
    mockGetAiHealth.mockReturnValue(
      new Promise((resolve) => {
        resolveHealth = resolve;
      }),
    );
    render(<AIAssistantPage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    resolveHealth!({ configured: true, status: 'up', latencyMs: 5 });
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
  });

  it('sends a query when Send button is clicked', async () => {
    const user = userEvent.setup();
    render(<AIAssistantPage />);

    const textarea = screen.getByRole('textbox', { name: 'Your question' });
    await user.type(textarea, 'What tasks are assigned to me?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(mockQuery).toHaveBeenCalledWith(
      'What tasks are assigned to me?',
      'ws-1',
    ));
  });

  it('shows user message in the conversation', async () => {
    const user = userEvent.setup();
    render(<AIAssistantPage />);

    await user.type(screen.getByRole('textbox', { name: 'Your question' }), 'How many projects?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    // The message appears in the conversation and as the conversation title.
    expect(screen.getAllByText('How many projects?')).toHaveLength(2);
  });

  it('shows AI response in the conversation', async () => {
    mockQuery.mockResolvedValue({
      query: 'test',
      answer: null,
      references: [],
      message: 'AI service not yet configured.',
    });
    const user = userEvent.setup();
    render(<AIAssistantPage />);

    await user.type(screen.getByRole('textbox', { name: 'Your question' }), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('AI service not yet configured.')).toBeInTheDocument();
  });

  it('shows New conversation button after messages', async () => {
    const user = userEvent.setup();
    render(<AIAssistantPage />);

    await user.type(screen.getByRole('textbox', { name: 'Your question' }), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(
      await screen.findByRole('button', { name: 'New conversation' })
    ).toBeInTheDocument();
  });

  it('clears the conversation when New conversation is clicked', async () => {
    const user = userEvent.setup();
    render(<AIAssistantPage />);

    await user.type(screen.getByRole('textbox', { name: 'Your question' }), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByRole('button', { name: 'New conversation' });

    await user.click(screen.getByRole('button', { name: 'New conversation' }));
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });
});
