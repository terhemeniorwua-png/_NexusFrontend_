import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No tasks yet" />);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState
        title="No projects"
        description="Create your first project to get started."
      />,
    );
    expect(
      screen.getByText('Create your first project to get started.'),
    ).toBeInTheDocument();
  });

  it('does not render description element when omitted', () => {
    const { container } = render(<EmptyState title="Empty" />);
    // Only one <p> — the title
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('renders icon slot when provided', () => {
    render(
      <EmptyState
        title="Empty"
        icon={<svg data-testid="empty-icon" />}
      />,
    );
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    render(
      <EmptyState
        title="No members"
        action={<button>Invite member</button>}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Invite member' }),
    ).toBeInTheDocument();
  });

  it('does not render action slot when omitted', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('has role=status for screen reader announcement', () => {
    render(<EmptyState title="No results" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('merges additional className', () => {
    const { container } = render(
      <EmptyState title="Empty" className="custom-empty" />,
    );
    expect(container.firstChild).toHaveClass('custom-empty');
  });
});
