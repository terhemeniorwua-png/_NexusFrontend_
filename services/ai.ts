/**
 * services/ai.ts
 *
 * Nexus AI service — covers the AI assistant (Phase 22), Nexus Write (Phase 23),
 * and AI action approval (Phase 24).
 *
 * All routes at /api/v1/ai, forwarded via /api/backend/ai
 *
 * ─── Verified backend contract (2026-11-08) ─────────────────────────────────
 *
 * POST /ai/analyze  (Nexus Write — Phase 23)
 *   body: { text: string, features: string[] }
 *   features: GRAMMAR | SPELLING | CLARITY | TONE | SUMMARY | REWRITE | TRANSLATION
 *   response: { text, suggestions, summary?, rewrite?, message }
 *   NOTE: currently returns a placeholder (AI service not yet connected)
 *
 * POST /ai/query  (AI Assistant — Phase 22)
 *   body: { query: string, workspaceId?: string, context?: string }
 *   response: { query, answer, references, message }
 *   NOTE: currently returns a placeholder (AI service not yet connected)
 *
 * POST /ai/actions/approve  (AI Action Approval — Phase 24)
 *   body: { workspaceId, actionType, payload, approvedAt }
 *   approvedAt: ISO timestamp within last 5 minutes
 *   response: { actionType, executed, message }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalysisFeature =
  | 'GRAMMAR'
  | 'SPELLING'
  | 'CLARITY'
  | 'TONE'
  | 'SUMMARY'
  | 'REWRITE'
  | 'TRANSLATION';

export interface WritingSuggestion {
  type: string;
  original: string;
  suggestion: string;
  explanation?: string;
}

export interface AnalyzeTextResponse {
  text: string;
  suggestions: WritingSuggestion[];
  summary: string | null | undefined;
  rewrite: string | null | undefined;
  message: string;
}

/**
 * An AI-proposed mutation returned with an assistant response. The backend AI
 * contract does not return this field yet; it is optional so the approval
 * surface works unchanged when the Python service starts proposing actions.
 */
export interface AiProposedAction {
  id: string;
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
  proposedAt: string;
}

export interface AiQueryResponse {
  query: string;
  answer: string | null;
  references: Array<{ id: string; type: string; title: string }>;
  message: string;
  proposedActions?: AiProposedAction[];
}

export interface AiActionApprovalInput {
  workspaceId: string;
  actionType: string;
  payload: Record<string, unknown>;
  approvedAt: string;
}

export interface AiActionApprovalResponse {
  actionType: string;
  executed: boolean;
  message: string;
}

/** Health of the in-process AI provider, reported by GET /ai/health. */
export interface AiHealthStatus {
  configured: boolean;
  status: 'up' | 'down';
  latencyMs: number;
  version?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

// ─── API functions ────────────────────────────────────────────────────────────

/** Analyze text for writing assistance (Nexus Write). */
export async function analyzeText(
  text: string,
  features: AnalysisFeature[],
): Promise<AnalyzeTextResponse> {
  const supported = ['SPELLING', 'GRAMMAR', 'PUNCTUATION', 'CLARITY', 'VOCABULARY', 'TONE', 'STYLE'];
  const backendFeatures = features.filter((f) => supported.includes(f));
  const data = await authed<{
    suggestions: {
      category: string;
      original: string;
      replacement: string;
      explanation?: string;
      message?: string;
    }[];
    summary?: string | null;
  }>('/ai/writing/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      ...(backendFeatures.length ? { features: backendFeatures } : {}),
    }),
  });
  return {
    text,
    suggestions: data.suggestions.map((s) => ({
      type: s.category,
      original: s.original,
      suggestion: s.replacement,
      explanation: s.explanation ?? s.message,
    })),
    summary: data.summary ?? null,
    rewrite: null,
    message: 'ok',
  };
}

/** Send a query to the AI assistant. */
export async function queryAI(
  query: string,
  workspaceId?: string,
  _context?: string,
): Promise<AiQueryResponse> {
  const data = await authed<{
    answer: string;
    references: AiQueryResponse['references'];
    conversationId: string;
  }>('/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ...(workspaceId ? { workspaceId } : {}) }),
  });
  return { query, answer: data.answer, references: data.references ?? [], message: 'ok' } as AiQueryResponse;
}

/** Probe the AI provider's health via GET /ai/health. */
export async function getAiHealth(): Promise<AiHealthStatus> {
  return authed<AiHealthStatus>('/ai/health', { method: 'GET' });
}

/** Submit an approved AI action for execution. */
export async function approveAiAction(
  input: AiActionApprovalInput,
): Promise<AiActionApprovalResponse> {
  return authed<AiActionApprovalResponse>('/ai/actions/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
