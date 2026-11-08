/**
 * services/forms.ts
 *
 * Forms and Surveys service for the Nexus platform.
 *
 * All routes are at /api/v1/workspaces/:workspaceId/forms
 * forwarded via /api/backend/workspaces/:workspaceId/forms
 *
 * ─── Verified backend contract (2026-11-08) ─────────────────────────────────
 *
 * GET    /workspaces/:wsId/forms              list — {items, nextCursor}
 *   query: cursor?, limit?, status?
 *
 * POST   /workspaces/:wsId/forms              create — FormSummary (201)
 *   body: { title, description?, isPublic? }
 *
 * GET    /workspaces/:wsId/forms/:formId      get single — FormDetail
 *   (includes fields and response count)
 *
 * PATCH  /workspaces/:wsId/forms/:formId      update — FormDetail
 *   body: { title?, description?, isPublic?, status? }
 *
 * DELETE /workspaces/:wsId/forms/:formId      soft-delete — {ok: true}
 *
 * POST   /workspaces/:wsId/forms/:formId/fields   add field — FormField (201)
 *   body: { label, type, required?, options?, placeholder?, position? }
 *
 * POST   /workspaces/:wsId/forms/:formId/responses   submit response — {ok: true} (201)
 *   body: { answers: [{fieldId, value}] }
 *
 * GET    /workspaces/:wsId/forms/:formId/responses   list responses — {items, nextCursor}
 *   query: cursor?, limit?
 *
 * Field types: TEXT | TEXTAREA | NUMBER | EMAIL | SELECT | MULTISELECT |
 *              RADIO | CHECKBOX | DATE | RATING | SCALE
 *
 * Form statuses: DRAFT | PUBLISHED | CLOSED | ARCHIVED
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type FormFieldType =
  | 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'EMAIL'
  | 'SELECT' | 'MULTISELECT' | 'RADIO' | 'CHECKBOX'
  | 'DATE' | 'RATING' | 'SCALE';

export interface FormField {
  id: string;
  formId: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  placeholder: string | null;
  position: number;
  createdAt: string;
}

/** Summary returned by list endpoint (no fields, but has response count). */
export interface FormSummary {
  id: string;
  workspaceId: string;
  createdById: string;
  title: string;
  description: string | null;
  status: FormStatus;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { responses: number };
}

/** Full form returned by get/update (includes fields and response count). */
export interface FormDetail extends Omit<FormSummary, '_count'> {
  fields: FormField[];
  _count: { responses: number };
}

export interface FormResponseAnswer {
  fieldId: string;
  value: string;
  field: { label: string; type: string };
}

export interface FormResponse {
  id: string;
  formId: string;
  submittedBy: string;
  createdAt: string;
  answers: FormResponseAnswer[];
}

export interface ListFormsParams {
  cursor?: string;
  limit?: number;
  status?: FormStatus;
}

export interface CreateFormInput {
  title: string;
  description?: string | null;
  isPublic?: boolean;
}

export interface UpdateFormInput {
  title?: string;
  description?: string | null;
  isPublic?: boolean;
  status?: FormStatus;
}

export interface FormFieldInput {
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string | null;
  position?: number;
}

export interface SubmitResponseInput {
  answers: Array<{ fieldId: string; value: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base(workspaceId: string): string {
  return `/workspaces/${workspaceId}/forms`;
}

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

// ─── API functions ────────────────────────────────────────────────────────────

/** List forms in a workspace with optional status filter and cursor pagination. */
export async function listForms(
  workspaceId: string,
  params: ListFormsParams = {},
): Promise<{ items: FormSummary[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  const qs = q.toString();
  return authed<{ items: FormSummary[]; nextCursor: string | null }>(
    `${base(workspaceId)}${qs ? `?${qs}` : ''}`,
  );
}

/** Get a single form with its fields and response count. */
export async function getForm(workspaceId: string, formId: string): Promise<FormDetail> {
  return authed<FormDetail>(`${base(workspaceId)}/${formId}`);
}

/** Create a new form. */
export async function createForm(
  workspaceId: string,
  input: CreateFormInput,
): Promise<FormDetail> {
  return authed<FormDetail>(base(workspaceId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** Update a form's title, description, isPublic, or status. */
export async function updateForm(
  workspaceId: string,
  formId: string,
  input: UpdateFormInput,
): Promise<FormDetail> {
  return authed<FormDetail>(`${base(workspaceId)}/${formId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** Soft-delete a form. */
export async function deleteForm(workspaceId: string, formId: string): Promise<{ ok: true }> {
  return authed<{ ok: true }>(`${base(workspaceId)}/${formId}`, { method: 'DELETE' });
}

/** Add a field to a form. */
export async function addFormField(
  workspaceId: string,
  formId: string,
  input: FormFieldInput,
): Promise<FormField> {
  return authed<FormField>(`${base(workspaceId)}/${formId}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** Submit a response to a form. */
export async function submitFormResponse(
  workspaceId: string,
  formId: string,
  input: SubmitResponseInput,
): Promise<{ ok: true }> {
  return authed<{ ok: true }>(`${base(workspaceId)}/${formId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** List responses for a form (creator/manager only). */
export async function listFormResponses(
  workspaceId: string,
  formId: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<{ items: FormResponse[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return authed<{ items: FormResponse[]; nextCursor: string | null }>(
    `${base(workspaceId)}/${formId}/responses${qs ? `?${qs}` : ''}`,
  );
}
