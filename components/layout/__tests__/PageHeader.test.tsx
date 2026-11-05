import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';
import { PageContainer } from '../PageContainer';

describe('PageHeader', () => {
  it('renders the page title as an h1', () => {
    render(<PageHeader title="Projects" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Projects' }),
    ).toBeInTheDocument();
  });

  it('renders description, breadcrumb, and actions', () => {
    render(
      <PageHeader
        title="Projects"
        description="All projects in this workspace"
        breadcrumb={<a href="/workspace">Workspace</a>}
        actions={<button type="button">New project</button>}
      />,
    );

    expect(
      screen.getByText('All projects in this workspace'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workspace' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New project' }),
    ).toBeInTheDocument();
  });

  it('omits optional regions when not provided', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('PageContainer', () => {
  it('renders children inside the standard width and padding', () => {
    render(
      <PageContainer>
        <p>Content</p>
      </PageContainer>,
    );

    const wrapper = screen.getByText('Content').parentElement;
    expect(wrapper).toHaveClass('max-w-6xl');
    expect(wrapper).toHaveClass('mx-auto');
  });

  it('supports a full-width, unpadded layout', () => {
    render(
      <PageContainer width="full" noPadding>
        <p>Content</p>
      </PageContainer>,
    );

    const wrapper = screen.getByText('Content').parentElement;
    expect(wrapper).toHaveClass('max-w-none');
    expect(wrapper).not.toHaveClass('px-4');
  });
});
