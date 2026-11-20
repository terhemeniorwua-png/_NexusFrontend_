import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskWorkspaceHeader, type SaveSyncState } from '../TaskWorkspaceHeader';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

function renderHeader(saveState: SaveSyncState) {
  return render(
    <TaskWorkspaceHeader
      workspaceName="Acme"
      projectId="project-1"
      projectName="Alpha"
      taskTitle="Fix authentication"
      status="CHANGES_REQUESTED"
      saveState={saveState}
    />,
  );
}

describe('TaskWorkspaceHeader', () => {
  it('renders breadcrumbs, task title, and status', () => {
    renderHeader('idle');

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('href', '/app/projects/project-1');
    expect(screen.getByRole('heading', { name: 'Fix authentication' })).toBeInTheDocument();
    expect(screen.getByText('Changes requested')).toBeInTheDocument();
  });

  it.each([
    ['saving', 'Saving…'],
    ['saved', 'Saved'],
    ['failed', 'Failed'],
    ['conflict', 'Conflict'],
  ] as const)('shows the %s sync state', (saveState, expected) => {
    renderHeader(saveState);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('does not show a sync label in the idle state', () => {
    renderHeader('idle');
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});
