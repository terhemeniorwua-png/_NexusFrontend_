import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceSwitcher } from '../WorkspaceSwitcher';
import type { WorkspaceSummary } from '@/types/navigation';

const workspaces: WorkspaceSummary[] = [
  { id: 'ws-1', name: 'Acme Corp', kind: 'company' },
  { id: 'ws-2', name: 'Personal', kind: 'individual' },
];

describe('WorkspaceSwitcher', () => {
  it('shows the active workspace and its kind', () => {
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Switch workspace: Acme Corp/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it('lists workspaces and marks the current one', async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /Switch workspace: Acme Corp/ }),
    );

    expect(screen.getByRole('menu')).toHaveAttribute(
      'aria-label',
      'Switch workspace',
    );
    expect(
      screen.getByRole('menuitem', { name: 'Acme Corp (current)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Personal' }),
    ).toBeInTheDocument();
  });

  it('calls onWorkspaceChange with the selected workspace id', async () => {
    const user = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={onWorkspaceChange}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /Switch workspace: Acme Corp/ }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Personal' }));

    expect(onWorkspaceChange).toHaveBeenCalledWith('ws-2');
  });

  it('keeps the workspace name accessible when collapsed', () => {
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId="ws-1"
        onWorkspaceChange={vi.fn()}
        collapsed
      />,
    );

    expect(
      screen.getByRole('button', { name: /Switch workspace: Acme Corp/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Company')).not.toBeInTheDocument();
  });

  it('renders a safe empty state when no workspaces are available', () => {
    render(
      <WorkspaceSwitcher
        workspaces={[]}
        activeWorkspaceId=""
        onWorkspaceChange={vi.fn()}
      />,
    );

    expect(screen.getByText('No workspace')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
