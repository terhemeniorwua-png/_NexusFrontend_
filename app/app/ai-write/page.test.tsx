/**
 * app/app/ai-write/page.test.tsx
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NexusWritePage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/ai-write',
}));

vi.mock('@/services/ai', () => ({
  analyzeText: vi.fn(),
  getAiHealth: vi.fn(),
}));
import { analyzeText, getAiHealth, type AiHealthStatus } from '@/services/ai';
const mockAnalyze = vi.mocked(analyzeText);
const mockGetAiHealth = vi.mocked(getAiHealth);

describe('NexusWritePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAnalyze.mockResolvedValue({
      text: 'hello world',
      suggestions: [],
      summary: undefined,
      rewrite: undefined,
      message: 'AI service not yet configured.',
    });
    // Healthy provider by default: no banner is shown.
    mockGetAiHealth.mockResolvedValue({
      configured: true,
      status: 'up',
      latencyMs: 10,
    } as AiHealthStatus);
  });

  it('renders the Nexus Write heading', () => {
    render(<NexusWritePage />);
    expect(screen.getByRole('heading', { name: 'Nexus Write', level: 1 })).toBeInTheDocument();
  });

  it('shows no banner when the AI provider is healthy', () => {
    mockGetAiHealth.mockResolvedValue({
      configured: true,
      status: 'up',
      latencyMs: 10,
    } as AiHealthStatus);
    render(<NexusWritePage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows "AI is not enabled on this server" when not configured', async () => {
    mockGetAiHealth.mockResolvedValue({
      configured: false,
      status: 'down',
      latencyMs: 0,
    } as AiHealthStatus);
    render(<NexusWritePage />);
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
    render(<NexusWritePage />);
    expect(
      await screen.findByText('The AI service is temporarily unavailable.'),
    ).toBeInTheDocument();
  });

  it('shows "temporarily unavailable" when the health request fails', async () => {
    mockGetAiHealth.mockRejectedValue(new Error('network down'));
    render(<NexusWritePage />);
    expect(
      await screen.findByText('The AI service is temporarily unavailable.'),
    ).toBeInTheDocument();
  });

  it('renders feature checkboxes', () => {
    render(<NexusWritePage />);
    expect(screen.getByRole('checkbox', { name: 'Grammar' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Spelling' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Summarise' })).toBeInTheDocument();
  });

  it('Grammar and Spelling are checked by default', () => {
    render(<NexusWritePage />);
    expect(screen.getByRole('checkbox', { name: 'Grammar' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Spelling' })).toBeChecked();
  });

  it('Analyse button is disabled when text is empty', () => {
    render(<NexusWritePage />);
    expect(screen.getByRole('button', { name: 'Analyse' })).toBeDisabled();
  });

  it('calls analyzeText with text and selected features', async () => {
    const user = userEvent.setup();
    render(<NexusWritePage />);

    const textarea = screen.getByRole('textbox', { name: 'Text to analyse' });
    await user.type(textarea, 'Hello world');
    await user.click(screen.getByRole('button', { name: 'Analyse' }));

    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledWith(
      'Hello world',
      expect.arrayContaining(['GRAMMAR', 'SPELLING']),
    ));
  });

  it('shows the service message after analysis', async () => {
    const user = userEvent.setup();
    render(<NexusWritePage />);

    await user.type(screen.getByRole('textbox', { name: 'Text to analyse' }), 'Hello world');
    await user.click(screen.getByRole('button', { name: 'Analyse' }));

    expect(await screen.findByText('AI service not yet configured.')).toBeInTheDocument();
  });

  it('shows empty state before analysis', () => {
    render(<NexusWritePage />);
    expect(screen.getByText('No analysis yet')).toBeInTheDocument();
  });

  it('shows error when analysis fails', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mockAnalyze.mockRejectedValue(new ApiRequestError('Service unavailable', 503));
    const user = userEvent.setup();
    render(<NexusWritePage />);

    await user.type(screen.getByRole('textbox', { name: 'Text to analyse' }), 'Test');
    await user.click(screen.getByRole('button', { name: 'Analyse' }));

    expect(await screen.findByText('Service unavailable')).toBeInTheDocument();
  });

  it('applies a suggestion only after the user accepts it', async () => {
    mockAnalyze.mockResolvedValue({
      text: 'helo world',
      suggestions: [
        { type: 'SPELLING', original: 'helo', suggestion: 'hello', explanation: 'Misspelling' },
      ],
      summary: undefined,
      rewrite: undefined,
      message: 'Analysis complete.',
    });
    const user = userEvent.setup();
    render(<NexusWritePage />);

    const textarea = screen.getByRole('textbox', { name: 'Text to analyse' });
    await user.type(textarea, 'helo world');
    await user.click(screen.getByRole('button', { name: 'Analyse' }));

    // Nothing is rewritten before the user accepts.
    expect(textarea).toHaveValue('helo world');
    await user.click(await screen.findByRole('button', { name: 'Accept' }));

    expect(textarea).toHaveValue('hello world');
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });

  it('dismisses a suggestion without changing the text', async () => {
    mockAnalyze.mockResolvedValue({
      text: 'helo world',
      suggestions: [
        { type: 'SPELLING', original: 'helo', suggestion: 'hello' },
      ],
      summary: undefined,
      rewrite: undefined,
      message: 'Analysis complete.',
    });
    const user = userEvent.setup();
    render(<NexusWritePage />);

    const textarea = screen.getByRole('textbox', { name: 'Text to analyse' });
    await user.type(textarea, 'helo world');
    await user.click(screen.getByRole('button', { name: 'Analyse' }));
    await user.click(await screen.findByRole('button', { name: 'Dismiss' }));

    expect(textarea).toHaveValue('helo world');
    expect(screen.queryByText('helo')).not.toBeInTheDocument();
    expect(screen.getByText('All suggestions have been dismissed or accepted.')).toBeInTheDocument();
  });

  it('sends only the selected text when selection-only is enabled', async () => {
    const user = userEvent.setup();
    render(<NexusWritePage />);

    const textarea = screen.getByRole('textbox', { name: 'Text to analyse' }) as HTMLTextAreaElement;
    await user.type(textarea, 'Keep this. fixme here.');
    textarea.setSelectionRange(11, 16);
    fireEvent.select(textarea);

    await user.click(screen.getByRole('checkbox', { name: 'Analyse selected text only' }));
    await user.click(screen.getByRole('button', { name: 'Analyse' }));

    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledWith(
      'fixme',
      expect.arrayContaining(['GRAMMAR', 'SPELLING']),
    ));
  });
});
