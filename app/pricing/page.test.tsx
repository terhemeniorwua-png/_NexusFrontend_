import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PricingPage from './page';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

describe('PricingPage', () => {
  it('shows pending availability without offering prices, seat limits, or checkout', () => {
    render(<PricingPage />);

    expect(screen.getByRole('heading', { name: 'Plan availability', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Paid plans unavailable')).toBeInTheDocument();
    expect(screen.getByText(/No price, seat allowance, checkout, or trial enrollment is offered here/i)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /subscribe|checkout|start trial/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/\$\s?\d/)).not.toBeInTheDocument();
  });
});
