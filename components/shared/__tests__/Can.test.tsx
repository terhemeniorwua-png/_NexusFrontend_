import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Can } from '../Can';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  isLoading: false,
}));

vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => ({
    permissions: mocks.permissions,
    isLoading: mocks.isLoading,
    can: (permission: string) => !mocks.isLoading && mocks.permissions.includes(permission),
    canAny: (list: string[]) =>
      !mocks.isLoading && list.some((permission) => mocks.permissions.includes(permission)),
    canAll: (list: string[]) =>
      !mocks.isLoading && list.every((permission) => mocks.permissions.includes(permission)),
  }),
}));

describe('Can', () => {
  beforeEach(() => {
    mocks.permissions = [];
    mocks.isLoading = false;
  });

  it('renders children when the permission is granted', () => {
    mocks.permissions = ['task.create'];
    render(<Can permission="task.create"><button>New task</button></Can>);
    expect(screen.getByRole('button', { name: 'New task' })).toBeInTheDocument();
  });

  it('renders the fallback when the permission is missing', () => {
    render(
      <Can permission="task.create" fallback={<p>Read only</p>}>
        <button>New task</button>
      </Can>,
    );
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeInTheDocument();
    expect(screen.getByText('Read only')).toBeInTheDocument();
  });

  it('renders nothing by default when permission is missing', () => {
    const { container } = render(<Can permission="task.delete"><button>Delete</button></Can>);
    expect(container).toBeEmptyDOMElement();
  });

  it('requires every permission in all mode', () => {
    mocks.permissions = ['task.update'];
    render(
      <Can permission={['task.update', 'task.delete']}>
        <span>Both</span>
      </Can>,
    );
    expect(screen.queryByText('Both')).not.toBeInTheDocument();
  });

  it('accepts any permission in any mode', () => {
    mocks.permissions = ['task.update'];
    render(
      <Can permission={['task.update', 'task.delete']} mode="any">
        <span>Either</span>
      </Can>,
    );
    expect(screen.getByText('Either')).toBeInTheDocument();
  });

  it('hides children while permissions are loading', () => {
    mocks.permissions = ['task.create'];
    mocks.isLoading = true;
    render(<Can permission="task.create"><button>New task</button></Can>);
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeInTheDocument();
  });
});
