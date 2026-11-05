import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

export interface PrivacyRequest {
  id: string;
  userId: string;
  type: 'ACCESS' | 'CORRECTION' | 'ERASURE' | 'REDACTION';
  status: 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  description: string | null;
  targetType: string | null;
  targetId: string | null;
  reviewedById: string | null;
  decisionNote: string | null;
  outcome: string | null;
  decidedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrivacyRequestInput {
  type: PrivacyRequest['type'];
  description?: string;
  targetType?: 'COMMENT';
  targetId?: string;
}

async function authorizedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  try { return await apiRequest<T>(path, { ...options, authenticated: true }); }
  catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}

export function createPrivacyRequest(input: CreatePrivacyRequestInput): Promise<PrivacyRequest> {
  return authorizedRequest<PrivacyRequest>('/privacy-requests', { method: 'POST', body: JSON.stringify(input) });
}

export function listMyPrivacyRequests(options: { limit?: number; cursor?: string; status?: PrivacyRequest['status'] } = {}): Promise<PrivacyRequest[]> {
  const query = new URLSearchParams();
  if (options.limit !== undefined) query.set('limit', String(options.limit));
  if (options.cursor) query.set('cursor', options.cursor);
  if (options.status) query.set('status', options.status);
  return authorizedRequest<PrivacyRequest[]>(`/privacy-requests/mine${query.size ? `?${query}` : ''}`);
}

export function getMyPrivacyRequest(requestId: string): Promise<PrivacyRequest> {
  return authorizedRequest<PrivacyRequest>(`/privacy-requests/mine/${encodeURIComponent(requestId)}`);
}
