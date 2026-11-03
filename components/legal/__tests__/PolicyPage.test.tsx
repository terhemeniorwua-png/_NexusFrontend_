import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PolicyPage } from '@/components/legal/PolicyPage';
import { legalPolicies } from '@/lib/legal-policies';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

describe('PolicyPage', () => {
  it('marks Terms content as a placeholder awaiting approval', () => {
    render(<PolicyPage policy={legalPolicies.terms} />);

    expect(screen.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Placeholder — approval pending');
    expect(screen.getAllByText(/approved policy text for this section has not been provided/i)).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  it('marks Privacy content as a placeholder awaiting approval', () => {
    render(<PolicyPage policy={legalPolicies.privacy} />);

    expect(screen.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/not approved legal text/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  });
});
