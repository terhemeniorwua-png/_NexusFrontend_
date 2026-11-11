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
}));
import { queryAI } from '@/services/ai';
const mockQuery = vi.mocked(queryAI);

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
  });

  it('renders the AI assistant heading', () => {
    render(<AIAssistantPage />);
    expect(screen.getByRole('heading', { name: 'AI Assistant', level: 1 })).toBeInTheDocument();
  });

  it('shows an empty conversation initially', () => {
    render(<AIAssistantPage />);
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });

  it('shows the service availability notice', () => {
    render(<AIAssistantPage />);
    expect(screen.getByText(/Preview mode/)).toBeInTheDocument();
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
