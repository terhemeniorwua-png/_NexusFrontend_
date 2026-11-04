import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PolicyPage } from '@/components/legal/PolicyPage';
import { legalPolicies } from '@/lib/legal-policies';
import TermsPage from '@/app/terms/page';
import PrivacyPage from '@/app/privacy/page';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

describe('PolicyPage', () => {
  it('renders both public policy routes with the draft warning', () => {
    const { unmount } = render(<TermsPage />);
    expect(screen.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL');
    unmount();

    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL');
  });

  it('renders the Terms draft and clearly marks it for legal review', () => {
    render(<PolicyPage policy={legalPolicies.terms} />);

    expect(screen.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL');
    expect(screen.getByRole('heading', { name: /Additional-seat billing/ })).toBeInTheDocument();
    expect(screen.getByText(/\$0\.50 per additional active seat/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Account deletion — provisional policy; implementation mismatch/ })).toBeInTheDocument();
    expect(screen.getByText(/current backend instead schedules deletion after a 30-day recovery period/i)).toBeInTheDocument();
    expect(screen.getByText(/\[JURISDICTION — REQUIRED LEGAL DECISION\]/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  it('renders the Privacy draft with implementation boundaries and legal placeholders', () => {
    render(<PolicyPage policy={legalPolicies.privacy} />);

    expect(screen.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL');
    expect(screen.getByText(/Paystack hosted checkout collects payment details directly/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Account deletion — provisional policy; implementation mismatch/ })).toBeInTheDocument();
    expect(screen.getByText(/End-to-end encryption has not been verified or claimed/i)).toBeInTheDocument();
    expect(screen.getByText(/\[PRIVACY CONTACT — REQUIRED\]/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  });
});
