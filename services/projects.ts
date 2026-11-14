import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ProjectVisibility = 'PRIVATE' | 'DEPARTMENT_TEAM' | 'WORKSPACE';

/** Project-level roles returned by GET /project-roles and the permissions endpoint. */
export const PROJECT_ROLES = ['PROJECT_MANAGER', 'MEMBER', 'COLLABORATOR', 'VIEWER'] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

/** Source of the caller's effective project access. */
export type ProjectAccessSource = 'workspace_admin' | 'project_member';

/**
 * Project permissions exposed by GET /permissions.
 *
 * The backend remains the only authority for these checks. The frontend uses
 * this list to hide or disable controls, never to grant access.
 */
export const PROJECT_PERMISSIONS = [
  'project.view',
  'project.update',
  'project.archive',
  'project.delete',
  'project.settings.manage',
  'project.member.manage',
  'project.report.view',
  'task.view',
  'task.create',
  'task.update',
  'task.delete',
  'task.assign',
  'task.reassign',
  'task.complete',
  'task.comment',
  'file.upload',
  'file.delete.own',
  'file.delete.any',
  'submission.submit',
  'submission.review',
  'submission.approve',
  'submission.reject',
  'submission.request_revision',
] as const;

export type Permission = (typeof PROJECT_PERMISSIONS)[number];

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

/** Normalised payload of GET /workspaces/:workspaceId/projects/:projectId/permissions. */
export interface ProjectPermissions {
  projectId: string;
  workspaceRole: string;
  projectRole: ProjectRole | null;
  accessSource: ProjectAccessSource;
  permissions: Permission[];
  assignableRoles: ProjectRole[];
}

/** One entry of GET /workspaces/:workspaceId/project-roles. */
export interface ProjectRoleDefinition {
  role: ProjectRole;
  label: string;
  description: string;
  permissions: Permission[];
}

type RequestOptions = RequestInit & { suppressPermissionEvents?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try { return await apiRequest<T>(path, { ...options, authenticated: true }); }
  catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}
const path = (workspaceId: string, projectId?: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/projects${projectId ? `/${encodeURIComponent(projectId)}` : ''}${suffix}`;

// ---------------------------------------------------------------------------
// Response normalisation
//
// The permission endpoints are security-sensitive: a malformed or partial
// payload must fail closed (no permissions) and must never throw while a
// component renders. These helpers accept anything and always return a
// well-formed value.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
}

function isProjectRole(value: unknown): value is ProjectRole {
  return typeof value === 'string' && (PROJECT_ROLES as readonly string[]).includes(value);
}

function normalisePermissions(value: unknown): Permission[] {
  // Unknown permission strings are retained deliberately: the backend may add
  // a permission before the frontend knows about it, and `can()` simply returns
  // false for anything it is not asked about.
  return stringList(value) as Permission[];
}

function normaliseRoles(value: unknown): ProjectRole[] {
  return stringList(value).filter(isProjectRole);
}

export function normaliseProjectPermissions(
  data: unknown,
  fallbackProjectId: string,
): ProjectPermissions {
  const record = isRecord(data) ? data : {};
  return {
    projectId: typeof record.projectId === 'string' ? record.projectId : fallbackProjectId,
    workspaceRole: typeof record.workspaceRole === 'string' ? record.workspaceRole : '',
    projectRole: isProjectRole(record.projectRole) ? record.projectRole : null,
    accessSource: record.accessSource === 'project_member' ? 'project_member' : 'workspace_admin',
    permissions: normalisePermissions(record.permissions),
    assignableRoles: normaliseRoles(record.assignableRoles),
  };
}

function normaliseRoleDefinition(value: unknown): ProjectRoleDefinition | null {
  if (!isRecord(value) || !isProjectRole(value.role)) return null;
  return {
    role: value.role,
    label: typeof value.label === 'string' && value.label.trim()
      ? value.label
      : value.role.replaceAll('_', ' ').toLowerCase(),
    description: typeof value.description === 'string' ? value.description : '',
    permissions: normalisePermissions(value.permissions),
  };
}

/** Unwrap `{ items: [...] }` responses; tolerate a bare array for older shapes. */
function unwrapItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.items)) return value.items;
  return [];
}

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
export const deleteProject = (workspaceId: string, projectId: string) => request<{ id: string; deleted: true }>(path(workspaceId, projectId), { method: 'DELETE' });
export const updateProjectOrganizationAccess = (workspaceId: string, projectId: string, input: { teamId?: string | null; departmentId?: string | null }) => request<{ id: string; workspaceId: string; teamId: string | null; departmentId: string | null }>(path(workspaceId, projectId, '/organizational-access'), { method: 'PATCH', body: JSON.stringify(input) });

/**
 * Permissions for the caller in a single project. Fails closed: a malformed
 * payload becomes an empty permission list, and `PERMISSION_DENIED` events are
 * suppressed here so a failed permission refresh cannot recursively trigger
 * another refresh.
 */
export async function getProjectPermissions(workspaceId: string, projectId: string): Promise<ProjectPermissions> {
  const data = await request<unknown>(path(workspaceId, projectId, '/permissions'), { suppressPermissionEvents: true });
  return normaliseProjectPermissions(data, projectId);
}

/** Role catalogue for the workspace. Always returns an array. */
export async function listProjectRoles(workspaceId: string): Promise<ProjectRoleDefinition[]> {
  const data = await request<unknown>(`/workspaces/${encodeURIComponent(workspaceId)}/project-roles`, { suppressPermissionEvents: true });
  return unwrapItems(data)
    .map(normaliseRoleDefinition)
    .filter((entry): entry is ProjectRoleDefinition => entry !== null);
}

// The backend source defines these records; OpenAPI currently documents their
// operations but omits response schemas. Keep these functions typed to those
// inspected source shapes and flag the schema omission in project documentation.
export interface ProjectMember { userId: string; role: ProjectRole; createdAt: string; user: { id: string; name: string; email: string } }
export interface ProjectActivity { id: string; action: string; actorId: string; metadata: unknown; createdAt: string }
export interface ProjectActivityPage { items: ProjectActivity[]; nextCursor: string | null }
export interface ProjectMilestone { id: string; projectId: string; name: string; description: string | null; dueDate: string | null; completedAt: string | null; position: number; createdAt: string; updatedAt: string }
export const listProjectMembers = async (workspaceId: string, projectId: string): Promise<ProjectMember[]> =>
  unwrapItems(await request<unknown>(path(workspaceId, projectId, '/members'))) as ProjectMember[];
export const addProjectMember = (workspaceId: string, projectId: string, userId: string, role: ProjectRole = 'MEMBER') => request<{ projectId: string; userId: string; role: ProjectRole; createdAt: string }>(path(workspaceId, projectId, '/members'), { method: 'POST', body: JSON.stringify({ userId, role }) });
export const updateProjectMember = (workspaceId: string, projectId: string, userId: string, role: ProjectRole) => request<{ projectId: string; userId: string; role: ProjectRole; createdAt: string }>(path(workspaceId, projectId, `/members/${encodeURIComponent(userId)}`), { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeProjectMember = (workspaceId: string, projectId: string, userId: string) => request<{ projectId: string; userId: string; removed: true }>(path(workspaceId, projectId, `/members/${encodeURIComponent(userId)}`), { method: 'DELETE' });
export const listProjectActivity = (workspaceId: string, projectId: string, query: { cursor?: string; limit?: number } = {}) => { const params = new URLSearchParams(); if (query.cursor) params.set('cursor', query.cursor); if (query.limit) params.set('limit', String(query.limit)); return request<ProjectActivityPage>(`${path(workspaceId, projectId, '/activity')}${params.size ? `?${params}` : ''}`); };
export const listProjectMilestones = async (workspaceId: string, projectId: string): Promise<ProjectMilestone[]> =>
  unwrapItems(await request<unknown>(path(workspaceId, projectId, '/milestones'))) as ProjectMilestone[];
export const createProjectMilestone = (workspaceId: string, projectId: string, input: { name: string; description?: string | null; dueDate?: string | null; position?: number }) => request<ProjectMilestone>(path(workspaceId, projectId, '/milestones'), { method: 'POST', body: JSON.stringify(input) });
export const updateProjectMilestone = (workspaceId: string, projectId: string, milestoneId: string, input: { name?: string; description?: string | null; dueDate?: string | null; completed?: boolean; position?: number }) => request<ProjectMilestone>(path(workspaceId, projectId, `/milestones/${encodeURIComponent(milestoneId)}`), { method: 'PATCH', body: JSON.stringify(input) });
export const deleteProjectMilestone = (workspaceId: string, projectId: string, milestoneId: string) => request<{ id: string; deleted: true }>(path(workspaceId, projectId, `/milestones/${encodeURIComponent(milestoneId)}`), { method: 'DELETE' });

// Ownership transfer
export interface ProjectOwnershipTransferResult {
  projectId: string; previousOwnerId: string; ownerId: string; ownerRole: 'PROJECT_MANAGER';
  previousOwnerRole: 'MANAGER' | 'MEMBER' | 'REMOVE';
  previousOwnerResultingRole: 'PROJECT_MANAGER' | 'MEMBER' | 'REMOVED';
  forcedAdminTransfer: boolean; updatedAt: string;
}
export const transferProjectOwnership = (workspaceId: string, projectId: string, input: { newOwnerId: string; previousOwnerRole?: 'MANAGER' | 'MEMBER' | 'REMOVE' }) =>
  request<ProjectOwnershipTransferResult>(path(workspaceId, projectId, '/transfer-ownership'), { method: 'POST', body: JSON.stringify(input) });
