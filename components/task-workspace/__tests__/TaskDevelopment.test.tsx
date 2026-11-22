import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskDevelopment } from '../TaskDevelopment';
import type { LinkedProjectRepository, TaskDevLink } from '@/services/dev-integrations';

const repo: LinkedProjectRepository = {
  id: 'repo-1',
  projectId: 'proj-1',
  connectionId: 'conn-1',
  provider: 'GITHUB',
  externalRepoId: 'ext-1',
  fullName: 'acme/app',
  defaultBranch: 'main',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeLink(overrides: Partial<TaskDevLink> = {}): TaskDevLink {
  return {
    id: 'link-1',
    taskId: 'task-1',
    projectId: 'proj-1',
    projectRepositoryId: 'repo-1',
    provider: 'GITHUB',
    externalType: 'PULL_REQUEST',
    externalId: 'pr-1',
    externalNumber: 42,
    title: 'Fix bug',
    url: 'https://github.com/acme/app/pull/42',
    ref: 'feat/fix',
    headRef: 'feat/fix',
    baseRef: 'main',
    state: 'open',
    repositoryFullName: 'acme/app',
    linkedById: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderDev(links: TaskDevLink[], canLink = false) {
  return render(
    <TaskDevelopment
      linkedRepos={[repo]}
      devLinks={links}
      loading={false}
      error={null}
      canLink={canLink}
      busy={false}
      onReload={vi.fn()}
      onLoadBranches={vi.fn(async () => [])}
      onLoadPullRequests={vi.fn(async () => [])}
      onLink={vi.fn(async () => {})}
      onUnlink={vi.fn(async () => {})}
    />,
  );
}

describe('TaskDevelopment', () => {
  it('shows approved review badge with reviewer and relative time', () => {
    renderDev([makeLink({ reviewState: 'APPROVED', reviewerLogin: 'alice', reviewedAt: new Date(Date.now() - 60_000).toISOString() })]);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/Reviewed by alice/)).toBeInTheDocument();
  });

  it('shows changes requested review badge', () => {
    renderDev([makeLink({ reviewState: 'CHANGES_REQUESTED', reviewerLogin: 'bob', reviewedAt: '2026-01-01T00:00:00.000Z' })]);
    expect(screen.getByText('Changes requested')).toBeInTheDocument();
    expect(screen.getByText(/Reviewed by bob/)).toBeInTheDocument();
  });

  it('shows commented review badge', () => {
    renderDev([makeLink({ reviewState: 'COMMENTED', reviewerLogin: 'carol', reviewedAt: '2026-01-01T00:00:00.000Z' })]);
    expect(screen.getByText('Commented')).toBeInTheDocument();
  });

  it('renders nothing for unknown or missing review values', () => {
    renderDev([makeLink({ reviewState: 'SOMETHING_NEW', reviewerLogin: null, reviewedAt: null })]);
    expect(screen.queryByText('Approved')).not.toBeInTheDocument();
    expect(screen.queryByText('Changes requested')).not.toBeInTheDocument();
    expect(screen.queryByText('Commented')).not.toBeInTheDocument();
    expect(screen.queryByText(/Reviewed by/)).not.toBeInTheDocument();
  });

  it('shows merged clearly when state is merged', () => {
    renderDev([makeLink({ state: 'merged', mergedAt: '2026-01-02T00:00:00.000Z' })]);
    expect(screen.getAllByText('Merged').length).toBeGreaterThan(0);
    expect(screen.getByText(/PR #42/)).toBeInTheDocument();
  });

  it('renders restricted placeholder for links with no url and no repositoryFullName', () => {
    renderDev([makeLink({ url: null, repositoryFullName: null, title: 'Secret', headRef: null, baseRef: null })], false);
    expect(screen.getByText('Restricted repository')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Secret/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlink' })).not.toBeInTheDocument();
  });

  it('shows unlink for restricted link when canLink is true', () => {
    renderDev([makeLink({ url: null, repositoryFullName: null, title: 'Secret', headRef: null, baseRef: null })], true);
    expect(screen.getByText('Restricted repository')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument();
  });
});
