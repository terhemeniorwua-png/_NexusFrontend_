import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ProjectVisibility = 'PRIVATE' | 'DEPARTMENT_TEAM' | 'WORKSPACE';
export type ProjectRole = 'PROJECT_MANAGER' | 'MEMBER' | 'VIEWER';

export interface ProjectSummary {
  id: string; workspaceId: string; teamId: string | null; departmentId: string | null;
  name: string; key: string; description: string | null; category: string | null; labels: string[];
  status: ProjectStatus; visibility: ProjectVisibility; startDate: string | null; dueDate: string | null;
  ownerId: string; owner: { id: string; name: string }; memberCount: number; taskCount: number;
  myRole: ProjectRole | null; createdAt: string; updatedAt: string;
}
export interface ProjectPage { items: ProjectSummary[]; nextCursor: string | null }
export interface ProjectInput {
  name: string; key: string; description?: string | null; category?: string | null; labels?: string[];
  visibility?: ProjectVisibility; teamId?: string | null; departmentId?: string | null;
  startDate?: string | null; dueDate?: string | null;
}
export type ProjectUpdate = Partial<ProjectInput> & { status?: Exclude<ProjectStatus, 'ARCHIVED'> };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try { return await apiRequest<T>(path, { ...options, authenticated: true }); }
  catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}
const path = (workspaceId: string, projectId?: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/projects${projectId ? `/${encodeURIComponent(projectId)}` : ''}${suffix}`;

export function listProjects(workspaceId: string, query: { cursor?: string; limit?: number; status?: ProjectStatus; visibility?: ProjectVisibility; teamId?: string; departmentId?: string; search?: string; includeArchived?: boolean } = {}): Promise<ProjectPage> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return request<ProjectPage>(`${path(workspaceId)}${params.size ? `?${params}` : ''}`);
}
export const getProject = (workspaceId: string, projectId: string) => request<ProjectSummary>(path(workspaceId, projectId));
export const createProject = (workspaceId: string, input: ProjectInput) => request<ProjectSummary>(path(workspaceId), { method: 'POST', body: JSON.stringify(input) });
export const updateProject = (workspaceId: string, projectId: string, input: ProjectUpdate) => request<ProjectSummary>(path(workspaceId, projectId), { method: 'PATCH', body: JSON.stringify(input) });
export const archiveProject = (workspaceId: string, projectId: string) => request<{ id: string; status: 'ARCHIVED' }>(path(workspaceId, projectId, '/archive'), { method: 'POST' });
export const restoreProject = (workspaceId: string, projectId: string) => request<{ id: string; status: Exclude<ProjectStatus, 'ARCHIVED'> }>(path(workspaceId, projectId, '/restore'), { method: 'POST' });
export const updateProjectOrganizationAccess = (workspaceId: string, projectId: string, input: { teamId?: string | null; departmentId?: string | null }) => request<{ id: string; workspaceId: string; teamId: string | null; departmentId: string | null }>(path(workspaceId, projectId, '/organizational-access'), { method: 'PATCH', body: JSON.stringify(input) });

// The backend source defines these records; OpenAPI currently documents their
// operations but omits response schemas. Keep these functions typed to those
// inspected source shapes and flag the schema omission in project documentation.
export interface ProjectMember { userId: string; role: ProjectRole; createdAt: string; user: { id: string; name: string; email: string } }
export interface ProjectActivity { id: string; action: string; actorId: string; metadata: unknown; createdAt: string }
export interface ProjectActivityPage { items: ProjectActivity[]; nextCursor: string | null }
export interface ProjectMilestone { id: string; projectId: string; name: string; description: string | null; dueDate: string | null; completedAt: string | null; position: number; createdAt: string; updatedAt: string }
export const listProjectMembers = (workspaceId: string, projectId: string) => request<ProjectMember[]>(path(workspaceId, projectId, '/members'));
export const addProjectMember = (workspaceId: string, projectId: string, userId: string, role: ProjectRole = 'MEMBER') => request<{ projectId: string; userId: string; role: ProjectRole; createdAt: string }>(path(workspaceId, projectId, '/members'), { method: 'POST', body: JSON.stringify({ userId, role }) });
export const updateProjectMember = (workspaceId: string, projectId: string, userId: string, role: ProjectRole) => request<{ projectId: string; userId: string; role: ProjectRole; createdAt: string }>(path(workspaceId, projectId, `/members/${encodeURIComponent(userId)}`), { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeProjectMember = (workspaceId: string, projectId: string, userId: string) => request<{ projectId: string; userId: string; removed: true }>(path(workspaceId, projectId, `/members/${encodeURIComponent(userId)}`), { method: 'DELETE' });
export const listProjectActivity = (workspaceId: string, projectId: string, query: { cursor?: string; limit?: number } = {}) => { const params = new URLSearchParams(); if (query.cursor) params.set('cursor', query.cursor); if (query.limit) params.set('limit', String(query.limit)); return request<ProjectActivityPage>(`${path(workspaceId, projectId, '/activity')}${params.size ? `?${params}` : ''}`); };
export const listProjectMilestones = (workspaceId: string, projectId: string) => request<ProjectMilestone[]>(path(workspaceId, projectId, '/milestones'));
export const createProjectMilestone = (workspaceId: string, projectId: string, input: { name: string; description?: string | null; dueDate?: string | null; position?: number }) => request<ProjectMilestone>(path(workspaceId, projectId, '/milestones'), { method: 'POST', body: JSON.stringify(input) });
export const updateProjectMilestone = (workspaceId: string, projectId: string, milestoneId: string, input: { name?: string; description?: string | null; dueDate?: string | null; completed?: boolean; position?: number }) => request<ProjectMilestone>(path(workspaceId, projectId, `/milestones/${encodeURIComponent(milestoneId)}`), { method: 'PATCH', body: JSON.stringify(input) });
export const deleteProjectMilestone = (workspaceId: string, projectId: string, milestoneId: string) => request<{ id: string; deleted: true }>(path(workspaceId, projectId, `/milestones/${encodeURIComponent(milestoneId)}`), { method: 'DELETE' });
