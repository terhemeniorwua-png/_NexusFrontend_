import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

/**
 * Project checklist contract from the merged BE-4 backend.
 *
 * Fields added by later backend revisions are optional in these frontend types
 * and normalised on every response so an older payload cannot crash a page.
 */
export interface ChecklistSummary {
  id: string;
  workspaceId?: string;
  projectId?: string;
  title: string;
  description?: string | null;
  revision?: number;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChecklistPage {
  items: ChecklistSummary[];
  nextCursor: string | null;
}

export interface ChecklistItem {
  id: string;
  checklistId?: string;
  position?: number;
  text: string;
  completed?: boolean;
  completedById?: string | null;
  completedAt?: string | null;
  signedOffById?: string | null;
  signedOffAt?: string | null;
}

export interface ChecklistItemList {
  items: ChecklistItem[];
}

export interface ChecklistItemsResult {
  items: ChecklistItem[];
  revision?: number;
}

export interface ChecklistItemResult {
  item: ChecklistItem;
  revision?: number;
}

export interface ChecklistFeedback {
  id: string;
  checklistItemId?: string;
  authorId: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  editedAt?: string | null;
}

export interface ChecklistFeedbackPage {
  items: ChecklistFeedback[];
  nextCursor: string | null;
}

export interface ChecklistResult {
  checklist: ChecklistSummary;
}

export interface OkResult {
  ok: boolean;
}

export interface ChecklistItemDeleteResult extends OkResult {
  revision?: number;
}

export interface ChecklistInput {
  title: string;
  description?: string | null;
}

export interface ChecklistUpdate {
  title?: string;
  description?: string | null;
}

export interface FeedbackInput {
  body: string;
}

export interface ChecklistQuery {
  cursor?: string;
  limit?: number;
}

type RequestOptions = RequestInit & { suppressPermissionEvents?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, authenticated: true });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function arrayOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(isRecord)
    : [];
}

function normaliseChecklist(value: unknown): ChecklistSummary {
  const data = isRecord(value) ? value : {};
  return {
    id: asString(data.id),
    workspaceId: asString(data.workspaceId),
    projectId: asString(data.projectId),
    title: asString(data.title, 'Untitled checklist'),
    description: asNullableString(data.description),
    revision: asNumber(data.revision),
    createdById: asString(data.createdById),
    createdAt: asString(data.createdAt),
    updatedAt: asString(data.updatedAt),
  };
}

function normaliseItem(value: unknown): ChecklistItem {
  const data = isRecord(value) ? value : {};
  return {
    id: asString(data.id),
    checklistId: asString(data.checklistId),
    position: asNumber(data.position),
    text: asString(data.text),
    completed: asBoolean(data.completed),
    completedById: asNullableString(data.completedById),
    completedAt: asNullableString(data.completedAt),
    signedOffById: asNullableString(data.signedOffById),
    signedOffAt: asNullableString(data.signedOffAt),
  };
}

function normaliseFeedback(value: unknown): ChecklistFeedback {
  const data = isRecord(value) ? value : {};
  return {
    id: asString(data.id),
    checklistItemId: asString(data.checklistItemId),
    authorId: asString(data.authorId),
    body: asString(data.body),
    createdAt: asString(data.createdAt),
    updatedAt: asString(data.updatedAt),
    editedAt: asNullableString(data.editedAt),
  };
}

function normalisePage<T>(
  value: unknown,
  normalise: (entry: unknown) => T,
): { items: T[]; nextCursor: string | null } {
  const data = isRecord(value) ? value : {};
  return {
    items: arrayOf(data.items).map(normalise),
    nextCursor: asNullableString(data.nextCursor),
  };
}

function unwrapRecord(value: unknown, key: string): Record<string, unknown> {
  const data = isRecord(value) ? value : {};
  return isRecord(data[key]) ? data[key] as Record<string, unknown> : {};
}

function checklistPath(
  workspaceId: string,
  projectId: string,
  checklistId?: string,
  suffix = '',
): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/checklists${
    checklistId ? `/${encodeURIComponent(checklistId)}` : ''
  }${suffix}`;
}

function itemPath(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId?: string,
  suffix = '',
): string {
  return `${checklistPath(workspaceId, projectId, checklistId, '/items')}${
    itemId ? `/${encodeURIComponent(itemId)}` : ''
  }${suffix}`;
}

function feedbackPath(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
  feedbackId?: string,
): string {
  return `${itemPath(workspaceId, projectId, checklistId, itemId, '/feedback')}${
    feedbackId ? `/${encodeURIComponent(feedbackId)}` : ''
  }`;
}

function querySuffix(query: ChecklistQuery): string {
  const params = new URLSearchParams();
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  return params.size ? `?${params}` : '';
}

export async function listChecklists(
  workspaceId: string,
  projectId: string,
  query: ChecklistQuery = {},
): Promise<ChecklistPage> {
  const data = await request<unknown>(`${checklistPath(workspaceId, projectId)}${querySuffix(query)}`);
  return normalisePage(data, normaliseChecklist);
}

export async function createChecklist(
  workspaceId: string,
  projectId: string,
  input: ChecklistInput,
): Promise<ChecklistResult> {
  const data = await request<unknown>(checklistPath(workspaceId, projectId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { checklist: normaliseChecklist(unwrapRecord(data, 'checklist')) };
}

export async function getChecklist(
  workspaceId: string,
  projectId: string,
  checklistId: string,
): Promise<ChecklistResult> {
  const data = await request<unknown>(checklistPath(workspaceId, projectId, checklistId));
  return { checklist: normaliseChecklist(unwrapRecord(data, 'checklist')) };
}

export async function updateChecklist(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  input: ChecklistUpdate,
): Promise<ChecklistResult> {
  const data = await request<unknown>(checklistPath(workspaceId, projectId, checklistId), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return { checklist: normaliseChecklist(unwrapRecord(data, 'checklist')) };
}

export async function deleteChecklist(
  workspaceId: string,
  projectId: string,
  checklistId: string,
): Promise<OkResult> {
  const data = await request<unknown>(checklistPath(workspaceId, projectId, checklistId), {
    method: 'DELETE',
  });
  return { ok: isRecord(data) ? asBoolean(data.ok) : false };
}

export async function listChecklistItems(
  workspaceId: string,
  projectId: string,
  checklistId: string,
): Promise<ChecklistItemList> {
  const data = await request<unknown>(itemPath(workspaceId, projectId, checklistId));
  return { items: arrayOf(isRecord(data) ? data.items : []).map(normaliseItem) };
}

export async function createChecklistItem(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  input: { text: string },
): Promise<ChecklistItemResult> {
  const data = await request<unknown>(itemPath(workspaceId, projectId, checklistId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return {
    item: normaliseItem(unwrapRecord(data, 'item')),
    revision: asNumber(isRecord(data) ? data.revision : undefined),
  };
}

export async function reorderChecklistItems(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  input: { itemIds: string[] },
): Promise<ChecklistItemsResult> {
  const data = await request<unknown>(
    `${itemPath(workspaceId, projectId, checklistId)}/reorder`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  const record = isRecord(data) ? data : {};
  return {
    items: arrayOf(record.items).map(normaliseItem),
    revision: asNumber(record.revision),
  };
}

export async function updateChecklistItem(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
  input: { text: string },
): Promise<ChecklistItemResult> {
  const data = await request<unknown>(itemPath(workspaceId, projectId, checklistId, itemId), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return {
    item: normaliseItem(unwrapRecord(data, 'item')),
    revision: asNumber(isRecord(data) ? data.revision : undefined),
  };
}

export async function deleteChecklistItem(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
): Promise<ChecklistItemDeleteResult> {
  const data = await request<unknown>(itemPath(workspaceId, projectId, checklistId, itemId), {
    method: 'DELETE',
  });
  const record = isRecord(data) ? data : {};
  return { ok: asBoolean(record.ok), revision: asNumber(record.revision) };
}

async function mutateItem(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
  suffix: string,
  method: 'POST' | 'DELETE',
): Promise<ChecklistItemResult> {
  const data = await request<unknown>(
    itemPath(workspaceId, projectId, checklistId, itemId, suffix),
    { method },
  );
  return {
    item: normaliseItem(unwrapRecord(data, 'item')),
    revision: asNumber(isRecord(data) ? data.revision : undefined),
  };
}

export const completeChecklistItem = (
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
): Promise<ChecklistItemResult> =>
  mutateItem(workspaceId, projectId, checklistId, itemId, '/complete', 'POST');

export const uncompleteChecklistItem = (
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
): Promise<ChecklistItemResult> =>
  mutateItem(workspaceId, projectId, checklistId, itemId, '/uncomplete', 'POST');

export const signOffChecklistItem = (
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
): Promise<ChecklistItemResult> =>
  mutateItem(workspaceId, projectId, checklistId, itemId, '/sign-off', 'POST');

export const removeChecklistItemSignOff = (
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
): Promise<ChecklistItemResult> =>
  mutateItem(workspaceId, projectId, checklistId, itemId, '/sign-off', 'DELETE');

export async function listChecklistFeedback(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
  query: ChecklistQuery = {},
): Promise<ChecklistFeedbackPage> {
  const data = await request<unknown>(`${feedbackPath(workspaceId, projectId, checklistId, itemId)}${querySuffix(query)}`);
  return normalisePage(data, normaliseFeedback);
}

export async function createChecklistFeedback(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
  input: FeedbackInput,
): Promise<{ feedback: ChecklistFeedback }> {
  const data = await request<unknown>(feedbackPath(workspaceId, projectId, checklistId, itemId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { feedback: normaliseFeedback(unwrapRecord(data, 'feedback')) };
}

export async function updateChecklistFeedback(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
  feedbackId: string,
  input: FeedbackInput,
): Promise<{ feedback: ChecklistFeedback }> {
  const data = await request<unknown>(
    feedbackPath(workspaceId, projectId, checklistId, itemId, feedbackId),
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  return { feedback: normaliseFeedback(unwrapRecord(data, 'feedback')) };
}

export async function deleteChecklistFeedback(
  workspaceId: string,
  projectId: string,
  checklistId: string,
  itemId: string,
  feedbackId: string,
): Promise<OkResult> {
  const data = await request<unknown>(
    feedbackPath(workspaceId, projectId, checklistId, itemId, feedbackId),
    { method: 'DELETE' },
  );
  return { ok: isRecord(data) ? asBoolean(data.ok) : false };
}
