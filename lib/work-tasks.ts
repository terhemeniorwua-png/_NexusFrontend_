import { listProjects } from '@/services/projects';
import { listMineTasks, listTasks, type ListTasksQuery } from '@/services/tasks';

type TaskItem = Awaited<ReturnType<typeof listTasks>>['items'][number];
export type MyTask = TaskItem & { projectName: string; projectKeyLabel: string };

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out.')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * Tasks assigned to one user across every project in a workspace.
 * Fetches each project's tasks with its real id. A project that fails is
 * skipped; only if every project fails does this throw.
 */
export async function listMyTasks(
  workspaceId: string,
  userId: string,
  query: ListTasksQuery = {},
): Promise<{ items: MyTask[] }> {
  try {
    const result = await withTimeout(
      listMineTasks(workspaceId, { status: query.status, priority: query.priority, limit: query.limit }),
    );
    return { items: result.items };
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error;
    return listMyTasksLegacy(workspaceId, userId, query);
  }
}

async function listMyTasksLegacy(
  workspaceId: string,
  userId: string,
  query: ListTasksQuery = {},
): Promise<{ items: MyTask[] }> {
  const projects = await withTimeout(listProjects(workspaceId, { limit: 100 }));
  const results = await Promise.allSettled(
    projects.items.map(async (project) => {
      const page = await withTimeout(listTasks(workspaceId, project.id, { ...query, assigneeId: userId, limit: 100 }));
      return page.items.map((t) => ({
        ...t,
        projectName: project.name,
        projectKeyLabel: project.key,
      }));
    }),
  );
  const ok = results.filter((r): r is PromiseFulfilledResult<MyTask[]> => r.status === 'fulfilled');
  if (projects.items.length > 0 && ok.length === 0) throw new Error('Tasks could not be loaded.');
  return { items: ok.flatMap((r) => r.value) };
}
