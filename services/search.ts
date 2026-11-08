/**
 * services/search.ts
 *
 * Global search service for the Nexus platform.
 *
 * Route: GET /api/v1/search  (mounted at /api/v1/search, NOT under /workspaces)
 * Forwarded via: /api/backend/search
 *
 * ─── Verified backend contract (2026-11-08) ─────────────────────────────────
 *
 * GET /search
 *   query: q (required, 1-200 chars)
 *          category ('projects'|'tasks'|'documents'|'files'|'channels'|'meetings'|'all')
 *          workspaceId (UUID, optional — scope to a single workspace)
 *   response: SearchResult[]  (not paginated; max 25 for 'all', 10 per category)
 *
 * SearchResult: { id, type, title, description, workspaceId, createdAt }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchCategory =
  | 'projects' | 'tasks' | 'documents' | 'files'
  | 'channels' | 'meetings' | 'all';

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string | null;
  workspaceId: string;
  createdAt: string;
}

export interface SearchParams {
  q: string;
  category?: SearchCategory;
  workspaceId?: string;
}

// ─── API function ─────────────────────────────────────────────────────────────

/** Search across the user's accessible workspaces. Returns up to 25 results. */
export async function globalSearch(params: SearchParams): Promise<SearchResult[]> {
  const q = new URLSearchParams({ q: params.q });
  if (params.category && params.category !== 'all') q.set('category', params.category);
  if (params.workspaceId) q.set('workspaceId', params.workspaceId);
  return withAuthRetry(() =>
    apiRequest<SearchResult[]>(`/search?${q.toString()}`, { authenticated: true }),
  );
}
