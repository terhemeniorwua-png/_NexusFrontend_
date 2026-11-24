import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkloadCard } from './WorkloadCard';

describe('WorkloadCard status labels', () => {
  it('renders shared task status labels, including unknown values', () => {
    render(
      <WorkloadCard
        entries={[{
          userId: 'user-1',
          user: { id: 'user-1', name: 'Alice' },
          statusCounts: { CHANGES_REQUESTED: 1, SOME_NEW_STATUS: 2 },
          total: 3,
        }]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Changes requested')).toBeInTheDocument();
    expect(screen.getByText('Some new status')).toBeInTheDocument();
    expect(screen.queryByText('CHANGES_REQUESTED')).not.toBeInTheDocument();
    expect(screen.queryByText('SOME_NEW_STATUS')).not.toBeInTheDocument();
  });
});
