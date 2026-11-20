import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TaskProgressTracker } from '../TaskProgressTracker';

describe('TaskProgressTracker', () => {
  it('shows an empty state instead of a 0% bar when there are no subtasks', () => {
    render(<TaskProgressTracker progress={{ percent: 0, completed: 0, total: 0 }} />);
    expect(screen.getByText('No subtasks yet')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders and clamps progress for tasks with subtasks', () => {
    const { rerender } = render(<TaskProgressTracker progress={{ percent: -20, completed: 0, total: 2 }} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0/2 approved (0%)')).toBeInTheDocument();

    rerender(<TaskProgressTracker progress={{ percent: 140, completed: 2, total: 2 }} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('2/2 approved (100%)')).toBeInTheDocument();
  });
});
