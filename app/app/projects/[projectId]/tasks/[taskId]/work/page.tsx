'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { ProjectUnavailableState } from '@/components/shared/PageAccessState';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { ApiRequestError } from '@/lib/api';
import { getProject, type ProjectSummary } from '@/services/projects';
import {
  addComment,
  completeSubtask,
  createTaskTimeEntry,
  deleteComment,
  deleteTaskTimeEntry,
  getTaskWorkspace,
  listComments,
  listTaskActivity,
  listTaskTimeEntries,
  reportTaskBlocker,
  resolveTaskBlocker,
  submitTask,
  updateTask,
  updateTaskTimeEntry,
  type TaskActivityItem,
  type TaskComment,
  type TaskProgress,
  type TaskReportedBlocker,
  type TaskSummary,
  type TaskTimeEntry,
  type TaskWorkspaceData,
} from '@/services/tasks';
import { listFiles, type FileSummary } from '@/services/files';
import { TaskWorkspaceHeader, type SaveSyncState } from '@/components/task-workspace/TaskWorkspaceHeader';
import { TaskWorkspaceLayout } from '@/components/task-workspace/TaskWorkspaceLayout';
import { TaskOverview } from '@/components/task-workspace/TaskOverview';
import { SubtaskManager } from '@/components/task-workspace/SubtaskManager';
import { AttachmentManager } from '@/components/task-workspace/AttachmentManager';
import { TaskDiscussion } from '@/components/task-workspace/TaskDiscussion';
import { TaskActivityTimeline } from '@/components/task-workspace/TaskActivityTimeline';
import { TaskSubmissionPanel } from '@/components/task-workspace/TaskSubmissionPanel';
import { TaskProgressTracker } from '@/components/task-workspace/TaskProgressTracker';
import { WorkDocuments } from '@/components/task-workspace/WorkDocuments';
import { TaskTimeTracking } from '@/components/task-workspace/TaskTimeTracking';
import { TaskDevelopment } from '@/components/task-workspace/TaskDevelopment';
import type { WorkspaceSection } from '@/components/task-workspace/TaskWorkspaceSidebar';
import {
  listProjectRepositories,
  listRepositoryBranches,
  listRepositoryPullRequests,
  listTaskDevLinks,
  linkTaskDevLink,
  unlinkTaskDevLink,
  type LinkedProjectRepository,
  type TaskDevLink,
} from '@/services/dev-integrations';

const SECTIONS: WorkspaceSection[] = ['overview', 'subtasks', 'documents', 'attachments', 'development', 'discussion', 'activity', 'time'];

function parseSection(hash: string, search: string): WorkspaceSection {
  const h = hash.replace(/^#/, '').toLowerCase();
  if (SECTIONS.includes(h as WorkspaceSection)) return h as WorkspaceSection;
  const params = new URLSearchParams(search);
  const q = (params.get('section') || '').toLowerCase();
  if (SECTIONS.includes(q as WorkspaceSection)) return q as WorkspaceSection;
  return 'overview';
}

export default function TaskWorkPage() {
  const params = useParams<{ projectId: string; taskId: string }>();
  const projectId = params.projectId;
  const taskId = params.taskId;
  const router = useRouter();
  const { activeWorkspace, user } = useWorkspaceContext();
  const activeWorkspaceId = activeWorkspace?.id ?? '';
  const currentUserId = user?.id ?? '';
  const { can, isLoading: permissionsLoading, accessStatus } = usePermissions();

  const [workspaceData, setWorkspaceData] = useState<TaskWorkspaceData | null>(null);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [section, setSection] = useState<WorkspaceSection>('overview');
  const [saveState, setSaveState] = useState<SaveSyncState>('idle');

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsBusy, setCommentsBusy] = useState(false);

  const [files, setFiles] = useState<FileSummary[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  const [activityItems, setActivityItems] = useState<TaskActivityItem[]>([]);
  const [activityCursor, setActivityCursor] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [subtaskBusyId, setSubtaskBusyId] = useState<string | null>(null);
  const [showBlockerForm, setShowBlockerForm] = useState(false);
  const [blockerBusyId, setBlockerBusyId] = useState<string | null>(null);
  const [blockerError, setBlockerError] = useState<string | null>(null);

  const [timeEntries, setTimeEntries] = useState<TaskTimeEntry[]>([]);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState(0);
  const [timeLoading, setTimeLoading] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [timeBusy, setTimeBusy] = useState(false);

  const [devLinks, setDevLinks] = useState<TaskDevLink[]>([]);
  const [linkedProjectRepos, setLinkedProjectRepos] = useState<LinkedProjectRepository[]>([]);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState(false);

  const loadedKeyRef = useRef<string | null>(null);

  const updateSection = useCallback((next: WorkspaceSection) => {
    setSection(next);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('section', next);
      url.hash = next;
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apply = () => setSection(parseSection(window.location.hash, window.location.search));
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!activeWorkspaceId || !projectId || !taskId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const [ws, proj] = await Promise.all([
        getTaskWorkspace(activeWorkspaceId, projectId, taskId),
        getProject(activeWorkspaceId, projectId).catch(() => null),
      ]);
      setWorkspaceData(ws);
      setProject(proj);
      loadedKeyRef.current = `${activeWorkspaceId}:${projectId}:${taskId}`;
    } catch (e) {
      if (e instanceof ApiRequestError) {
        if (e.status === 404) setNotFound(true);
        else if (e.status === 401 || e.status === 403) setError(String(e.status));
        else setError(e.message);
      } else {
        setError('Failed to load task workspace.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, projectId, taskId]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const loadComments = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setCommentsLoading(true); setCommentsError(null);
    try { setComments(await listComments(activeWorkspaceId, projectId, taskId)); }
    catch (e) { setCommentsError(e instanceof ApiRequestError ? e.message : 'Failed to load comments.'); }
    finally { setCommentsLoading(false); }
  }, [activeWorkspaceId, projectId, taskId]);

  const loadFiles = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setFilesLoading(true); setFilesError(null);
    try { const page = await listFiles(activeWorkspaceId, { projectId, taskId, limit: 100 }); setFiles(page.items); }
    catch (e) { setFilesError(e instanceof ApiRequestError ? e.message : 'Failed to load attachments.'); }
    finally { setFilesLoading(false); }
  }, [activeWorkspaceId, projectId, taskId]);

  const loadActivity = useCallback(async (reset = true) => {
    if (!activeWorkspaceId) return;
    if (reset) { setActivityLoading(true); setActivityError(null); }
    else setActivityLoadingMore(true);
    try {
      const page = await listTaskActivity(activeWorkspaceId, projectId, taskId, { cursor: reset ? undefined : activityCursor ?? undefined, limit: 25 });
      setActivityItems((prev) => reset ? page.items : [...prev, ...page.items]);
      setActivityCursor(page.nextCursor);
    } catch (e) { setActivityError(e instanceof ApiRequestError ? e.message : 'Failed to load activity.'); }
    finally { setActivityLoading(false); setActivityLoadingMore(false); }
  }, [activeWorkspaceId, projectId, taskId, activityCursor]);

  const timeTrackingEnabled = Boolean(activeWorkspace?.timeTrackingEnabled);

  const loadTimeEntries = useCallback(async () => {
    if (!activeWorkspaceId || !timeTrackingEnabled) return;
    setTimeLoading(true); setTimeError(null);
    try {
      const res = await listTaskTimeEntries(activeWorkspaceId, projectId, taskId);
      setTimeEntries(res.items);
      setTotalTimeMinutes(res.totalMinutes);
    } catch (e) {
      setTimeError(e instanceof ApiRequestError ? e.message : 'Failed to load time entries.');
    } finally {
      setTimeLoading(false);
    }
  }, [activeWorkspaceId, projectId, taskId, timeTrackingEnabled]);

  const loadDevelopment = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setDevLoading(true); setDevError(null);
    try {
      const [links, repos] = await Promise.all([
        listTaskDevLinks(activeWorkspaceId, projectId, taskId),
        listProjectRepositories(activeWorkspaceId, projectId),
      ]);
      setDevLinks(links);
      setLinkedProjectRepos(repos);
    } catch (e) {
      setDevError(e instanceof ApiRequestError ? e.message : 'Failed to load development links.');
    } finally {
      setDevLoading(false);
    }
  }, [activeWorkspaceId, projectId, taskId]);

  useEffect(() => {
    if (!workspaceData || !activeWorkspaceId) return;
    if (section === 'discussion') void loadComments();
    if (section === 'attachments') void loadFiles();
    if (section === 'activity') void loadActivity(true);
    if (section === 'time') void loadTimeEntries();
    if (section === 'development') void loadDevelopment();
  }, [section, workspaceData, activeWorkspaceId, loadComments, loadFiles, loadActivity, loadTimeEntries, loadDevelopment]);

  useEffect(() => {
    if (!workspaceData || !activeWorkspaceId || !timeTrackingEnabled) return;
    void loadTimeEntries();
  }, [workspaceData, activeWorkspaceId, timeTrackingEnabled, loadTimeEntries]);

  const task = workspaceData?.task;
  const isAssignee = useMemo(() => Boolean(currentUserId && task?.assignees.some((a) => a.userId === currentUserId)), [currentUserId, task]);

  if (!activeWorkspaceId) {
    return <Card className="m-6 p-5"><p className="text-sm text-[var(--color-text-secondary)]">Select a workspace to continue.</p></Card>;
  }
  if (accessStatus === 403 || accessStatus === 404) return <ProjectUnavailableState status={accessStatus} />;
  if (error === '401' || error === '403') return <AccessState status={Number(error) as 401 | 403} />;
  if (permissionsLoading || loading) {
    return <div className="space-y-3 p-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (notFound) return <Card className="m-6 p-6"><Alert variant="error" title="Not found">Task not found or unavailable.</Alert></Card>;
  if (error) return <Card className="m-6 p-6"><Alert variant="error" title="Unable to load workspace">{error}</Alert><div className="mt-3"><Button variant="secondary" onClick={() => void loadWorkspace()}>Try again</Button></div></Card>;
  if (!workspaceData || !task) return null;

  // Access rule: redirect/show access state if caller is not assignee and does not have task.view
  if (!can('task.view')) {
    return <AccessState status={403} />;
  }
  if (!isAssignee && !can('task.view')) {
    // task.view already required; keep defensive
    router.replace(`/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`);
    return null;
  }

  async function refreshAfterMutation(mutating: () => Promise<void>) {
    setSaveState('saving');
    try {
      await mutating();
      await loadWorkspace();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (e) {
      setSaveState('failed');
      throw e;
    }
  }

  const progress = workspaceData.progress;
  const canResolveBlocker = (blocker: TaskReportedBlocker) =>
    blocker.status === 'OPEN' &&
    (blocker.reportedById === currentUserId ||
      task.creatorId === currentUserId ||
      can('task.update') ||
      can('project.settings.manage'));

  const header = (
    <TaskWorkspaceHeader
      workspaceName={activeWorkspace?.name}
      projectId={projectId}
      projectName={project?.name}
      taskTitle={task.title}
      status={task.status}
      saveState={saveState}
      blocked={Boolean(task.hasOpenBlocker)}
    />
  );

  let sectionContent: React.ReactNode = null;
  if (section === 'overview') {
    sectionContent = (
      <div className="space-y-4">
        <TaskOverview
          task={task}
          progress={progress}
          projectName={project?.name}
          reportedBlockers={task.reportedBlockers}
          canReportBlocker={isAssignee}
          canResolveBlocker={canResolveBlocker}
          showReportForm={showBlockerForm}
          onOpenReport={() => { setBlockerError(null); setShowBlockerForm(true); }}
          onCancelReport={() => { setShowBlockerForm(false); setBlockerError(null); }}
          onReport={async (description) => {
            setBlockerError(null);
            try {
              await refreshAfterMutation(async () => { await reportTaskBlocker(activeWorkspaceId, projectId, taskId, { description }); });
              setShowBlockerForm(false);
            } catch (e) {
              setBlockerError(e instanceof ApiRequestError ? e.message : 'Failed to report blocker.');
              throw e;
            }
          }}
          onResolve={async (blockerId) => {
            setBlockerBusyId(blockerId); setBlockerError(null);
            try {
              await refreshAfterMutation(async () => { await resolveTaskBlocker(activeWorkspaceId, projectId, taskId, blockerId); });
            } catch (e) {
              setBlockerError(e instanceof ApiRequestError ? e.message : 'Failed to resolve blocker.');
            } finally { setBlockerBusyId(null); }
          }}
          busyBlockerId={blockerBusyId}
          blockerError={blockerError}
        />
        <TaskSubmissionPanel
          task={task}
          busy={submissionBusy}
          error={submissionError}
          onSubmit={async (workSummary) => {
            setSubmissionBusy(true); setSubmissionError(null);
            try {
              await refreshAfterMutation(async () => { await submitTask(activeWorkspaceId, projectId, taskId, workSummary); });
            } catch (e) {
              setSubmissionError(e instanceof ApiRequestError ? e.message : 'Submission failed.');
            } finally { setSubmissionBusy(false); }
          }}
        />
      </div>
    );
  } else if (section === 'subtasks') {
    sectionContent = (
      <SubtaskManager
        parentTaskId={taskId}
        subtasks={workspaceData.subtasks}
        progress={progress}
        busyId={subtaskBusyId}
        isAssigneeOf={(st) => Boolean(currentUserId && st.assignees.some((a) => a.userId === currentUserId))}
        canEditWeight={can('task.update')}
        onComplete={async (sub) => {
          setSubtaskBusyId(sub.id);
          try {
            await refreshAfterMutation(async () => { await completeSubtask(activeWorkspaceId, projectId, taskId, sub.id); });
          } catch (e) {
            setError(e instanceof ApiRequestError ? e.message : 'Could not complete subtask.');
          } finally { setSubtaskBusyId(null); }
        }}
        onUpdateWeight={async (subtaskId, weight) => {
          setSubtaskBusyId(subtaskId);
          try {
            await refreshAfterMutation(async () => { await updateTask(activeWorkspaceId, projectId, subtaskId, { weight }); });
          } catch (e) {
            setError(e instanceof ApiRequestError ? e.message : 'Could not update subtask weight.');
            throw e;
          } finally { setSubtaskBusyId(null); }
        }}
      />
    );
  } else if (section === 'documents') {
    sectionContent = (
      <WorkDocuments
        workspaceId={activeWorkspaceId}
        projectId={projectId}
        taskId={taskId}
        canEdit={can('task.update') || isAssignee}
        canDelete={can('task.update')}
        onSaveStateChange={setSaveState}
      />
    );
  } else if (section === 'attachments') {
    sectionContent = (
      <AttachmentManager
        workspaceId={activeWorkspaceId}
        projectId={projectId}
        taskId={taskId}
        files={files}
        loading={filesLoading}
        error={filesError}
        onReload={loadFiles}
      />
    );
  } else if (section === 'discussion') {
    sectionContent = (
      <TaskDiscussion
        comments={comments}
        loading={commentsLoading}
        error={commentsError}
        busy={commentsBusy}
        canDelete={(c) => c.authorId === currentUserId}
        onAdd={async (body) => {
          setCommentsBusy(true);
          try { await addComment(activeWorkspaceId, projectId, taskId, body); await loadComments(); }
          finally { setCommentsBusy(false); }
        }}
        onDelete={async (commentId) => {
          setCommentsBusy(true);
          try { await deleteComment(activeWorkspaceId, projectId, taskId, commentId); await loadComments(); }
          finally { setCommentsBusy(false); }
        }}
      />
    );
  } else if (section === 'activity') {
    sectionContent = (
      <TaskActivityTimeline
        items={activityItems}
        loading={activityLoading}
        error={activityError}
        hasMore={Boolean(activityCursor)}
        loadingMore={activityLoadingMore}
        onLoadMore={() => void loadActivity(false)}
      />
    );
  } else if (section === 'development') {
    sectionContent = (
      <TaskDevelopment
        linkedRepos={linkedProjectRepos}
        devLinks={devLinks}
        loading={devLoading}
        error={devError}
        canLink={can('task.update')}
        busy={devBusy}
        onReload={loadDevelopment}
        onLoadBranches={async (repositoryId, search) => {
          const res = await listRepositoryBranches(activeWorkspaceId, projectId, repositoryId, { search, perPage: 50 });
          return res.items;
        }}
        onLoadPullRequests={async (repositoryId, search, state) => {
          const res = await listRepositoryPullRequests(activeWorkspaceId, projectId, repositoryId, { search, state: state ?? 'open', perPage: 50 });
          return res.items;
        }}
        onLink={async (input) => {
          setDevBusy(true); setDevError(null);
          try {
            await linkTaskDevLink(activeWorkspaceId, projectId, taskId, input);
            await loadDevelopment();
          } catch (e) {
            setDevError(e instanceof ApiRequestError ? e.message : 'Failed to link development item.');
            throw e;
          } finally { setDevBusy(false); }
        }}
        onUnlink={async (devLinkId) => {
          setDevBusy(true); setDevError(null);
          try {
            await unlinkTaskDevLink(activeWorkspaceId, projectId, taskId, devLinkId);
            await loadDevelopment();
          } catch (e) {
            setDevError(e instanceof ApiRequestError ? e.message : 'Failed to unlink development item.');
            throw e;
          } finally { setDevBusy(false); }
        }}
      />
    );
  } else if (section === 'time') {
    sectionContent = (
      <TaskTimeTracking
        enabled={timeTrackingEnabled}
        currentUserId={currentUserId}
        items={timeEntries}
        totalMinutes={totalTimeMinutes}
        loading={timeLoading}
        error={timeError}
        busy={timeBusy}
        onCreate={async (input) => {
          setTimeBusy(true);
          try { await createTaskTimeEntry(activeWorkspaceId, projectId, taskId, input); await loadTimeEntries(); }
          finally { setTimeBusy(false); }
        }}
        onUpdate={async (entryId, input) => {
          setTimeBusy(true);
          try { await updateTaskTimeEntry(activeWorkspaceId, projectId, taskId, entryId, input); await loadTimeEntries(); }
          finally { setTimeBusy(false); }
        }}
        onDelete={async (entryId) => {
          setTimeBusy(true);
          try { await deleteTaskTimeEntry(activeWorkspaceId, projectId, taskId, entryId); await loadTimeEntries(); }
          finally { setTimeBusy(false); }
        }}
      />
    );
  }

  const canLogTime = isAssignee || can('task.update');

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
      <TaskWorkspaceLayout
        activeSection={section}
        onSectionChange={updateSection}
        projectId={projectId}
        projectName={project?.name}
        header={header}
        assignees={task.assignees}
        assignedBy={workspaceData.people.assignedBy}
        reviewer={workspaceData.people.reviewer}
        startDate={workspaceData.schedule.startDate}
        dueDate={workspaceData.schedule.dueDate}
        overdue={workspaceData.schedule.overdue}
        recentActivity={workspaceData.recentActivity}
        onContactOwner={() => { if (task.creatorId) router.push(`/app/messages?userId=${encodeURIComponent(task.creatorId)}`); }}
        onReportBlocker={() => { updateSection('overview'); setShowBlockerForm(true); setBlockerError(null); setTimeout(() => document.getElementById('blockers')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
        canReportBlocker={isAssignee}
        timeTrackingEnabled={timeTrackingEnabled}
        totalTimeMinutes={totalTimeMinutes}
        onLogTime={timeTrackingEnabled && canLogTime ? () => updateSection('time') : undefined}
      >
        {sectionContent}
      </TaskWorkspaceLayout>
    </div>
  );
}
