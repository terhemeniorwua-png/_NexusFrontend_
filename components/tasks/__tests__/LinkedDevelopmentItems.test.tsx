import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LinkedDevelopmentItems } from '../LinkedDevelopmentItems';
import type { TaskDevLink, TaskDevLinkExternalType } from '@/services/dev-integrations';

function makeLink(overrides: Partial<TaskDevLink> = {}): TaskDevLink {
  return {
    id: 'link-1',
    taskId: 'task-1',
    projectId: 'project-1',
    projectRepositoryId: 'repo-1',
    provider: 'GITHUB',
    externalType: 'PULL_REQUEST',
    externalId: '42',
    externalNumber: 42,
    title: 'Fix authentication bug',
    url: 'https://github.com/acme/app/pull/42',
    ref: 'feat/fix-auth',
    headRef: 'feat/fix-auth',
    baseRef: 'main',
    state: 'open',
    repositoryFullName: 'acme/app',
    reviewState: 'APPROVED',
    reviewerLogin: 'alice',
    reviewedAt: '2026-01-02T00:00:00.000Z',
    mergedAt: null,
    effectiveAccessLevel: 'READ',
    linkedById: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderSection(links: TaskDevLink[], overrides: { loading?: boolean; error?: string | null; onRetry?: () => void } = {}) {
  return render(
    <LinkedDevelopmentItems
      links={links}
      loading={overrides.loading ?? false}
      error={overrides.error ?? null}
      onRetry={overrides.onRetry}
    />,
  );
}

describe('LinkedDevelopmentItems', () => {
  it('groups links by BRANCH, PULL_REQUEST and COMMIT in backend order', () => {
    renderSection([
      makeLink({ id: 'c', externalType: 'COMMIT', externalId: 'abc1234', title: 'Refactor parser', headRef: null, baseRef: null, reviewState: null, reviewerLogin: null }),
      makeLink({ id: 'p', externalType: 'PULL_REQUEST' }),
      makeLink({ id: 'b', externalType: 'BRANCH', externalId: 'feature/x', ref: 'feature/x', headRef: null, baseRef: null, reviewState: null, reviewerLogin: null }),
    ]);

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(['Branches', 'Pull requests', 'Commits']);
    expect(screen.getByText(/Branch: feature\/x/)).toBeInTheDocument();
    expect(screen.getByText(/PR #42/)).toBeInTheDocument();
    expect(screen.getByText(/Commit: Refactor parser/)).toBeInTheDocument();
  });

  it.each<TaskDevLinkExternalType>(['BRANCH', 'PULL_REQUEST', 'COMMIT'])(
    'renders a single %s link in its own group',
    (type) => {
      renderSection([makeLink({ externalType: type })]);
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    },
  );

  it('renders only unmasked fields for METADATA, without a link or content', () => {
    // This is the exact masked payload returned for METADATA by listTaskDevLinks.
    renderSection([
      makeLink({
        effectiveAccessLevel: 'METADATA',
        externalId: 'restricted',
        externalNumber: null,
        title: null,
        url: null,
        ref: null,
        headRef: null,
        baseRef: null,
        repositoryFullName: 'Restricted repository',
        reviewState: null,
        reviewerLogin: null,
        reviewedAt: null,
        mergedAt: null,
        state: 'open',
      }),
    ]);

    expect(screen.getByText('Restricted repository')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/Fix authentication bug/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PR #42/)).not.toBeInTheDocument();
    expect(screen.queryByText(/feat\/fix-auth/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reviewed by/)).not.toBeInTheDocument();
    expect(screen.queryByText('Merged')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlink/i })).not.toBeInTheDocument();
  });

  it('shows full details and no controls for READ access', () => {
    renderSection([makeLink({ effectiveAccessLevel: 'READ' })]);

    expect(screen.getByRole('link', { name: /PR #42/ })).toBeInTheDocument();
    expect(screen.getByText(/Fix authentication bug/)).toBeInTheDocument();
    expect(screen.getByText(/feat\/fix-auth → main/)).toBeInTheDocument();
    expect(screen.getByText('Reviewed by alice')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlink/i })).not.toBeInTheDocument();
  });

  it('shows full details and no controls for LINK access', () => {
    renderSection([makeLink({ effectiveAccessLevel: 'LINK', state: 'merged', mergedAt: '2026-01-03T00:00:00.000Z' })]);

    expect(screen.getByRole('link', { name: /PR #42/ })).toBeInTheDocument();
    expect(screen.getByText(/Fix authentication bug/)).toBeInTheDocument();
    expect(screen.getByText('Merged')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlink/i })).not.toBeInTheDocument();
  });

  it('shows full details for a link with no attached repository', () => {
    renderSection([makeLink({ projectRepositoryId: null, effectiveAccessLevel: null })]);
    expect(screen.getByRole('link', { name: /PR #42/ })).toHaveAttribute(
      'href',
      'https://github.com/acme/app/pull/42',
    );
  });

  it('renders the empty state when the backend returns no links', () => {
    renderSection([]);
    expect(screen.getByText(/No development items are linked to this task yet/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders a loading state without counts or placeholders', () => {
    renderSection([], { loading: true });
    expect(screen.getByRole('status', { name: 'Loading linked development items' })).toBeInTheDocument();
    expect(screen.queryByText(/No development items/)).not.toBeInTheDocument();
  });

  it('shows the backend error message with a retry action', () => {
    const onRetry = vi.fn();
    renderSection([], { error: 'Your repository access does not allow this action', onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Your repository access does not allow this action');
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
