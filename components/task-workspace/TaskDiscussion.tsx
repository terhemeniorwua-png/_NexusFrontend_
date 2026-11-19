'use client';

import { useEffect, useState } from 'react';
import { MentionTextarea, extractMentionIds, type MentionMember } from '@/components/ui/MentionTextarea';
import { listProjectMembers } from '@/services/projects';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { PermissionButton } from '@/components/shared/PermissionButton';
import type { TaskComment } from '@/services/tasks';

export function TaskDiscussion({
  comments,
  loading,
  error,
  onAdd,
  onDelete,
  canDelete,
  busy,
  workspaceId,
  projectId,
}: {
  comments: TaskComment[];
  loading: boolean;
  error: string | null;
  onAdd: (body: string, mentionedUserIds: string[]) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
  canDelete: (comment: TaskComment) => boolean;
  busy: boolean;
  workspaceId?: string;
  projectId?: string;
}) {
  const [body, setBody] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [members, setMembers] = useState<MentionMember[]>([]);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    let active = true;
    listProjectMembers(workspaceId, projectId)
      .then((list) => { if (active) setMembers(list.map((m) => ({ userId: m.userId, name: m.user.name }))); })
      .catch(() => { if (active) setMembers([]); });
    return () => { active = false; };
  }, [workspaceId, projectId]);

  return (
    <section aria-labelledby="discussion-heading" className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h2 id="discussion-heading" className="mb-3 text-base font-semibold">Discussion</h2>
        {error || localError ? <Alert variant="error" title="Discussion error">{localError ?? error}</Alert> : null}
        <div className="mb-4 space-y-2">
          <MentionTextarea id="task-comment" ariaLabel="Add a comment" value={body} onChange={setBody} members={members} placeholder="Write a comment… type @ to mention" rows={3} />
          <div className="flex justify-end">
            {body.trim() ? (
              <PermissionButton
                permission="task.comment"
                size="sm"
                loading={busy}
                onClick={async () => {
                  setLocalError(null);
                  try { await onAdd(body.trim(), extractMentionIds(body, members)); setBody(''); } catch (e) { setLocalError(e instanceof Error ? e.message : 'Could not add comment.'); }
                }}
              >
                Comment
              </PermissionButton>
            ) : (
              <Button size="sm" disabled>Comment</Button>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">Type @ to mention a project member. They will be notified.</p>
        </div>
        {loading ? <p className="text-sm text-[var(--color-text-secondary)]">Loading comments…</p> : null}
        {!loading && comments.length === 0 ? (
          <EmptyState title="No comments yet" description="Start the discussion for this task." />
        ) : (
          <ul className="space-y-3" role="list">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{comment.author?.name ?? 'User'}</span>
                    <span className="ml-2 text-xs text-[var(--color-text-secondary)]">{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  {canDelete(comment) ? (
                    <Button size="sm" variant="secondary" onClick={() => void onDelete(comment.id)} disabled={busy}>Delete</Button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
