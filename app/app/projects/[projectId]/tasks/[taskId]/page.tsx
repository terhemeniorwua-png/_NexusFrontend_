'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { AccessState } from '@/components/shared/AccessState';
import { Can } from '@/components/shared/Can';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import {
  getTask,
  updateTask,
  deleteTask,
  archiveTask,
  restoreTask,
  completeTask,
  reopenTask,
  addAssignee,
  removeAssignee,
  addDependency,
  removeDependency,
  listComments,
  addComment,
  updateComment,
  deleteComment,
  type TaskSummary,
  type TaskStatus,
  type TaskPriority,
  type TaskComment,
} from '@/services/tasks';
import { listProjectMembers, type ProjectMember } from '@/services/projects';
import {
  deleteFile,
  formatBytes,
  listFiles,
  uploadFile,
  type FileSummary,
} from '@/services/files';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const editSchema = z
  .object({
    title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200, 'Title must be at most 200 characters'),
    description: z.string().trim().max(10000).optional(),
    status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CHANGES_REQUESTED']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    category: z.string().trim().max(80).optional(),
    labels: z.string().optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
  })
  .refine(
    (d) => !d.startDate || !d.dueDate || new Date(d.startDate) <= new Date(d.dueDate),
    { message: 'Start date must be on or before the due date', path: ['dueDate'] },
  );

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(10000, 'Comment must be at most 10 000 characters'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusLabel(s: TaskStatus): string {
  return s.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function priorityLabel(p: TaskPriority): string {
  return p.charAt(0) + p.slice(1).toLowerCase();
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action.';
  return cause.message;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const { activeWorkspace, user } = useWorkspaceContext();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const router = useRouter();
  useWorkspaceRedirect();

  const canView = can('task.view');
  const canUpdate = can('task.update');
  const canAssign = can('task.assign');
  const canReassign = can('task.reassign');
  const canComment = can('task.comment');
  const canUpload = can('file.upload');
  const canDeleteAnyFile = can('file.delete.any');
  const canDeleteOwnFile = can('file.delete.own');
  const canSubmit = can('submission.submit');
  const canReview = can('submission.review');
  const canApprove = can('submission.approve');
  const canReject = can('submission.reject');
  const canRequestRevision = can('submission.request_revision');
  const hasReviewControls = canReview || canApprove || canReject || canRequestRevision;

  // Core task state
  const [task, setTask] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Workspace-switch guard
  const latestLoad = useRef(0);
  const loadedWorkspaceId = useRef<string | null>(null);

  // Edit form state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('ASSIGNED');
  const [editPriority, setEditPriority] = useState<TaskPriority>('MEDIUM');
  const [editCategory, setEditCategory] = useState('');
  const [editLabels, setEditLabels] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Assignee state
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [addAssigneeId, setAddAssigneeId] = useState('');
  const [assigneeBusy, setAssigneeBusy] = useState(false);
  const [assigneeError, setAssigneeError] = useState<string | null>(null);
  const [removeAssigneeTarget, setRemoveAssigneeTarget] = useState<string | null>(null);

  // Dependency state
  const [depTaskId, setDepTaskId] = useState('');
  const [depBusy, setDepBusy] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);
  const [removeDepTarget, setRemoveDepTarget] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<TaskComment | null>(null);

  // Action confirm dialogs
  const [confirmAction, setConfirmAction] = useState<'complete' | 'reopen' | 'archive' | 'restore' | 'delete' | null>(null);

  // Attachments
  const [files, setFiles] = useState<FileSummary[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<FileSummary | null>(null);
  const uploadAbortRef = useRef<{ abort: () => void } | null>(null);

  // Submission / review actions
  const [submissionBusy, setSubmissionBusy] = useState(false);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const load = useCallback(async () => {
    if (!activeWorkspace || !canView) {
      setLoading(false);
      return;
    }
    const seq = ++latestLoad.current;
    setLoading(true); setError(null); setAccessStatus(null);
    try {
      const data = await getTask(activeWorkspace.id, projectId, taskId);
      if (seq !== latestLoad.current) return;
      if (loadedWorkspaceId.current !== null && loadedWorkspaceId.current !== activeWorkspace.id) return;
      loadedWorkspaceId.current = activeWorkspace.id;
      setTask(data);
    } catch (cause) {
      if (seq !== latestLoad.current) return;
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else if (cause instanceof ApiRequestError && cause.status === 404) {
        setError('This task does not exist or you do not have access to it.');
      } else {
        setError(requestError(cause, 'Task could not be loaded.'));
      }
    } finally {
      if (seq === latestLoad.current) setLoading(false);
    }
  }, [activeWorkspace, projectId, taskId, canView]);

  const loadComments = useCallback(async () => {
    if (!activeWorkspace) return;
    setCommentsLoading(true);
    try {
      const data = await listComments(activeWorkspace.id, projectId, taskId, 50);
      setComments(data);
    } catch {
      // Non-blocking — comments load failures don't hide the task
    } finally {
      setCommentsLoading(false);
    }
  }, [activeWorkspace, projectId, taskId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) { void load(); void loadComments(); } });
    return () => { active = false; };
  }, [load, loadComments]);

  // Load project members only when the caller can change assignees.
  useEffect(() => {
    if (!activeWorkspace || (!canAssign && !canReassign)) return;
    let active = true;
    void listProjectMembers(activeWorkspace.id, projectId)
      .then((list) => { if (active) setMembers(list); })
      .catch(() => { /* The assignee picker stays empty; the task remains usable. */ });
    return () => { active = false; };
  }, [activeWorkspace, projectId, canAssign, canReassign]);

  const loadFiles = useCallback(async () => {
    if (!activeWorkspace || !canView) return;
    setFilesLoading(true); setFileError(null);
    try {
      const result = await listFiles(activeWorkspace.id, { taskId, limit: 50 });
      setFiles(result.items);
    } catch (cause) {
      setFileError(requestError(cause, 'Attachments could not be loaded.'));
    } finally {
      setFilesLoading(false);
    }
  }, [activeWorkspace, taskId, canView]);

  useEffect(() => {
    if (!activeWorkspace || !canView) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void loadFiles(); });
    return () => { active = false; };
  }, [activeWorkspace, canView, loadFiles]);

  // Abort an in-flight upload when the page unmounts.
  useEffect(() => () => { uploadAbortRef.current?.abort(); }, []);

  // ---------------------------------------------------------------------------
  // Edit form helpers
  // ---------------------------------------------------------------------------

  function startEdit() {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditCategory(task.category ?? '');
    setEditLabels(task.labels.join(', '));
    setEditStartDate(task.startDate ? task.startDate.slice(0, 10) : '');
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
    setEditErrors({});
    setEditing(true);
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !task) return;
    const parsed = editSchema.safeParse({
      title: editTitle, description: editDescription || undefined,
      status: editStatus, priority: editPriority,
      category: editCategory || undefined, labels: editLabels || undefined,
      startDate: editStartDate || undefined, dueDate: editDueDate || undefined,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
      setEditErrors(errs);
      return;
    }
    setBusy(true); setError(null); setEditErrors({});
    try {
      const updated = await updateTask(activeWorkspace.id, projectId, task.id, {
        title: parsed.data.title,
        description: parsed.data.description ?? undefined,
        status: parsed.data.status,
        priority: parsed.data.priority,
        category: parsed.data.category ?? null,
        labels: parsed.data.labels ? parsed.data.labels.split(',').map((l) => l.trim()).filter(Boolean) : [],
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate).toISOString() : null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null,
      });
      setTask(updated);
      setEditing(false);
      setNotice('Task updated.');
    } catch (cause) {
      setError(requestError(cause, 'Task could not be updated.'));
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Status action handlers
  // ---------------------------------------------------------------------------

  async function handleAction(action: 'complete' | 'reopen' | 'archive' | 'restore' | 'delete') {
    if (!activeWorkspace || !task) return;
    setBusy(true); setError(null); setConfirmAction(null);
    try {
      if (action === 'complete') {
        const res = await completeTask(activeWorkspace.id, projectId, task.id);
        setTask((prev) => prev ? { ...prev, status: res.status, completedAt: res.completedAt } : prev);
        setNotice('Task marked as complete.');
      } else if (action === 'reopen') {
        const res = await reopenTask(activeWorkspace.id, projectId, task.id);
        setTask((prev) => prev ? { ...prev, status: res.status, completedAt: null } : prev);
        setNotice('Task reopened.');
      } else if (action === 'archive') {
        await archiveTask(activeWorkspace.id, projectId, task.id);
        setTask((prev) => prev ? { ...prev, archivedAt: new Date().toISOString() } : prev);
        setNotice('Task archived.');
      } else if (action === 'restore') {
        await restoreTask(activeWorkspace.id, projectId, task.id);
        setTask((prev) => prev ? { ...prev, archivedAt: null } : prev);
        setNotice('Task restored.');
      } else if (action === 'delete') {
        await deleteTask(activeWorkspace.id, projectId, task.id);
        router.push(`/app/projects/${encodeURIComponent(projectId)}/tasks`);
        return;
      }
    } catch (cause) {
      setError(requestError(cause, `Task could not be ${action}d.`));
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Assignee handlers
  // ---------------------------------------------------------------------------

  async function handleAddAssignee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !task || !addAssigneeId) return;
    setAssigneeBusy(true); setAssigneeError(null);
    try {
      await addAssignee(activeWorkspace.id, projectId, task.id, addAssigneeId);
      setAddAssigneeId('');
      setNotice('Assignee added.');
      await load();
    } catch (cause) {
      setAssigneeError(requestError(cause, 'Assignee could not be added.'));
    } finally {
      setAssigneeBusy(false);
    }
  }

  async function handleRemoveAssignee() {
    if (!activeWorkspace || !task || !removeAssigneeTarget) return;
    setAssigneeBusy(true); setAssigneeError(null); setRemoveAssigneeTarget(null);
    try {
      await removeAssignee(activeWorkspace.id, projectId, task.id, removeAssigneeTarget);
      setNotice('Assignee removed.');
      await load();
    } catch (cause) {
      setAssigneeError(requestError(cause, 'Assignee could not be removed.'));
    } finally {
      setAssigneeBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Dependency handlers
  // ---------------------------------------------------------------------------

  async function handleAddDependency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !task || !depTaskId.trim()) return;
    setDepBusy(true); setDepError(null);
    try {
      await addDependency(activeWorkspace.id, projectId, task.id, depTaskId.trim());
      setDepTaskId('');
      setNotice('Dependency added.');
      await load();
    } catch (cause) {
      setDepError(requestError(cause, 'Dependency could not be added.'));
    } finally {
      setDepBusy(false);
    }
  }

  async function handleRemoveDependency() {
    if (!activeWorkspace || !task || !removeDepTarget) return;
    setDepBusy(true); setDepError(null); setRemoveDepTarget(null);
    try {
      await removeDependency(activeWorkspace.id, projectId, task.id, removeDepTarget);
      setNotice('Dependency removed.');
      await load();
    } catch (cause) {
      setDepError(requestError(cause, 'Dependency could not be removed.'));
    } finally {
      setDepBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Comment handlers
  // ---------------------------------------------------------------------------

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !task) return;
    const parsed = commentSchema.safeParse({ body: commentBody });
    if (!parsed.success) { setCommentError(parsed.error.issues[0]?.message ?? 'Invalid comment.'); return; }
    setCommentBusy(true); setCommentError(null);
    try {
      await addComment(activeWorkspace.id, projectId, task.id, parsed.data.body);
      setCommentBody('');
      await loadComments();
    } catch (cause) {
      setCommentError(requestError(cause, 'Comment could not be added.'));
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleSaveEditComment(cid: string) {
    if (!activeWorkspace || !task) return;
    const parsed = commentSchema.safeParse({ body: editCommentBody });
    if (!parsed.success) { setCommentError(parsed.error.issues[0]?.message ?? 'Invalid comment.'); return; }
    setCommentBusy(true); setCommentError(null);
    try {
      await updateComment(activeWorkspace.id, projectId, task.id, cid, parsed.data.body);
      setEditCommentId(null);
      await loadComments();
    } catch (cause) {
      setCommentError(requestError(cause, 'Comment could not be updated.'));
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleDeleteComment() {
    if (!activeWorkspace || !task || !deleteCommentTarget) return;
    setCommentBusy(true); setCommentError(null); setDeleteCommentTarget(null);
    try {
      await deleteComment(activeWorkspace.id, projectId, task.id, deleteCommentTarget.id);
      await loadComments();
    } catch (cause) {
      setCommentError(requestError(cause, 'Comment could not be deleted.'));
    } finally {
      setCommentBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Attachment handlers
  // ---------------------------------------------------------------------------

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!activeWorkspace || !task || !file) return;
    setUploadBusy(true); setFileError(null); setUploadProgress(0);
    try {
      const request = uploadFile({
        workspaceId: activeWorkspace.id,
        file,
        projectId,
        taskId: task.id,
        onProgress: setUploadProgress,
      });
      uploadAbortRef.current = request;
      const uploaded = await request.promise;
      setFiles((current) => [uploaded, ...current]);
      setTask((current) => current ? { ...current, attachmentCount: current.attachmentCount + 1 } : current);
      setNotice('Attachment uploaded.');
    } catch (cause) {
      if (!(cause instanceof ApiRequestError && cause.code === 'UPLOAD_ABORTED')) {
        setFileError(requestError(cause, 'Attachment could not be uploaded.'));
      }
    } finally {
      uploadAbortRef.current = null;
      setUploadBusy(false);
      setUploadProgress(null);
    }
  }

  async function handleDeleteFile() {
    if (!activeWorkspace || !task || !deleteFileTarget) return;
    setUploadBusy(true); setFileError(null);
    try {
      await deleteFile(activeWorkspace.id, deleteFileTarget.id);
      setFiles((current) => current.filter((entry) => entry.id !== deleteFileTarget.id));
      setTask((current) => current ? { ...current, attachmentCount: Math.max(0, current.attachmentCount - 1) } : current);
      setDeleteFileTarget(null);
      setNotice('Attachment deleted.');
    } catch (cause) {
      setFileError(requestError(cause, 'Attachment could not be deleted.'));
    } finally {
      setUploadBusy(false);
    }
  }

  function canDeleteFile(file: FileSummary): boolean {
    if (canDeleteAnyFile) return true;
    return canDeleteOwnFile && file.uploadedById === user?.id;
  }

  // ---------------------------------------------------------------------------
  // Submission / review handlers
  // ---------------------------------------------------------------------------

  async function handleSubmission(nextStatus: TaskStatus, message: string) {
    if (!activeWorkspace || !task) return;
    setSubmissionBusy(true); setError(null);
    try {
      const updated = await updateTask(activeWorkspace.id, projectId, task.id, { status: nextStatus });
      setTask(updated);
      setNotice(message);
    } catch (cause) {
      setError(requestError(cause, 'The task status could not be updated.'));
    } finally {
      setSubmissionBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="Choose a workspace"
        description="Select a workspace to view this task."
        action={<Link href="/app/workspaces" className="text-[var(--color-primary)] underline">Manage workspaces</Link>}
      />
    );
  }

  if (loading || permissionsLoading) {
    return (
      <div className="space-y-4 mx-auto max-w-5xl" role="status" aria-label="Loading task">
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Skeleton className="h-6 w-1/2 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;
  if (!canView) {
    return (
      <PageAccessState
        description="Your project role does not include access to this task."
        backHref={`/app/projects/${encodeURIComponent(projectId)}/tasks`}
        backLabel="Back to tasks"
      />
    );
  }
  if (error && !task) return <Alert variant="error" title="Task unavailable">{error}</Alert>;
  if (!task) return null;

  // ---------------------------------------------------------------------------
  // Assignee member options (exclude already-assigned users)
  const assignedIds = new Set(task.assignees.map((a) => a.userId));
  const memberOptions = members
    .filter((m) => !assignedIds.has(m.userId))
    .map((m) => ({ value: m.userId, label: `${m.user.name} (${m.user.email})` }));

  const isCompleted = task.status === 'APPROVED';
  const isArchived = Boolean(task.archivedAt);
  const isAssignedToMe = Boolean(user && task.assignees.some((assignee) => assignee.userId === user.id));
  // A submission belongs to its assignees. Reviewers must never approve or
  // reject their own submitted work.
  const isOwnSubmission = isAssignedToMe;
  const canSubmitForReview = canSubmit && isAssignedToMe
    && (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS' || task.status === 'CHANGES_REQUESTED');
  const canStartReview = canReview && !isOwnSubmission && task.status === 'SUBMITTED';
  const canApproveSubmission = canApprove && !isOwnSubmission
    && (task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW');
  const canRejectSubmission = canReject && !isOwnSubmission
    && (task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW');
  const canRequestRevisionAction = canRequestRevision && !isOwnSubmission
    && (task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW');
  const showSubmissionSection = (canSubmit && isAssignedToMe) || hasReviewControls;

  return (
    <div className="mx-auto max-w-5xl space-y-4">

      {/* Back link */}
      <Link
        href={`/app/projects/${encodeURIComponent(projectId)}/tasks`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        aria-label="Back to task list"
      >
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        Back to tasks
      </Link>

      {/* Notices */}
      {notice && (
        <div className="flex items-start justify-between gap-2">
          <Alert variant="success">{notice}</Alert>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="Dismiss notice"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ------------------------------------------------------------------ */}
        {/* Left: main content */}
        {/* ------------------------------------------------------------------ */}
        <div className="space-y-6 lg:col-span-2">

          {/* Header card */}
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-xs bg-[var(--color-surface-secondary)] border border-[var(--color-border)] px-1.5 py-0.5 rounded text-[var(--color-text-secondary)]">
                    {task.key}
                  </span>
                  <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
                  <Badge variant={task.priority}>{priorityLabel(task.priority)}</Badge>
                  {isArchived && <Badge variant="outline">Archived</Badge>}
                </div>
                {editing ? (
                  <form onSubmit={(e) => void handleSaveEdit(e)} className="space-y-4" aria-label="Edit task form">
                    <Input
                      id="edit-title"
                      label="Title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      maxLength={200}
                      errorMessage={editErrors.title}
                    />
                    <Textarea
                      id="edit-description"
                      label="Description (optional)"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      maxLength={10000}
                      rows={4}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Select
                        id="edit-status"
                        label="Status"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                        options={STATUS_OPTIONS}
                        errorMessage={editErrors.status}
                      />
                      <Select
                        id="edit-priority"
                        label="Priority"
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                        options={PRIORITY_OPTIONS}
                        errorMessage={editErrors.priority}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        id="edit-category"
                        label="Category (optional)"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        maxLength={80}
                      />
                      <Input
                        id="edit-labels"
                        label="Labels (comma-separated)"
                        value={editLabels}
                        onChange={(e) => setEditLabels(e.target.value)}
                        placeholder="bug, feature, docs"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="edit-startDate" className="block text-sm font-medium mb-1">Start date <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label>
                        <input
                          id="edit-startDate"
                          type="date"
                          value={editStartDate}
                          onChange={(e) => setEditStartDate(e.target.value)}
                          className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-dueDate" className="block text-sm font-medium mb-1">Due date <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label>
                        <input
                          id="edit-dueDate"
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        />
                        {editErrors.dueDate && <p className="mt-1 text-xs text-[var(--color-error)]">{editErrors.dueDate}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" loading={busy}>Save changes</Button>
                      <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{task.title}</h1>
                    {task.description && (
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{task.description}</p>
                    )}
                    {task.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {task.labels.map((l) => <Badge key={l} variant="outline">{l}</Badge>)}
                      </div>
                    )}
                    {task.category && (
                      <p className="mt-2 text-xs text-[var(--color-text-muted)]">Category: <span className="font-medium">{task.category}</span></p>
                    )}
                  </>
                )}
              </div>

              {/* Header actions */}
              {!editing && (
                <div className="flex flex-wrap gap-2">
                  <PermissionButton
                    size="sm"
                    variant="secondary"
                    permission="task.update"
                    onClick={startEdit}
                    aria-label="Edit task"
                    deniedReason="Your project role cannot edit this task."
                  >
                    Edit
                  </PermissionButton>
                  {can('task.complete') && isAssignedToMe && (
                    isCompleted
                      ? <Button size="sm" variant="secondary" onClick={() => setConfirmAction('reopen')} disabled={busy}>Reopen</Button>
                      : <Button size="sm" onClick={() => setConfirmAction('complete')} disabled={busy}>Mark complete</Button>
                  )}
                  <Can permission="task.update">
                    {isArchived
                      ? <Button size="sm" variant="secondary" onClick={() => setConfirmAction('restore')} disabled={busy}>Restore</Button>
                      : <Button size="sm" variant="ghost" onClick={() => setConfirmAction('archive')} disabled={busy}>Archive</Button>
                    }
                  </Can>
                  <Can permission="task.delete">
                    <Button size="sm" variant="destructive" onClick={() => setConfirmAction('delete')} disabled={busy}>Delete</Button>
                  </Can>
                </div>
              )}
            </div>
          </Card>

          {/* Assignees */}
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Assignees</h2>
            {assigneeError && <Alert variant="error" className="mb-3">{assigneeError}</Alert>}
            {task.assignees.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">No assignees yet.</p>
            ) : (
              <ul className="space-y-2 mb-4" aria-label="Assignee list">
                {task.assignees.map((a) => (
                  <li key={a.userId} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white"
                      >
                        {a.user.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.user.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">{a.user.email}</p>
                      </div>
                    </div>
                    {canReassign && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemoveAssigneeTarget(a.userId)}
                        aria-label={`Remove ${a.user.name} as assignee`}
                        disabled={assigneeBusy}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!canAssign && !canReassign && (
              <p className="text-xs text-[var(--color-text-muted)]">
                You can view assignees, but your project role cannot change them.
              </p>
            )}

            {canAssign && memberOptions.length > 0 && (
              <form onSubmit={(e) => void handleAddAssignee(e)} className="flex gap-2 items-end flex-wrap" aria-label="Add assignee">
                <div className="flex-1 min-w-[160px]">
                  <Select
                    id="add-assignee-select"
                    label="Add assignee"
                    value={addAssigneeId}
                    onChange={(e) => setAddAssigneeId(e.target.value)}
                    options={memberOptions}
                    placeholder="Select a member…"
                  />
                </div>
                <Button type="submit" size="sm" loading={assigneeBusy} disabled={!addAssigneeId}>Add</Button>
              </form>
            )}

            {canAssign && memberOptions.length === 0 && members.length > 0 && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Every available project member is already assigned to this task.
              </p>
            )}
          </Card>

          {/* Dependencies */}
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Dependencies</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">Tasks that must be completed before this task.</p>
            {depError && <Alert variant="error" className="mb-3">{depError}</Alert>}
            {task.dependencies.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">No dependencies.</p>
            ) : (
              <ul className="space-y-2 mb-4" aria-label="Dependency list">
                {task.dependencies.map((dep) => (
                  <li key={dep.dependsOnTaskId} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--color-text-muted)]">{dep.dependsOnTask.key}</span>
                      <span className="text-sm truncate">{dep.dependsOnTask.title}</span>
                      <Badge variant={dep.dependsOnTask.status}>{statusLabel(dep.dependsOnTask.status)}</Badge>
                    </div>
                    {canUpdate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemoveDepTarget(dep.dependsOnTaskId)}
                        aria-label={`Remove dependency on ${dep.dependsOnTask.key}`}
                        disabled={depBusy}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canUpdate ? (
              <form onSubmit={(e) => void handleAddDependency(e)} className="flex gap-2 items-end flex-wrap" aria-label="Add dependency">
                <div className="flex-1 min-w-[160px]">
                  <Input
                    id="dep-task-id"
                    label="Depends on (task ID)"
                    value={depTaskId}
                    onChange={(e) => setDepTaskId(e.target.value)}
                    placeholder="Paste task UUID…"
                    helperText="Enter the ID of the task this task depends on."
                  />
                </div>
                <Button type="submit" size="sm" loading={depBusy} disabled={!depTaskId.trim()}>Add dependency</Button>
              </form>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">
                Your project role cannot change task dependencies.
              </p>
            )}
          </Card>

          {/* Blockers — read-only */}
          {task.blockers.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold mb-3">Blocking tasks</h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">These tasks are waiting on this task to complete.</p>
              <ul className="space-y-2" aria-label="Blocking tasks">
                {task.blockers.map((b) => (
                  <li key={b.taskId} className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">{b.task.key}</span>
                    <span className="text-sm">{b.task.title}</span>
                    <Badge variant={b.task.status}>{statusLabel(b.task.status)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Comments */}
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Comments <span className="text-[var(--color-text-muted)] font-normal">({task.commentCount})</span></h2>
            {commentError && <Alert variant="error" className="mb-3">{commentError}</Alert>}

            {commentsLoading ? (
              <div className="space-y-2 mb-4" role="status" aria-label="Loading comments">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">No comments yet. Be the first to comment.</p>
            ) : (
              <ul className="space-y-4 mb-6" aria-label="Comment list">
                {comments.map((c) => (
                  <li key={c.id} className="border-b border-[var(--color-border)] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white"
                        >
                          {c.author.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium">{c.author.name}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{timeLabel(c.createdAt)}</span>
                        {c.createdAt !== c.updatedAt && (
                          <span className="text-xs text-[var(--color-text-muted)] italic">(edited)</span>
                        )}
                      </div>
                      {canComment && user?.id === c.authorId && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={commentBusy}
                            onClick={() => { setEditCommentId(c.id); setEditCommentBody(c.body); }}
                            aria-label="Edit comment"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={commentBusy}
                            onClick={() => setDeleteCommentTarget(c)}
                            aria-label="Delete comment"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                    {editCommentId === c.id ? (
                      <div className="space-y-2">
                        <Textarea
                          id={`edit-comment-${c.id}`}
                          label="Edit comment"
                          value={editCommentBody}
                          onChange={(e) => setEditCommentBody(e.target.value)}
                          rows={3}
                          maxLength={10000}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" loading={commentBusy} onClick={() => void handleSaveEditComment(c.id)}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditCommentId(null)} disabled={commentBusy}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-[var(--color-text-primary)]">{c.body}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add comment form */}
            {canComment ? (
              <form onSubmit={(e) => void handleAddComment(e)} className="space-y-2" aria-label="Add comment">
                <Textarea
                  id="new-comment"
                  label="Add a comment"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Write a comment…"
                  rows={3}
                  maxLength={10000}
                />
                <Button type="submit" size="sm" loading={commentBusy} disabled={!commentBody.trim()}>Post comment</Button>
              </form>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">
                Your project role can read comments but cannot post them.
              </p>
            )}
          </Card>

          {/* Attachments */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold">
                Attachments <span className="text-[var(--color-text-muted)] font-normal">({files.length})</span>
              </h2>
              {canUpload && (
                <label
                  className={[
                    'inline-flex h-8 cursor-pointer items-center rounded-[var(--radius-md)] px-3 text-sm font-medium',
                    'bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-primary-hover)]',
                    uploadBusy ? 'pointer-events-none opacity-50' : '',
                  ].join(' ')}
                >
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(event) => void handleUpload(event)}
                    disabled={uploadBusy}
                    aria-label="Upload attachment"
                  />
                  {uploadBusy ? 'Uploading…' : 'Upload file'}
                </label>
              )}
            </div>

            {fileError && <Alert variant="error" className="mb-3">{fileError}</Alert>}

            {uploadProgress !== null && (
              <div className="mb-3" role="status" aria-live="polite">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                  <div
                    className="h-full bg-[var(--color-primary)] transition-[width]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Uploading… {uploadProgress}%</p>
              </div>
            )}

            {filesLoading ? (
              <div className="space-y-2" role="status" aria-label="Loading attachments">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : files.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                No attachments yet.
                {!canUpload && ' Your project role cannot upload files.'}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]" aria-label="Attachment list">
                {files.map((file) => (
                  <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.fileName}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatBytes(file.sizeBytes)} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(file.createdAt))}
                      </p>
                    </div>
                    {canDeleteFile(file) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={uploadBusy}
                        onClick={() => setDeleteFileTarget(file)}
                        aria-label={`Delete ${file.fileName}`}
                      >
                        Delete
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Submission and review */}
          {showSubmissionSection && (
            <Card className="p-5">
              <h2 className="font-semibold mb-1">Submission &amp; review</h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Current status: <span className="font-medium">{statusLabel(task.status)}</span>
              </p>

              {isOwnSubmission && (
                <p className="mb-3 text-xs text-[var(--color-text-muted)]">
                  You are assigned to this task, so approval and rejection controls are hidden for your own submission.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {canSubmitForReview && (
                  <Button
                    size="sm"
                    loading={submissionBusy}
                    disabled={submissionBusy}
                    onClick={() => void handleSubmission('SUBMITTED', 'Work submitted for review.')}
                  >
                    Submit for review
                  </Button>
                )}
                {canStartReview && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={submissionBusy}
                    disabled={submissionBusy}
                    onClick={() => void handleSubmission('UNDER_REVIEW', 'Review started.')}
                  >
                    Start review
                  </Button>
                )}
                {canApproveSubmission && (
                  <Button
                    size="sm"
                    loading={submissionBusy}
                    disabled={submissionBusy}
                    onClick={() => void handleSubmission('APPROVED', 'Submission approved.')}
                  >
                    Approve
                  </Button>
                )}
                {canRequestRevisionAction && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={submissionBusy}
                    disabled={submissionBusy}
                    onClick={() => void handleSubmission('CHANGES_REQUESTED', 'Changes requested.')}
                  >
                    Request revision
                  </Button>
                )}
                {canRejectSubmission && (
                  <Button
                    size="sm"
                    variant="destructive"
                    loading={submissionBusy}
                    disabled={submissionBusy}
                    onClick={() => void handleSubmission('CHANGES_REQUESTED', 'Submission rejected. Changes are required.')}
                  >
                    Reject
                  </Button>
                )}
                {!canSubmitForReview && !canStartReview && !canApproveSubmission && !canRequestRevisionAction && !canRejectSubmission && (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    No submission or review action is available for your role in the current status.
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Right: sidebar */}
        {/* ------------------------------------------------------------------ */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Status</dt>
                <dd className="mt-0.5"><Badge variant={task.status}>{statusLabel(task.status)}</Badge></dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Priority</dt>
                <dd className="mt-0.5"><Badge variant={task.priority}>{priorityLabel(task.priority)}</Badge></dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Start date</dt>
                <dd className="mt-0.5 font-medium">{dateLabel(task.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Due date</dt>
                <dd className="mt-0.5 font-medium">{dateLabel(task.dueDate)}</dd>
              </div>
              {task.completedAt && (
                <div>
                  <dt className="text-xs text-[var(--color-text-muted)]">Completed</dt>
                  <dd className="mt-0.5 font-medium">{dateLabel(task.completedAt)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Created by</dt>
                <dd className="mt-0.5 font-medium">{task.creator.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Created</dt>
                <dd className="mt-0.5 font-medium">{dateLabel(task.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Updated</dt>
                <dd className="mt-0.5 font-medium">{dateLabel(task.updatedAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Counts</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">Subtasks</dt>
                <dd className="font-medium">{task.subTaskCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">Comments</dt>
                <dd className="font-medium">{task.commentCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-secondary)]">Attachments</dt>
                <dd className="font-medium">{task.attachmentCount}</dd>
              </div>
            </dl>
          </Card>

          {task.parentTaskId && (
            <Card className="p-4">
              <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Parent task</h2>
              <Link
                href={`/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.parentTaskId)}`}
                className="text-sm text-[var(--color-primary)] underline"
              >
                View parent task
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Confirm dialogs */}
      {/* ------------------------------------------------------------------ */}
      <ConfirmDialog
        open={confirmAction === 'complete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void handleAction('complete')}
        title="Mark task as complete?"
        description="This will set the task status to Approved. You can reopen it later."
        confirmLabel="Mark complete"
        loading={busy}
      />
      <ConfirmDialog
        open={confirmAction === 'reopen'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void handleAction('reopen')}
        title="Reopen this task?"
        description="This will change the task status back to In Progress."
        confirmLabel="Reopen task"
        loading={busy}
      />
      <ConfirmDialog
        open={confirmAction === 'archive'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void handleAction('archive')}
        title="Archive this task?"
        description="Archived tasks are hidden from the default view. You can restore them later."
        confirmLabel="Archive task"
        loading={busy}
      />
      <ConfirmDialog
        open={confirmAction === 'restore'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void handleAction('restore')}
        title="Restore this task?"
        description="This task will become visible in the task list again."
        confirmLabel="Restore task"
        loading={busy}
      />
      <ConfirmDialog
        open={confirmAction === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void handleAction('delete')}
        title="Delete this task?"
        description="This task will be permanently deleted. This cannot be undone."
        confirmLabel="Delete task"
        destructive
        loading={busy}
      />
      <ConfirmDialog
        open={Boolean(removeAssigneeTarget)}
        onClose={() => setRemoveAssigneeTarget(null)}
        onConfirm={() => void handleRemoveAssignee()}
        title="Remove assignee?"
        description="This person will no longer be assigned to this task."
        confirmLabel="Remove assignee"
        loading={assigneeBusy}
      />
      <ConfirmDialog
        open={Boolean(removeDepTarget)}
        onClose={() => setRemoveDepTarget(null)}
        onConfirm={() => void handleRemoveDependency()}
        title="Remove dependency?"
        description="This task will no longer depend on the selected task."
        confirmLabel="Remove dependency"
        loading={depBusy}
      />
      <ConfirmDialog
        open={Boolean(deleteCommentTarget)}
        onClose={() => setDeleteCommentTarget(null)}
        onConfirm={() => void handleDeleteComment()}
        title="Delete comment?"
        description="This comment will be permanently deleted."
        confirmLabel="Delete comment"
        destructive
        loading={commentBusy}
      />
      <ConfirmDialog
        open={Boolean(deleteFileTarget)}
        onClose={() => setDeleteFileTarget(null)}
        onConfirm={() => void handleDeleteFile()}
        title={`Delete ${deleteFileTarget?.fileName ?? 'attachment'}?`}
        description="This attachment will be permanently deleted. This cannot be undone."
        confirmLabel="Delete attachment"
        destructive
        loading={uploadBusy}
      />
    </div>
  );
}
