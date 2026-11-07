/**
 * services/documents.ts
 *
 * Document collaboration service.
 *
 * All routes are at /api/v1/workspaces/:workspaceId/documents
 * forwarded via /api/backend/workspaces/:workspaceId/documents
 *
 * ─── Verified backend contract (2026-11-07) ────────────────────────────────
 *
 * GET    /workspaces/:wsId/documents          list — {items, nextCursor}
 *   query: cursor?, limit?, projectId?, taskId?, search?
 *
 * POST   /workspaces/:wsId/documents          create — DocumentSummary (201)
 *   body: { title, content?, projectId?, taskId? }
 *
 * GET    /workspaces/:wsId/documents/:docId   get single — DocumentSummary
 *
 * PATCH  /workspaces/:wsId/documents/:docId   update — DocumentSummary
 *   body: { title?, content? } (at least one required)
 *
 * DELETE /workspaces/:wsId/documents/:docId   soft-delete — {ok: true}
 *
 * GET    /workspaces/:wsId/documents/:docId/revisions  revision history
 *   response: Array<{id, authorId, authorName, content, createdAt}>
 *
 * GET    /workspaces/:wsId/documents/:docId/comments   list comments
 *   response: DocumentCommentSummary[]
 *
 * POST   /workspaces/:wsId/documents/:docId/comments   add comment (201)
 *   body: { body: string } (1–10,000 chars)
 *
 * DELETE /workspaces/:wsId/documents/:docId/comments/:commentId   delete comment
 * ─────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentSummary {
  id: string;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  revisionCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCommentSummary {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  body: string;
  editedAt: string | null;
  createdAt: string;
}

export interface DocumentRevision {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ListDocumentsParams {
  cursor?: string;
  limit?: number;
  projectId?: string;
  taskId?: string;
  search?: string;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listDocuments(
  workspaceId: string,
  params: ListDocumentsParams = {},
): Promise<{ items: DocumentSummary[]; nextCursor: string | null }> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.projectId) search.set('projectId', params.projectId);
  if (params.taskId) search.set('taskId', params.taskId);
  if (params.search) search.set('search', params.search);
  const qs = search.toString();
  return authed(`/workspaces/${workspaceId}/documents${qs ? `?${qs}` : ''}`);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createDocument(
  workspaceId: string,
  input: { title: string; content?: string; projectId?: string | null; taskId?: string | null },
): Promise<DocumentSummary> {
  return authed(`/workspaces/${workspaceId}/documents`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ─── Get ──────────────────────────────────────────────────────────────────────

export async function getDocument(
  workspaceId: string,
  documentId: string,
): Promise<DocumentSummary> {
  return authed(`/workspaces/${workspaceId}/documents/${documentId}`);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateDocument(
  workspaceId: string,
  documentId: string,
  input: { title?: string; content?: string },
): Promise<DocumentSummary> {
  return authed(`/workspaces/${workspaceId}/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteDocument(
  workspaceId: string,
  documentId: string,
): Promise<void> {
  await authed(`/workspaces/${workspaceId}/documents/${documentId}`, {
    method: 'DELETE',
  });
}

// ─── Revisions ────────────────────────────────────────────────────────────────

export async function listDocumentRevisions(
  workspaceId: string,
  documentId: string,
): Promise<DocumentRevision[]> {
  const result = await authed<DocumentRevision[] | unknown>(
    `/workspaces/${workspaceId}/documents/${documentId}/revisions`,
  );
  return Array.isArray(result) ? result as DocumentRevision[] : [];
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function listDocumentComments(
  workspaceId: string,
  documentId: string,
): Promise<DocumentCommentSummary[]> {
  const result = await authed<DocumentCommentSummary[] | unknown>(
    `/workspaces/${workspaceId}/documents/${documentId}/comments`,
  );
  return Array.isArray(result) ? result as DocumentCommentSummary[] : [];
}

export async function addDocumentComment(
  workspaceId: string,
  documentId: string,
  body: string,
): Promise<DocumentCommentSummary> {
  return authed(`/workspaces/${workspaceId}/documents/${documentId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function deleteDocumentComment(
  workspaceId: string,
  documentId: string,
  commentId: string,
): Promise<void> {
  await authed(
    `/workspaces/${workspaceId}/documents/${documentId}/comments/${commentId}`,
    { method: 'DELETE' },
  );
}
