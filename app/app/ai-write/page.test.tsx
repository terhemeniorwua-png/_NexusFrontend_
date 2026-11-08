/**
 * app/app/ai-write/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NexusWritePage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/ai-write',
}));

vi.mock('@/services/ai', () => ({
  analyzeText: vi.fn(),
}));
import { analyzeText } from '@/services/ai';
const mockAnalyze = vi.mocked(analyzeText);

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
  });

  it('renders the Nexus Write heading', () => {
    render(<NexusWritePage />);
    expect(screen.getByRole('heading', { name: 'Nexus Write', level: 1 })).toBeInTheDocument();
  });

  it('shows the preview mode notice', () => {
    render(<NexusWritePage />);
    expect(screen.getByText(/Preview mode/)).toBeInTheDocument();
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
});
