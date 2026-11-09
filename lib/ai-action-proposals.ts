/**
 * lib/ai-action-proposals.ts
 *
 * Ephemeral, in-memory store for AI-proposed application actions awaiting the
 * user's explicit approval (Phase 24).
 *
 * Design rules:
 * - Proposals are never persisted. The backend rejects approvals older than
 *   five minutes, so a page refresh legitimately discards stale proposals.
 * - Nothing is fabricated here. Proposals are only added when the backend AI
 *   response contains them (`AiQueryResponse.proposedActions`). Until the
 *   Python AI service is connected, the store stays empty and the approval
 *   surface shows an honest empty state.
 * - The store is intentionally not a global state library: it is a tiny
 *   external store consumed through `useSyncExternalStore`.
 */

export type AiActionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface ProposedAiAction {
  id: string;
  workspaceId: string;
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
  /** ISO timestamp of when the AI proposed the action. */
  proposedAt: string;
  status: AiActionStatus;
  executionResult?: { executed: boolean; message: string };
}

/** The approval window enforced by the backend (`AI_APPROVAL_EXPIRED`). */
export const AI_ACTION_APPROVAL_WINDOW_MS = 5 * 60 * 1000;

let proposals: ProposedAiAction[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** Returns the current snapshot. Stable reference until the store changes. */
export function getAiActionProposals(): ProposedAiAction[] {
  return proposals;
}

/** Subscribe to proposal-store changes. Returns an unsubscribe function. */
export function subscribeToAiActionProposals(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Adds backend-supplied proposals. Duplicate ids are ignored so a repeated
 * response cannot create duplicate approval cards.
 */
export function addAiActionProposals(next: ProposedAiAction[]): void {
  const existing = new Set(proposals.map((proposal) => proposal.id));
  const additions = next.filter((proposal) => !existing.has(proposal.id));
  if (additions.length === 0) return;
  proposals = [...additions, ...proposals];
  emit();
}

export function updateAiActionProposal(
  id: string,
  patch: Partial<Pick<ProposedAiAction, 'status' | 'executionResult'>>,
): void {
  let changed = false;
  proposals = proposals.map((proposal) => {
    if (proposal.id !== id) return proposal;
    changed = true;
    return { ...proposal, ...patch };
  });
  if (changed) emit();
}

/** Removes proposals for one workspace, or every proposal when omitted. */
export function clearAiActionProposals(workspaceId?: string): void {
  const next = workspaceId
    ? proposals.filter((proposal) => proposal.workspaceId !== workspaceId)
    : [];
  if (next.length === proposals.length) return;
  proposals = next;
  emit();
}

/** Returns the effective status, treating stale pending proposals as expired. */
export function effectiveAiActionStatus(
  proposal: ProposedAiAction,
  now: number = Date.now(),
): AiActionStatus {
  if (proposal.status !== 'PENDING') return proposal.status;
  const proposedAt = new Date(proposal.proposedAt).getTime();
  if (Number.isNaN(proposedAt)) return 'EXPIRED';
  return now - proposedAt > AI_ACTION_APPROVAL_WINDOW_MS ? 'EXPIRED' : 'PENDING';
}

/** Test-only reset. Keeps the module isolated between test cases. */
export function resetAiActionProposalsForTests(): void {
  proposals = [];
  emit();
}
