import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrivacyRequestsPage from './page';
import { createPrivacyRequest, getMyPrivacyRequest, listMyPrivacyRequests } from '@/services/privacy-requests';

vi.mock('@/services/privacy-requests', () => ({ createPrivacyRequest: vi.fn(), getMyPrivacyRequest: vi.fn(), listMyPrivacyRequests: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));

describe('PrivacyRequestsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(listMyPrivacyRequests).mockResolvedValue([]); });
  it('submits an access request and displays the returned request', async () => {
    const request = { id: 'request-1', userId: 'user-1', type: 'ACCESS' as const, status: 'SUBMITTED' as const, description: null, targetType: null, targetId: null, reviewedById: null, decisionNote: null, outcome: null, decidedAt: null, completedAt: null, createdAt: '2026-11-05T10:00:00.000Z', updatedAt: '2026-11-05T10:00:00.000Z' };
    vi.mocked(createPrivacyRequest).mockResolvedValue(request);
    const user = userEvent.setup(); render(<PrivacyRequestsPage />);
    await user.click(await screen.findByRole('button', { name: 'Submit request' }));
    await waitFor(() => expect(createPrivacyRequest).toHaveBeenCalledWith({ type: 'ACCESS' }));
    expect(await screen.findByText('Your privacy request was submitted.')).toBeInTheDocument();
    expect(screen.getByText('submitted')).toBeInTheDocument();
  });
  it('loads details from the own-request detail route', async () => {
    const request = { id: 'request-1', userId: 'user-1', type: 'ACCESS' as const, status: 'SUBMITTED' as const, description: 'My data', targetType: null, targetId: null, reviewedById: null, decisionNote: null, outcome: null, decidedAt: null, completedAt: null, createdAt: '2026-11-05T10:00:00.000Z', updatedAt: '2026-11-05T10:00:00.000Z' };
    vi.mocked(listMyPrivacyRequests).mockResolvedValue([request]); vi.mocked(getMyPrivacyRequest).mockResolvedValue(request);
    const user = userEvent.setup(); render(<PrivacyRequestsPage />);
    await user.click(await screen.findByRole('button', { name: 'Details' }));
    expect(await screen.findByText('My data')).toBeInTheDocument();
    expect(getMyPrivacyRequest).toHaveBeenCalledWith('request-1');
  });
});
