import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

export interface Department {
  id: string;
  workspaceId: string;
  name: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  leadId: string | null;
  lead: { id: string; name: string; email: string } | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'TEAM_LEAD' | 'MEMBER';
  name: string;
  email: string;
  joinedAt: string;
}

export interface InstitutionGroup {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  leadId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { members: number };
}

export interface InstitutionGroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'LEAD' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, authenticated: true });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}

const wsPath = (workspaceId: string, suffix: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}${suffix}`;

export const listDepartments = (workspaceId: string) =>
  request<Department[]>(wsPath(workspaceId, '/departments'));
export const createDepartment = (workspaceId: string, name: string) =>
  request<Department>(wsPath(workspaceId, '/departments'), { method: 'POST', body: JSON.stringify({ name }) });
export const renameDepartment = (workspaceId: string, departmentId: string, name: string) =>
  request<Department>(wsPath(workspaceId, `/departments/${encodeURIComponent(departmentId)}`), { method: 'PATCH', body: JSON.stringify({ name }) });
export const assignDepartmentMember = (workspaceId: string, departmentId: string, targetUserId: string, role: 'HEAD' | 'MEMBER') =>
  request<{ userId: string; assigned: true }>(wsPath(workspaceId, `/departments/${encodeURIComponent(departmentId)}/members`), { method: 'POST', body: JSON.stringify({ targetUserId, role }) });

export const listTeams = (workspaceId: string, includeArchived = false) =>
  request<Team[]>(wsPath(workspaceId, `/teams${includeArchived ? '?includeArchived=true' : ''}`));
export const getTeam = (workspaceId: string, teamId: string) =>
  request<Team>(wsPath(workspaceId, `/teams/${encodeURIComponent(teamId)}`));
export const createTeam = (workspaceId: string, input: { name: string; description?: string | null; departmentId?: string | null; leadId?: string | null }) =>
  request<Team>(wsPath(workspaceId, '/teams'), { method: 'POST', body: JSON.stringify(input) });
export const updateTeam = (workspaceId: string, teamId: string, input: { name?: string; description?: string | null; departmentId?: string | null }) =>
  request<Team>(wsPath(workspaceId, `/teams/${encodeURIComponent(teamId)}`), { method: 'PATCH', body: JSON.stringify(input) });
export const archiveTeam = (workspaceId: string, teamId: string) =>
  request<Team>(wsPath(workspaceId, `/teams/${encodeURIComponent(teamId)}/archive`), { method: 'POST' });
export const listTeamMembers = (workspaceId: string, teamId: string) =>
  request<TeamMember[]>(wsPath(workspaceId, `/teams/${encodeURIComponent(teamId)}/members`));
export const addTeamMember = (workspaceId: string, teamId: string, userId: string, role: TeamMember['role'] = 'MEMBER') =>
  request<TeamMember>(wsPath(workspaceId, `/teams/${encodeURIComponent(teamId)}/members`), { method: 'POST', body: JSON.stringify({ userId, role }) });
export const removeTeamMember = (workspaceId: string, teamId: string, userId: string) =>
  request<{ userId: string; removed: true }>(wsPath(workspaceId, `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`), { method: 'DELETE' });
export const setTeamLead = (workspaceId: string, teamId: string, leadId: string | null) =>
  request<Team>(wsPath(workspaceId, `/teams/${encodeURIComponent(teamId)}/lead`), { method: 'PATCH', body: JSON.stringify({ leadId }) });

export const listInstitutionGroups = (workspaceId: string) =>
  request<InstitutionGroup[]>(wsPath(workspaceId, '/institution-groups'));
export const createInstitutionGroup = (workspaceId: string, input: { name: string; description?: string | null; leadId?: string | null }) =>
  request<InstitutionGroup>(wsPath(workspaceId, '/institution-groups'), { method: 'POST', body: JSON.stringify(input) });
export const updateInstitutionGroup = (workspaceId: string, groupId: string, input: { name?: string; description?: string | null; leadId?: string | null }) =>
  request<InstitutionGroup>(wsPath(workspaceId, `/institution-groups/${encodeURIComponent(groupId)}`), { method: 'PATCH', body: JSON.stringify(input) });
export const deleteInstitutionGroup = (workspaceId: string, groupId: string) =>
  request<{ id: string; deleted: true }>(wsPath(workspaceId, `/institution-groups/${encodeURIComponent(groupId)}`), { method: 'DELETE' });
export const listInstitutionGroupMembers = (workspaceId: string, groupId: string) =>
  request<InstitutionGroupMember[]>(wsPath(workspaceId, `/institution-groups/${encodeURIComponent(groupId)}/members`));
export const addInstitutionGroupMember = (workspaceId: string, groupId: string, userId: string, role: InstitutionGroupMember['role'] = 'MEMBER') =>
  request<InstitutionGroupMember>(wsPath(workspaceId, `/institution-groups/${encodeURIComponent(groupId)}/members`), { method: 'POST', body: JSON.stringify({ userId, role }) });
export const updateInstitutionGroupMember = (workspaceId: string, groupId: string, userId: string, role: InstitutionGroupMember['role']) =>
  request<InstitutionGroupMember>(wsPath(workspaceId, `/institution-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`), { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeInstitutionGroupMember = (workspaceId: string, groupId: string, userId: string) =>
  request<{ userId: string; removed: true }>(wsPath(workspaceId, `/institution-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`), { method: 'DELETE' });
