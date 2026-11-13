'use client';

/**
 * app/app/ai-actions/page.tsx
 *
 * Phase 24 — AI Action Approval and Execution Interfaces.
 *
 * Proposals are supplied by the backend AI response (see
 * `AiQueryResponse.proposedActions`) and held in the ephemeral
 * `lib/ai-action-proposals` store. Nothing is hardcoded: when the AI service
 * has not proposed anything, the page shows an honest empty state.
 *
 * Backend contract (verified):
 * POST /ai/actions/approve
 *   body: { workspaceId, actionType, payload, approvedAt }
 *   approvedAt must be within the last 5 minutes
 *   response: { actionType, executed, message }
 */

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { AiStatusBanner } from '@/components/ai/AiStatusBanner';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { ApiRequestError } from '@/lib/api';
import {
  effectiveAiActionStatus,
  getAiActionProposals,
  subscribeToAiActionProposals,
  updateAiActionProposal,
  clearAiActionProposals,
  type AiActionStatus,
  type ProposedAiAction,
} from '@/lib/ai-action-proposals';
import { approveAiAction } from '@/services/ai';

const ACTION_TYPE_LABELS: Record<string, string> = {
  CREATE_TASK: 'Create a task',
  UPDATE_TASK: 'Update a task',
  CREATE_PROJECT: 'Create a project',
  ASSIGN_TASK: 'Assign a task',
  CREATE_EVENT: 'Create a calendar event',
  UPDATE_EVENT: 'Update a calendar event',
};

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
];

const ACTION_STATUSES: ReadonlyArray<AiActionStatus> = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
];

const STATUS_LABELS: Record<AiActionStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

function statusVariant(status: AiActionStatus): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'error';
    case 'EXPIRED':
      return 'warning';
    default:
      return 'default';
  }
}

export default function AIActionsPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';

  const proposals = useSyncExternalStore(
    subscribeToAiActionProposals,
    getAiActionProposals,
    getAiActionProposals,
  );

  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const workspaceProposals = proposals.filter(
    (proposal) => proposal.workspaceId === workspaceId,
  );
  const displayActions = workspaceProposals.map((proposal) => ({
    ...proposal,
    effectiveStatus: effectiveAiActionStatus(proposal),
  }));

  // Pending proposals first, then resolved ones; most recent first within each group.
  const sortedActions = [...displayActions].sort((a, b) => {
    const aPending = a.effectiveStatus === 'PENDING';
    const bPending = b.effectiveStatus === 'PENDING';
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    return new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime();
  });

  const filteredActions =
    filter === 'ALL'
      ? sortedActions
      : sortedActions.filter((action) => action.effectiveStatus === filter);

  const pendingActions = filteredActions.filter(
    (action) => action.effectiveStatus === 'PENDING',
  );
  const resolvedActions = filteredActions.filter(
    (action) => action.effectiveStatus !== 'PENDING',
  );

  const pendingCount = displayActions.filter(
    (action) => action.effectiveStatus === 'PENDING',
  ).length;
  const resolvedCount = displayActions.length - pendingCount;

  // One count badge per status, reflecting every proposal in this workspace.
  const counts: Record<AiActionStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    EXPIRED: 0,
  };
  for (const action of displayActions) {
    counts[action.effectiveStatus] += 1;
  }

  function handleClearHistory() {
    clearAiActionProposals(workspaceId);
    setClearDialogOpen(false);
  }

  return (
    <PageContainer>
      <PageHeader
        title="AI Action Approvals"
        description="Review and approve AI-proposed actions before they are executed."
      />

      <AiStatusBanner className="mb-4" />

      <Card className="mb-6 border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-4">
        <h2 className="mb-2 font-semibold text-[var(--color-primary)]">How AI action approval works</h2>
        <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
          <li>• AI never silently performs mutations to your workspace data.</li>
          <li>• Every AI-proposed change requires your explicit approval.</li>
          <li>• Approvals expire after 5 minutes for security.</li>
          <li>• The backend independently validates permissions at execution time.</li>
          <li>• Your approval click is not treated as proof of success — the backend confirms.</li>
        </ul>
      </Card>

      {!workspaceId ? (
        <EmptyState
          title="Choose a workspace"
          description="Select a workspace to review AI actions proposed in that workspace."
        />
      ) : displayActions.length === 0 ? (
        <EmptyState
          title="No pending actions"
          description="When the AI assistant proposes actions, they will appear here for your review."
          action={
            <Link className="text-[var(--color-primary)] underline" href="/app/ai">
              Open the AI assistant
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
            <Select
              id="ai-action-status-filter"
              label="Filter by status"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value as StatusFilter);
              }}
              options={STATUS_FILTERS.map(({ value, label }) => ({ value, label }))}
              size="sm"
            />

            <div className="flex flex-wrap gap-1.5 text-sm">
              {ACTION_STATUSES.filter((status) => counts[status] > 0).map((status) => (
                <Badge key={status} variant={statusVariant(status)}>
                  {STATUS_LABELS[status]} {counts[status]}
                </Badge>
              ))}
            </div>

            {resolvedCount > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setClearDialogOpen(true)}>
                Clear history
              </Button>
            )}
          </div>

          {pendingCount > 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {pendingCount} action{pendingCount !== 1 ? 's' : ''} awaiting review
            </p>
          )}

          {filteredActions.length === 0 && (
            <EmptyState
              title="No actions match the selected filter"
              description="Adjust the status filter or approve/reject a pending action to see it here."
            />
          )}

          {filteredActions.length > 0 && (
            <div className="space-y-4">
              {pendingActions.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Pending approval
                  </h2>
                  {pendingActions.map((action) => (
                    <ProposalCard
                      key={action.id}
                      action={action}
                      workspaceId={workspaceId}
                    />
                  ))}
                </section>
              )}

              {resolvedActions.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Action history
                  </h2>
                  {resolvedActions.map((action) => (
                    <ProposalCard
                      key={action.id}
                      action={action}
                      workspaceId={workspaceId}
                    />
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={clearDialogOpen}
        title="Clear action history"
        description="This will remove all AI action proposals for this workspace from the UI. This cannot be undone."
        confirmLabel="Clear history"
        onConfirm={handleClearHistory}
        onClose={() => setClearDialogOpen(false)}
      />
    </PageContainer>
  );
}

function ProposalCard({
  action,
  workspaceId,
}: {
  action: ProposedAiAction & { effectiveStatus: AiActionStatus };
  workspaceId: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--color-text-primary)]">
              {ACTION_TYPE_LABELS[action.actionType] ?? action.actionType}
            </span>
            <Badge variant={statusVariant(action.effectiveStatus)}>
              {action.effectiveStatus}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {action.description}
          </p>

          <div className="mt-2">
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Proposed changes:</p>
            <pre className="mt-1 overflow-auto rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] p-2 text-xs text-[var(--color-text-primary)]">
              {JSON.stringify(action.payload, null, 2)}
            </pre>
          </div>

          {action.executionResult && (
            <div className="mt-3">
              <Alert
                variant={action.executionResult.executed ? 'success' : 'warning'}
                title="Execution result"
                className="text-sm"
              >
                {action.executionResult.message}
              </Alert>
            </div>
          )}

          {action.effectiveStatus === 'EXPIRED' && (
            <p className="mt-2 text-xs text-[var(--color-warning)]">
              This action proposal has expired (5-minute approval window). The AI assistant would
              need to propose it again.
            </p>
          )}
        </div>

        {action.effectiveStatus === 'PENDING' && (
          <ProposalActions action={action} workspaceId={workspaceId} />
        )}
      </div>
    </Card>
  );
}

function ProposalActions({
  action,
  workspaceId,
}: {
  action: ProposedAiAction;
  workspaceId: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (approving) return;
    setApproving(true);
    setError(null);

    try {
      const result = await approveAiAction({
        workspaceId,
        actionType: action.actionType,
        payload: action.payload,
        approvedAt: new Date().toISOString(),
      });
      updateAiActionProposal(action.id, {
        status: 'APPROVED',
        executionResult: { executed: result.executed, message: result.message },
      });
      setConfirmOpen(false);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : 'Approval failed. Please try again.',
      );
    } finally {
      setApproving(false);
    }
  }

  function handleReject() {
    updateAiActionProposal(action.id, { status: 'REJECTED' });
  }

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-2">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { setError(null); setConfirmOpen(true); }}>
          Approve
        </Button>
        <Button size="sm" variant="secondary" onClick={handleReject}>
          Reject
        </Button>
      </div>
      {error && (
        <Alert variant="error" className="max-w-xs">
          {error}
        </Alert>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Approve AI action"
        description={`Approve "${ACTION_TYPE_LABELS[action.actionType] ?? action.actionType}"? The backend will validate your permissions and execute this action.`}
        confirmLabel="Approve and execute"
        onConfirm={() => { void handleApprove(); }}
        onClose={() => { setConfirmOpen(false); setError(null); }}
        loading={approving}
      />
    </div>
  );
}
