'use client';

/**
 * app/app/ai-actions/page.tsx
 *
 * Phase 24 — AI Action Approval and Execution Interfaces.
 *
 * This page demonstrates the AI action approval workflow. In production,
 * proposed actions would arrive through the AI assistant conversation
 * interface and be displayed here for explicit user approval before execution.
 *
 * Backend contract (verified):
 * POST /ai/actions/approve
 *   body: { workspaceId, actionType, payload, approvedAt }
 *   approvedAt must be within the last 5 minutes
 *   response: { actionType, executed, message }
 */

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { ApiRequestError } from '@/lib/api';
import { approveAiAction } from '@/services/ai';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProposedAction {
  id: string;
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
  proposedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  executionResult?: { executed: boolean; message: string };
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  CREATE_TASK: 'Create a task',
  UPDATE_TASK: 'Update a task',
  CREATE_PROJECT: 'Create a project',
  ASSIGN_TASK: 'Assign a task',
  CREATE_EVENT: 'Create a calendar event',
};

function isExpired(proposedAt: string): boolean {
  return Date.now() - new Date(proposedAt).getTime() > 5 * 60 * 1000;
}

function getStatusVariant(status: ProposedAction['status']): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'error';
    case 'EXPIRED': return 'warning';
    default: return 'default';
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIActionsPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';

  // In production, these would come from the AI assistant conversation context.
  // This demo shows the interface with example proposed actions.
  const [actions, setActions] = useState<ProposedAction[]>([
    {
      id: 'demo-1',
      actionType: 'CREATE_TASK',
      description: 'Create a task "Review Q4 report" in the current project',
      payload: { title: 'Review Q4 report', priority: 'HIGH' },
      proposedAt: new Date().toISOString(),
      status: 'PENDING',
    },
    {
      id: 'demo-2',
      actionType: 'CREATE_EVENT',
      description: 'Schedule a team retrospective meeting for next Monday at 10am',
      payload: {
        title: 'Team Retrospective',
        scheduledAt: 'next Monday 10:00',
      },
      proposedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(), // expired
      status: 'PENDING',
    },
  ]);

  const [approveTarget, setApproveTarget] = useState<ProposedAction | null>(null);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Update expired statuses
  const displayActions = actions.map((a) => ({
    ...a,
    status: a.status === 'PENDING' && isExpired(a.proposedAt)
      ? ('EXPIRED' as const)
      : a.status,
  }));

  async function handleApprove() {
    if (!approveTarget || approving) return;
    setApproving(true);
    setApproveError(null);

    try {
      const result = await approveAiAction({
        workspaceId,
        actionType: approveTarget.actionType,
        payload: approveTarget.payload,
        approvedAt: new Date().toISOString(),
      });
      setActions((prev) => prev.map((a) =>
        a.id === approveTarget.id
          ? { ...a, status: 'APPROVED', executionResult: result }
          : a,
      ));
      setApproveTarget(null);
    } catch (err) {
      setApproveError(
        err instanceof ApiRequestError ? err.message : 'Approval failed. Please try again.',
      );
      setApproving(false);
    } finally {
      setApproving(false);
    }
  }

  function handleReject(action: ProposedAction) {
    setActions((prev) => prev.map((a) =>
      a.id === action.id ? { ...a, status: 'REJECTED' } : a,
    ));
  }

  const pendingCount = displayActions.filter((a) => a.status === 'PENDING').length;

  return (
    <PageContainer>
      <PageHeader
        title="AI Action Approvals"
        description="Review and approve AI-proposed actions before they are executed."
      />

      {/* Architecture note */}
      <Alert variant="warning" className="mb-4">
        <strong>Preview mode:</strong> AI-proposed actions are displayed here for explicit user
        approval. The backend validates permissions and executes only after confirmed approval.
        The Python AI service is not yet connected — this interface shows example proposals.
      </Alert>

      {/* Important rules notice */}
      <Card className="mb-6 p-4 border-[var(--color-primary)] bg-[var(--color-primary-soft)]">
        <h2 className="mb-2 font-semibold text-[var(--color-primary)]">How AI action approval works</h2>
        <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
          <li>• AI never silently performs mutations to your workspace data.</li>
          <li>• Every AI-proposed change requires your explicit approval.</li>
          <li>• Approvals expire after 5 minutes for security.</li>
          <li>• The backend independently validates permissions at execution time.</li>
          <li>• Your approval click is not treated as proof of success — the backend confirms.</li>
        </ul>
      </Card>

      {displayActions.length === 0 ? (
        <EmptyState
          title="No pending actions"
          description="When the AI assistant proposes actions, they will appear here for your review."
        />
      ) : (
        <div className="space-y-4">
          {pendingCount > 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {pendingCount} action{pendingCount !== 1 ? 's' : ''} awaiting review
            </p>
          )}

          {displayActions.map((action) => (
            <Card key={action.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {ACTION_TYPE_LABELS[action.actionType] ?? action.actionType}
                    </span>
                    <Badge variant={getStatusVariant(action.status)}>{action.status}</Badge>
                  </div>

                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {action.description}
                  </p>

                  {/* Payload */}
                  <div className="mt-2">
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">Proposed changes:</p>
                    <pre className="mt-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] p-2 text-xs text-[var(--color-text-primary)] overflow-auto">
                      {JSON.stringify(action.payload, null, 2)}
                    </pre>
                  </div>

                  {/* Execution result */}
                  {action.executionResult && (
                    <div className="mt-2">
                      <Alert variant={action.executionResult.executed ? 'success' : 'warning'}>
                        {action.executionResult.message}
                      </Alert>
                    </div>
                  )}

                  {/* Expired note */}
                  {action.status === 'EXPIRED' && (
                    <p className="mt-2 text-xs text-[var(--color-warning)]">
                      This action proposal has expired (5-minute approval window). The AI assistant
                      would need to propose it again.
                    </p>
                  )}
                </div>

                {action.status === 'PENDING' && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => { setApproveTarget(action); setApproveError(null); }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReject(action)}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {approveError && (
        <Alert variant="error" className="mt-4">{approveError}</Alert>
      )}

      <ConfirmDialog
        open={!!approveTarget}
        title="Approve AI action"
        description={`Approve "${approveTarget ? (ACTION_TYPE_LABELS[approveTarget.actionType] ?? approveTarget.actionType) : ''}"? The backend will validate your permissions and execute this action.`}
        confirmLabel="Approve and execute"
        onConfirm={() => { void handleApprove(); }}
        onClose={() => { setApproveTarget(null); setApproveError(null); }}
        loading={approving}
      />
    </PageContainer>
  );
}
