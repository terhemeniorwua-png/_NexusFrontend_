import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

/**
 * Submission review contract from the merged BE-2 backend.
 *
 * Backend payloads are normalised on every response. Fields that a later
 * backend revision may add are optional in these frontend types so an older
 * response cannot crash the page.
 */
export type ReviewStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'CHANGES_REQUESTED';

export type ReviewTargetKind = 'attachmentVersion' | 'checklist' | 'task';

export type NormalizedReviewTargetKind = ReviewTargetKind | 'unknown';

export type ReviewDecisionType = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface ReviewResource {
  kind: NormalizedReviewTargetKind;
  id: string;
  /** Only present for checklist targets. */
  revision?: number;
}

export interface ReviewDecisionView {
  id: string;
  reviewId: string;
  round: number;
  decision: ReviewDecisionType;
  note: string | null;
  decidedById: string;
  decidedAt: string;
}

export interface ReviewView {
  id: string;
  workspaceId?: string;
  projectId?: string;
  resource: ReviewResource;
  status: ReviewStatus;
  round: number;
  assigneeId: string | null;
  submittedById: string;
  submittedAt?: string;
  checklistRevision?: number | null;
  /** Only the most recent decision is exposed by the backend. */
  lastDecision?: ReviewDecisionView | null;
  stale?: boolean;
  taskId?: string | null;
  artworkUrl?: string | null;
  decisions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewPage {
  items: ReviewView[];
  nextCursor: string | null;
}

export interface ReviewResult {
  review: ReviewView;
}

export interface ReviewDecisionResult {
  review: ReviewView;
  decision: ReviewDecisionView;
}

export interface ReviewQuery {
  targetKind?: ReviewTargetKind;
  targetId?: string;
  status?: ReviewStatus;
  assigneeId?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateReviewInput {
  attachmentVersionId?: string;
  checklistId?: string;
  assigneeId?: string;
}

export interface ApproveReviewInput {
  round: number;
  note?: string;
}

export interface RejectReviewInput {
  round: number;
  note: string;
}

export interface RequestChangesReviewInput {
  round: number;
  note: string;
}

type RequestOptions = RequestInit & { suppressPermissionEvents?: boolean };

/** Conflicts that must be surfaced verbatim and reconciled with a refetch. */
export const REVIEW_CONFLICT_CODES = new Set([
  'STALE_ROUND',
  'CHECKLIST_REVISION_STALE',
  'REVIEW_ALREADY_DECIDED',
  'REVIEW_ALREADY_OPEN',
  'REVIEW_ALREADY_APPROVED',
  'REVIEW_NOT_OPEN',
  'INVALID_STATUS_TRANSITION',
]);

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

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStatus(value: unknown): ReviewStatus {
  return value === 'SUBMITTED' ||
    value === 'UNDER_REVIEW' ||
    value === 'APPROVED' ||
    value === 'CHANGES_REQUESTED'
    ? value
    : 'SUBMITTED';
}

function asDecision(value: unknown): ReviewDecisionType | null {
  return value === 'APPROVED' || value === 'REJECTED' || value === 'CHANGES_REQUESTED'
    ? value
    : null;
}

function normaliseDecision(value: unknown): ReviewDecisionView | null {
  if (!isRecord(value)) return null;
  const decision = asDecision(value.decision);
  if (!decision) return null;
  return {
    id: asString(value.id),
    reviewId: asString(value.reviewId),
    round: asNumber(value.round, 1),
    decision,
    note: asNullableString(value.note),
    decidedById: asString(value.decidedById),
    decidedAt: asString(value.decidedAt),
  };
}

function normaliseReviewDecisions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === 'string') {
      const text = entry.trim();
      return text.length > 0 ? [text] : [];
    }
    if (!isRecord(entry)) return [];
    const text = typeof entry.text === 'string' ? entry.text.trim() : '';
    return text.length > 0 ? [text] : [];
  });
}

function normaliseReview(value: unknown): ReviewView {
  const data = isRecord(value) ? value : {};
  const resourceValue = isRecord(data.resource) ? data.resource : {};
  const taskId = asNullableString(data.taskId) ?? asNullableString(resourceValue.taskId);
  const attachmentVersionId = asNullableString(data.attachmentVersionId)
    ?? (resourceValue.kind === 'attachmentVersion' ? asNullableString(resourceValue.id) : null);
  const checklistId = asNullableString(data.checklistId)
    ?? (resourceValue.kind === 'checklist' ? asNullableString(resourceValue.id) : null);

  let kind: NormalizedReviewTargetKind = 'unknown';
  if (taskId || resourceValue.kind === 'task') {
    kind = 'task';
  } else if (checklistId || resourceValue.kind === 'checklist') {
    kind = 'checklist';
  } else if (attachmentVersionId || resourceValue.kind === 'attachmentVersion') {
    kind = 'attachmentVersion';
  }

  const resourceId = kind === 'task'
    ? (taskId ?? asString(resourceValue.id, asString(data.resourceId)))
    : kind === 'checklist'
      ? (checklistId ?? asString(resourceValue.id, asString(data.resourceId)))
      : kind === 'attachmentVersion'
        ? (attachmentVersionId ?? asString(resourceValue.id, asString(data.resourceId)))
        : asString(resourceValue.id, asString(data.resourceId));

  const resource: ReviewResource = { kind, id: resourceId };
  if (kind === 'checklist' && typeof resourceValue.revision === 'number') {
    resource.revision = resourceValue.revision;
  }

  const decisions = normaliseReviewDecisions(data.decisions);

  return {
    id: asString(data.id),
    workspaceId: asString(data.workspaceId),
    projectId: asString(data.projectId),
    resource,
    status: asStatus(data.status),
    round: asNumber(data.round, 1),
    assigneeId: asNullableString(data.assigneeId),
    submittedById: asString(data.submittedById, asString(data.submittedBy)),
    submittedAt: asString(data.submittedAt),
    checklistRevision: asNullableNumber(data.checklistRevision),
    lastDecision: normaliseDecision(data.lastDecision),
    stale: asBoolean(data.stale),
    taskId: kind === 'task' ? (taskId ?? (resourceId || null)) : null,
    artworkUrl: kind === 'task' ? asNullableString(data.artworkUrl) : null,
    decisions,
    createdAt: asString(data.createdAt),
    updatedAt: asString(data.updatedAt),
  };
}

function unwrapRecord(value: unknown, key: string): Record<string, unknown> {
  const data = isRecord(value) ? value : {};
  return isRecord(data[key]) ? data[key] as Record<string, unknown> : {};
}

function reviewsPath(
  workspaceId: string,
  projectId: string,
  reviewId?: string,
  suffix = '',
): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/reviews${
    reviewId ? `/${encodeURIComponent(reviewId)}` : ''
  }${suffix}`;
}

function querySuffix(query: ReviewQuery): string {
  const params = new URLSearchParams();
  if (query.targetKind) params.set('targetKind', query.targetKind);
  if (query.targetId) params.set('targetId', query.targetId);
  if (query.status) params.set('status', query.status);
  if (query.assigneeId) params.set('assigneeId', query.assigneeId);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  return params.size ? `?${params}` : '';
}

function post(path: string, body?: unknown): RequestOptions {
  return {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export async function listReviews(
  workspaceId: string,
  projectId: string,
  query: ReviewQuery = {},
): Promise<ReviewPage> {
  const data = await request<unknown>(
    `${reviewsPath(workspaceId, projectId)}${querySuffix(query)}`,
  );
  const record = isRecord(data) ? data : {};
  return {
    items: Array.isArray(record.items) ? record.items.map(normaliseReview) : [],
    nextCursor: asNullableString(record.nextCursor),
  };
}

export async function createReview(
  workspaceId: string,
  projectId: string,
  input: CreateReviewInput,
): Promise<ReviewResult> {
  const path = reviewsPath(workspaceId, projectId);
  const data = await request<unknown>(path, post(path, input));
  return { review: normaliseReview(unwrapRecord(data, 'review')) };
}

export async function getReview(
  workspaceId: string,
  projectId: string,
  reviewId: string,
): Promise<ReviewResult> {
  const data = await request<unknown>(reviewsPath(workspaceId, projectId, reviewId));
  return { review: normaliseReview(unwrapRecord(data, 'review')) };
}

export async function assignReview(
  workspaceId: string,
  projectId: string,
  reviewId: string,
  assigneeId: string,
): Promise<ReviewResult> {
  const path = reviewsPath(workspaceId, projectId, reviewId, '/assign');
  const data = await request<unknown>(path, post(path, { assigneeId }));
  return { review: normaliseReview(unwrapRecord(data, 'review')) };
}

export async function startReview(
  workspaceId: string,
  projectId: string,
  reviewId: string,
): Promise<ReviewResult> {
  const path = reviewsPath(workspaceId, projectId, reviewId, '/start');
  const data = await request<unknown>(path, post(path));
  return { review: normaliseReview(unwrapRecord(data, 'review')) };
}

export async function resubmitReview(
  workspaceId: string,
  projectId: string,
  reviewId: string,
  round: number,
): Promise<ReviewResult> {
  const path = reviewsPath(workspaceId, projectId, reviewId, '/resubmit');
  const data = await request<unknown>(path, post(path, { round }));
  return { review: normaliseReview(unwrapRecord(data, 'review')) };
}

function normaliseDecisionResult(value: unknown): ReviewDecisionResult {
  return {
    review: normaliseReview(unwrapRecord(value, 'review')),
    decision: normaliseDecision(unwrapRecord(value, 'decision')) ?? {
      id: '',
      reviewId: '',
      round: 0,
      decision: 'APPROVED',
      note: null,
      decidedById: '',
      decidedAt: '',
    },
  };
}

export async function approveReview(
  workspaceId: string,
  projectId: string,
  reviewId: string,
  input: ApproveReviewInput,
): Promise<ReviewDecisionResult> {
  const path = reviewsPath(workspaceId, projectId, reviewId, '/approve');
  const data = await request<unknown>(path, post(path, input));
  return normaliseDecisionResult(data);
}

export async function rejectReview(
  workspaceId: string,
  projectId: string,
  reviewId: string,
  input: RejectReviewInput,
): Promise<ReviewDecisionResult> {
  const path = reviewsPath(workspaceId, projectId, reviewId, '/reject');
  const data = await request<unknown>(path, post(path, input));
  return normaliseDecisionResult(data);
}

export async function requestChangesReview(
  workspaceId: string,
  projectId: string,
  reviewId: string,
  input: RequestChangesReviewInput,
): Promise<ReviewDecisionResult> {
  const path = reviewsPath(workspaceId, projectId, reviewId, '/request-changes');
  const data = await request<unknown>(path, post(path, input));
  return normaliseDecisionResult(data);
}
