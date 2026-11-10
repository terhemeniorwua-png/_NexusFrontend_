/**
 * services/audit.ts
 *
 * Workspace audit log service.
 *
 * Route: GET /api/v1/workspaces/:workspaceId/audit
 * Forwarded via /api/backend/workspaces/:workspaceId/audit
 *
 * ─── Verified backend contract (2026-11-09) ─────────────────────────────────
 *
 * GET /workspaces/:wsId/audit
 *   query: cursor? (uuid), limit? (1-100, default 25),
 *          actorId? (uuid), action? (partial, case-insensitive),
 *          targetType? (exact)
 *   response: { items: AuditLogEntry[], nextCursor: string | null }
 *
 * Access: workspace OWNER or PROJECT_MANAGER only. Other members receive 403.
 * Audit records are read-only: the backend exposes no update or delete route.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLogActor {
  id: string;
  name: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actor: AuditLogActor | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  nextCursor: string | null;
}

export interface ListAuditLogsParams {
  cursor?: string;
  limit?: number;
  actorId?: string;
  action?: string;
  targetType?: string;
}

// ─── API function ─────────────────────────────────────────────────────────────

/** List workspace audit entries. Requires the OWNER or PROJECT_MANAGER role. */
export async function listAuditLogs(
  workspaceId: string,
  params: ListAuditLogsParams = {},
): Promise<AuditLogPage> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.actorId) search.set('actorId', params.actorId);
  if (params.action) search.set('action', params.action);
  if (params.targetType) search.set('targetType', params.targetType);
  const qs = search.toString();
  return withAuthRetry(() =>
    apiRequest<AuditLogPage>(`/workspaces/${workspaceId}/audit${qs ? `?${qs}` : ''}`, {
      authenticated: true,
    }),
  );
}
