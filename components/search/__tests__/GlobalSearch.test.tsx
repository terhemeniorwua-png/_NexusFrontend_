/**
 * components/search/__tests__/GlobalSearch.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearch } from '../GlobalSearch';

vi.mock('@/services/search', () => ({
  globalSearch: vi.fn(),
}));
import { globalSearch } from '@/services/search';
const mockSearch = vi.mocked(globalSearch);

function fakeResult(overrides: Partial<{ id: string; type: string; title: string }> = {}) {
  return {
    id: 'r-1',
    type: 'project',
    title: 'Alpha Project',
    description: 'A great project',
    workspaceId: 'ws-1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSearch.mockResolvedValue([]);
  });

  it('renders nothing when closed', () => {
    render(<GlobalSearch open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the search dialog when open', () => {
    render(<GlobalSearch open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Global search' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search query' })).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GlobalSearch open={true} onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GlobalSearch open={true} onClose={onClose} />);

    // Click the backdrop (first element with aria-hidden)
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows category filter buttons', () => {
    render(<GlobalSearch open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('calls globalSearch after debounce when user types 2+ chars', async () => {
    const user = userEvent.setup();
    render(<GlobalSearch open={true} onClose={vi.fn()} />);

    await user.type(screen.getByRole('searchbox'), 'te');
    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'te' }),
    ), { timeout: 1000 });
  });

  it('shows search results after a successful query', async () => {
    mockSearch.mockResolvedValue([fakeResult({ title: 'Alpha Project' })]);
    const user = userEvent.setup();
    render(<GlobalSearch open={true} onClose={vi.fn()} workspaceId="ws-1" />);

    await user.type(screen.getByRole('searchbox'), 'alpha');
    expect(await screen.findByText('Alpha Project', {}, { timeout: 1000 })).toBeInTheDocument();
  });

  it('shows no-results message when search returns empty', async () => {
    mockSearch.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<GlobalSearch open={true} onClose={vi.fn()} />);

    await user.type(screen.getByRole('searchbox'), 'xyz');
    await waitFor(() => expect(screen.getByText(/No results for/)).toBeInTheDocument(), { timeout: 1000 });
  });

  it('shows hint text before search is performed', () => {
    render(<GlobalSearch open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Type at least 2 characters/)).toBeInTheDocument();
  });
});
