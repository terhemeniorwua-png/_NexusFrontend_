'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { ProjectUnavailableState } from '@/components/shared/PageAccessState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import { ApiRequestError } from '@/lib/api';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import * as checklistService from '@/services/checklists';
import type {
  ChecklistFeedback,
  ChecklistFeedbackPage,
  ChecklistItem,
  ChecklistSummary,
} from '@/services/checklists';
import { listWorkspaceMembers } from '@/services/workspaces';

const MAX_LIVE_ITEMS = 200;
const ITEM_TEXT_LIMIT = 500;
const FEEDBACK_LIMIT = 4000;
const TITLE_LIMIT = 200;
const DESCRIPTION_LIMIT = 2000;
const PAGE_LIMIT = 25;
const ITEM_LIMIT_MESSAGE = `A checklist can contain at most ${MAX_LIVE_ITEMS} live items`;

type RunAction = <T>(
  key: string,
  fallback: string,
  action: () => Promise<T>,
) => Promise<T | undefined>;

function messageFor(cause: unknown, fallback: string): string {
  if (cause instanceof ApiRequestError && cause.message) return cause.message;
  return fallback;
}

function formatWhen(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function validText(value: string, limit: number): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= limit;
}

interface ChecklistDraft {
  checklistId: string;
  title: string;
  description: string;
}

interface ItemDraft {
  checklistId: string;
  itemId: string;
  text: string;
}

interface FeedbackPanelProps {
  workspaceId: string;
  projectId: string;
  checklistId: string;
  itemId: string;
  canPost: boolean;
  canDeleteAny: boolean;
  currentUserId: string;
  busy: boolean;
  runAction: RunAction;
  nameFor: (id?: string | null) => string;
  onNotice: (message: string) => void;
}

function FeedbackPanel({
  workspaceId,
  projectId,
  checklistId,
  itemId,
  canPost,
  canDeleteAny,
  currentUserId,
  busy,
  runAction,
  nameFor,
  onNotice,
}: FeedbackPanelProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<ChecklistFeedbackPage | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  async function load(cursor?: string): Promise<void> {
    setLoading(true);
    const result = await runAction(
      `feedback-load-${itemId}-${cursor ?? 'first'}`,
      'Unable to load feedback.',
      () => checklistService.listChecklistFeedback(workspaceId, projectId, checklistId, itemId, cursor ? { cursor } : {}),
    );
    if (result) {
      setPage((current) =>
        cursor && current
          ? { items: [...current.items, ...result.items], nextCursor: result.nextCursor }
          : result,
      );
      setNextCursor(result.nextCursor);
    }
    setLoading(false);
  }

  function toggleOpen(): void {
    if (!open && page === null) void load();
    setOpen((current) => !current);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = body.trim();
    if (!validText(trimmed, FEEDBACK_LIMIT)) return;
    const result = await runAction(
      `feedback-create-${itemId}`,
      'Unable to add feedback.',
      () => checklistService.createChecklistFeedback(workspaceId, projectId, checklistId, itemId, { body: trimmed }),
    );
    if (result) {
      setPage((current) => ({
        items: [result.feedback, ...(current?.items ?? [])],
        nextCursor: current?.nextCursor ?? null,
      }));
      setBody('');
      onNotice('Feedback added.');
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, feedback: ChecklistFeedback): Promise<void> {
    event.preventDefault();
    const trimmed = editBody.trim();
    if (!validText(trimmed, FEEDBACK_LIMIT)) return;
    const result = await runAction(
      `feedback-update-${feedback.id}`,
      'Unable to update feedback.',
      () => checklistService.updateChecklistFeedback(workspaceId, projectId, checklistId, itemId, feedback.id, { body: trimmed }),
    );
    if (result) {
      setPage((current) =>
        current
          ? { ...current, items: current.items.map((entry) => (entry.id === feedback.id ? result.feedback : entry)) }
          : current,
      );
      setEditingId(null);
      setEditBody('');
      onNotice('Feedback updated.');
    }
  }

  async function handleDelete(feedback: ChecklistFeedback): Promise<void> {
    const result = await runAction(
      `feedback-delete-${feedback.id}`,
      'Unable to delete feedback.',
      () => checklistService.deleteChecklistFeedback(workspaceId, projectId, checklistId, itemId, feedback.id),
    );
    if (result?.ok) {
      setPage((current) =>
        current
          ? { ...current, items: current.items.filter((entry) => entry.id !== feedback.id) }
          : current,
      );
      onNotice('Feedback deleted.');
    }
  }

  return (
    <div className="border-t border-[var(--color-border)] pt-3">
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-label={`Feedback for ${itemId}`}
        onClick={toggleOpen}
        disabled={loading}
      >
        {loading ? 'Loading feedback…' : `${open ? 'Hide' : 'Show'} feedback${page ? ` (${page.items.length})` : ''}`}
      </Button>

      {open && (
        <div className="mt-3 space-y-3">
          {page?.items.length ? (
            <ul className="space-y-2" role="list">
              {page.items.map((entry) => {
                const isOwn = entry.authorId === currentUserId;
                const isEditing = editingId === entry.id;
                return (
                  <li key={entry.id} className="rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] p-3">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                      {nameFor(entry.authorId)} · {formatWhen(entry.createdAt)}
                      {entry.editedAt ? ' (edited)' : ''}
                    </p>
                    {isEditing ? (
                      <form className="mt-2 space-y-2" onSubmit={(event) => void handleUpdate(event, entry)}>
                        <Textarea
                          id={`feedback-edit-${entry.id}`}
                          label="Edit feedback"
                          value={editBody}
                          maxLength={FEEDBACK_LIMIT}
                          disabled={busy}
                          onChange={(event) => setEditBody(event.target.value)}
                          helperText={`${editBody.trim().length}/${FEEDBACK_LIMIT} characters`}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" loading={busy} disabled={!validText(editBody, FEEDBACK_LIMIT)}>
                            Save feedback
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => { setEditingId(null); setEditBody(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{entry.body}</p>
                    )}
                    {canPost && !isEditing && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isOwn && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => { setEditingId(entry.id); setEditBody(entry.body); }}
                          >
                            Edit feedback
                          </Button>
                        )}
                        {(isOwn || canDeleteAny) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void handleDelete(entry)}
                          >
                            Delete feedback
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">No feedback yet.</p>
          )}

          {nextCursor && (
            <Button size="sm" variant="secondary" disabled={loading} onClick={() => void load(nextCursor)}>
              Load more feedback
            </Button>
          )}

          {canPost && (
            <form className="space-y-2" onSubmit={(event) => void handleCreate(event)}>
              <Textarea
                id={`feedback-new-${itemId}`}
                label="Add feedback"
                value={body}
                maxLength={FEEDBACK_LIMIT}
                disabled={busy}
                onChange={(event) => setBody(event.target.value)}
                helperText={`${body.trim().length}/${FEEDBACK_LIMIT} characters`}
              />
              <Button type="submit" size="sm" loading={busy} disabled={!validText(body, FEEDBACK_LIMIT)}>
                Add feedback
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectChecklistsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const workspaceId = useWorkspaceRedirect();
  const { user } = useWorkspaceContext();
  const {
    can,
    isLoading: permissionsLoading,
    accessStatus,
  } = usePermissions();

  const canManage = can('project.update');
  const canApprove = can('submission.approve');
  const currentUserId = user?.id ?? '';

  const [checklistsList, setChecklistsList] = useState<ChecklistSummary[]>([]);
  const [itemsByChecklist, setItemsByChecklist] = useState<Record<string, ChecklistItem[]>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberNames, setMemberNames] = useState<Map<string, string>>(new Map());
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [deleteChecklistId, setDeleteChecklistId] = useState<string | null>(null);

  const [checklistDraft, setChecklistDraft] = useState<ChecklistDraft | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const inFlight = useRef<Set<string>>(new Set());
  const [busyKeys, setBusyKeys] = useState<string[]>([]);
  const busy = busyKeys.length > 0;

  const loadChecklists = useCallback(async (preferredId?: string | null): Promise<void> => {
    if (!workspaceId || !projectId) return;
    const page = await checklistService.listChecklists(workspaceId, projectId, { limit: PAGE_LIMIT });
    let itemsError: unknown;
    const entries = await Promise.all(
      page.items.map(async (checklist): Promise<[string, ChecklistItem[]]> => {
        try {
          const items = await checklistService.listChecklistItems(workspaceId, projectId, checklist.id);
          return [checklist.id, items.items];
        } catch (cause) {
          itemsError ??= cause;
          return [checklist.id, []];
        }
      }),
    );
    setChecklistsList(page.items);
    setNextCursor(page.nextCursor);
    setItemsByChecklist(Object.fromEntries(entries));
    setSelectedId((current) => {
      if (preferredId && page.items.some((entry) => entry.id === preferredId)) return preferredId;
      if (current && page.items.some((entry) => entry.id === current)) return current;
      return page.items[0]?.id ?? null;
    });
    if (itemsError) setError(messageFor(itemsError, 'Unable to load checklist items.'));
  }, [workspaceId, projectId]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    async function initialise(): Promise<void> {
      setLoadingList(true);
      try {
        await loadChecklists();
      } catch (cause) {
        if (!cancelled) setError(messageFor(cause, 'Unable to load checklists.'));
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }
    void initialise();
    return () => { cancelled = true; };
  }, [workspaceId, loadChecklists]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    listWorkspaceMembers(workspaceId)
      .then((members) => {
        if (!cancelled) setMemberNames(new Map(members.map((member) => [member.userId, member.name])));
      })
      .catch(() => {
        // Name resolution is cosmetic; the backend ids remain available.
      });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const selected = useMemo(
    () => checklistsList.find((entry) => entry.id === selectedId) ?? null,
    [checklistsList, selectedId],
  );
  const selectedItems = selectedId ? itemsByChecklist[selectedId] ?? [] : [];
  const editTitle = checklistDraft && selected && checklistDraft.checklistId === selected.id
    ? checklistDraft.title
    : selected?.title ?? '';
  const editDescription = checklistDraft && selected && checklistDraft.checklistId === selected.id
    ? checklistDraft.description
    : selected?.description ?? '';
  const editingItemId = itemDraft?.checklistId === selectedId ? itemDraft.itemId : null;
  const editItemText = itemDraft?.checklistId === selectedId ? itemDraft.text : '';

  async function refreshItems(checklistId: string): Promise<void> {
    if (!workspaceId || !projectId) return;
    const result = await checklistService.listChecklistItems(workspaceId, projectId, checklistId);
    setItemsByChecklist((current) => ({ ...current, [checklistId]: result.items }));
  }

  async function handleRequestError(cause: unknown, fallback: string): Promise<void> {
    setError(messageFor(cause, fallback));
    if (cause instanceof ApiRequestError && (cause.status === 409 || cause.status === 403)) {
      try {
        await loadChecklists(selectedId);
      } catch {
        // Keep the backend message already shown to the user.
      }
    }
  }

  async function runAction<T>(
    key: string,
    fallback: string,
    action: () => Promise<T>,
  ): Promise<T | undefined> {
    if (inFlight.current.has(key)) return undefined;
    inFlight.current.add(key);
    setBusyKeys((current) => [...current, key]);
    setError(null);
    setNotice(null);
    try {
      return await action();
    } catch (cause) {
      await handleRequestError(cause, fallback);
      return undefined;
    } finally {
      inFlight.current.delete(key);
      setBusyKeys((current) => current.filter((entry) => entry !== key));
    }
  }

  function nameFor(id?: string | null): string {
    if (!id) return 'Unknown user';
    if (id === currentUserId) return 'You';
    return memberNames.get(id) ?? id;
  }

  function progressFor(checklistId: string): { completed: number; total: number } {
    const items = itemsByChecklist[checklistId] ?? [];
    return {
      completed: items.filter((item) => item.completed).length,
      total: items.length,
    };
  }

  async function handleCreateChecklist(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!workspaceId || !projectId) return;
    const title = createTitle.trim();
    const description = createDescription.trim();
    if (!validText(title, TITLE_LIMIT) || description.length > DESCRIPTION_LIMIT) return;
    const result = await runAction('create-checklist', 'Unable to create checklist.', () =>
      checklistService.createChecklist(workspaceId, projectId, {
        title,
        description: description || null,
      }),
    );
    if (result) {
      setCreateOpen(false);
      setCreateTitle('');
      setCreateDescription('');
      setNotice('Checklist created.');
      await loadChecklists(result.checklist.id);
    }
  }

  async function handleUpdateChecklist(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!workspaceId || !projectId || !selected) return;
    const title = editTitle.trim();
    const description = editDescription.trim();
    if (!validText(title, TITLE_LIMIT) || description.length > DESCRIPTION_LIMIT) return;
    const result = await runAction('update-checklist', 'Unable to update checklist.', () =>
      checklistService.updateChecklist(workspaceId, projectId, selected.id, {
        title,
        description: description || null,
      }),
    );
    if (result) {
      setChecklistDraft(null);
      setNotice('Checklist updated.');
      await loadChecklists(selected.id);
    }
  }

  async function handleDeleteChecklist(): Promise<void> {
    if (!workspaceId || !projectId || !deleteChecklistId) return;
    const deletingId = deleteChecklistId;
    const result = await runAction('delete-checklist', 'Unable to delete checklist.', () =>
      checklistService.deleteChecklist(workspaceId, projectId, deletingId),
    );
    if (result?.ok) {
      setDeleteChecklistId(null);
      setSelectedId(null);
      setChecklistDraft(null);
      setItemDraft(null);
      setNotice('Checklist deleted.');
      await loadChecklists();
    }
  }

  async function handleLoadMore(): Promise<void> {
    if (!workspaceId || !projectId || !nextCursor) return;
    const result = await runAction('load-more-checklists', 'Unable to load more checklists.', () =>
      checklistService.listChecklists(workspaceId, projectId, { cursor: nextCursor, limit: PAGE_LIMIT }),
    );
    if (!result) return;
    const entries = await Promise.all(
      result.items.map(async (checklist): Promise<[string, ChecklistItem[]]> => {
        const items = await checklistService.listChecklistItems(workspaceId, projectId, checklist.id);
        return [checklist.id, items.items];
      }),
    );
    setChecklistsList((current) => {
      const seen = new Set(current.map((entry) => entry.id));
      return [...current, ...result.items.filter((entry) => !seen.has(entry.id))];
    });
    setNextCursor(result.nextCursor);
    setItemsByChecklist((current) => ({ ...current, ...Object.fromEntries(entries) }));
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!workspaceId || !projectId || !selectedId) return;
    const text = newItemText.trim();
    if (!validText(text, ITEM_TEXT_LIMIT) || selectedItems.length >= MAX_LIVE_ITEMS) return;
    const result = await runAction('add-item', 'Unable to add item.', () =>
      checklistService.createChecklistItem(workspaceId, projectId, selectedId, { text }),
    );
    if (result) {
      setNewItemText('');
      setNotice('Item added.');
      await refreshItems(selectedId);
    }
  }

  async function handleSaveItem(event: FormEvent<HTMLFormElement>, item: ChecklistItem): Promise<void> {
    event.preventDefault();
    if (!workspaceId || !projectId || !selectedId) return;
    const text = editItemText.trim();
    if (!validText(text, ITEM_TEXT_LIMIT)) return;
    const result = await runAction(`edit-item-${item.id}`, 'Unable to update item.', () =>
      checklistService.updateChecklistItem(workspaceId, projectId, selectedId, item.id, { text }),
    );
    if (result) {
      setItemDraft(null);
      setNotice('Item updated.');
      await refreshItems(selectedId);
    }
  }

  async function handleDeleteItem(): Promise<void> {
    if (!workspaceId || !projectId || !selectedId || !deleteItemId) return;
    const itemId = deleteItemId;
    const result = await runAction(`delete-item-${itemId}`, 'Unable to delete item.', () =>
      checklistService.deleteChecklistItem(workspaceId, projectId, selectedId, itemId),
    );
    if (result?.ok) {
      setDeleteItemId(null);
      setItemDraft(null);
      setNotice('Item deleted.');
      await refreshItems(selectedId);
    }
  }

  async function handleReorder(index: number, direction: -1 | 1): Promise<void> {
    if (!workspaceId || !projectId || !selectedId) return;
    const target = index + direction;
    if (target < 0 || target >= selectedItems.length) return;
    const itemIds = selectedItems.map((item) => item.id);
    [itemIds[index], itemIds[target]] = [itemIds[target], itemIds[index]];
    const result = await runAction(`reorder-${selectedId}`, 'Unable to reorder items.', () =>
      checklistService.reorderChecklistItems(workspaceId, projectId, selectedId, { itemIds }),
    );
    if (result) {
      setItemsByChecklist((current) => ({ ...current, [selectedId]: result.items }));
      setNotice('Items reordered.');
    }
  }

  async function handleStateAction(
    item: ChecklistItem,
    action: 'complete' | 'uncomplete' | 'signOff' | 'removeSignOff',
  ): Promise<void> {
    if (!workspaceId || !projectId || !selectedId) return;
    const fallback = {
      complete: 'Unable to complete item.',
      uncomplete: 'Unable to uncomplete item.',
      signOff: 'Unable to sign off item.',
      removeSignOff: 'Unable to remove sign-off.',
    }[action];
    const call = (): Promise<checklistService.ChecklistItemResult> => {
      if (action === 'complete') return checklistService.completeChecklistItem(workspaceId, projectId, selectedId, item.id);
      if (action === 'uncomplete') return checklistService.uncompleteChecklistItem(workspaceId, projectId, selectedId, item.id);
      if (action === 'signOff') return checklistService.signOffChecklistItem(workspaceId, projectId, selectedId, item.id);
      return checklistService.removeChecklistItemSignOff(workspaceId, projectId, selectedId, item.id);
    };
    const result = await runAction(`${action}-${item.id}`, fallback, call);
    if (result) {
      setNotice('Item updated.');
      await refreshItems(selectedId);
    }
  }

  if (accessStatus) return <ProjectUnavailableState status={accessStatus} />;

  if (!workspaceId || !projectId) {
    return (
      <Card className="p-5 sm:p-7">
        <EmptyState
          title="Project context unavailable"
          description="Select a workspace and reopen the checklist page."
        />
      </Card>
    );
  }

  if (permissionsLoading || loadingList) {
    return (
      <section aria-busy="true" role="status">
        <span className="sr-only">Loading checklists…</span>
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </section>
    );
  }

  const atCap = selectedItems.length >= MAX_LIVE_ITEMS;
  const createValid = validText(createTitle, TITLE_LIMIT) && createDescription.trim().length <= DESCRIPTION_LIMIT;
  const updateValid = validText(editTitle, TITLE_LIMIT) && editDescription.trim().length <= DESCRIPTION_LIMIT;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Checklists</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Track shared completion, sign-off, and item feedback for this project.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} disabled={busy}>New checklist</Button>
        )}
      </header>

      {error && <Alert variant="error" title="Request failed">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(220px,320px)_1fr]">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Project checklists</h2>
          {checklistsList.length === 0 ? (
            <EmptyState
              title="No checklists yet"
              description={canManage ? 'Create the first checklist for this project.' : 'Checklists will appear here when one is created.'}
            />
          ) : (
            <ul className="space-y-2" role="list">
              {checklistsList.map((checklist) => {
                const progress = progressFor(checklist.id);
                const isSelected = checklist.id === selectedId;
                return (
                  <li key={checklist.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(checklist.id)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={[
                        'w-full rounded-[var(--radius-md)] border p-3 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-surface-secondary)]'
                          : 'border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]',
                      ].join(' ')}
                    >
                      <span className="block text-sm font-medium text-[var(--color-text-primary)]">{checklist.title}</span>
                      {checklist.description && (
                        <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">{checklist.description}</span>
                      )}
                      <span className="mt-2 block text-xs text-[var(--color-text-secondary)]">
                        {progress.completed}/{progress.total} complete
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {nextCursor && (
            <div className="mt-3">
              <Button variant="secondary" size="sm" loading={busy} disabled={busy} onClick={() => void handleLoadMore()}>
                Load more checklists
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6">
          {!selected ? (
            <EmptyState title="Select a checklist" description="Choose a checklist to inspect its items." />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{selected.title}</h2>
                  {selected.description && (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{selected.description}</p>
                  )}
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {progressFor(selected.id).completed}/{progressFor(selected.id).total} items complete
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => setDeleteChecklistId(selected.id)}
                  >
                    Delete checklist
                  </Button>
                )}
              </div>

              {canManage && (
                <form className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 sm:grid-cols-2" onSubmit={(event) => void handleUpdateChecklist(event)}>
                  <Input
                    id="checklist-edit-title"
                    label="Title"
                    value={editTitle}
                    maxLength={TITLE_LIMIT}
                    disabled={busy}
                    onChange={(event) => setChecklistDraft({
                      checklistId: selected.id,
                      title: event.target.value,
                      description: editDescription,
                    })}
                  />
                  <Textarea
                    id="checklist-edit-description"
                    label="Description"
                    value={editDescription}
                    maxLength={DESCRIPTION_LIMIT}
                    disabled={busy}
                    onChange={(event) => setChecklistDraft({
                      checklistId: selected.id,
                      title: editTitle,
                      description: event.target.value,
                    })}
                    helperText={`${editDescription.trim().length}/${DESCRIPTION_LIMIT} characters`}
                  />
                  <div>
                    <Button type="submit" loading={busy} disabled={!updateValid}>Save checklist</Button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Items</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">{selectedItems.length}/{MAX_LIVE_ITEMS} live items</p>
                </div>

                {atCap && (
                  <Alert variant="warning" title="Item limit reached">{ITEM_LIMIT_MESSAGE}</Alert>
                )}

                {selectedItems.length === 0 ? (
                  <EmptyState title="No items" description="Add the first item to this checklist." />
                ) : (
                  <ul className="space-y-3" role="list">
                    {selectedItems.map((item, index) => {
                      const isEditing = editingItemId === item.id;
                      const canUncomplete = item.completed && (item.completedById === currentUserId || canManage);
                      const canSignOff = canApprove && item.completed && item.completedById !== currentUserId && !item.signedOffAt;
                      const canRemoveSignOff = Boolean(item.signedOffAt) && (
                        item.signedOffById === currentUserId || canManage
                      );
                      return (
                        <li key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <form className="space-y-2" onSubmit={(event) => void handleSaveItem(event, item)}>
                                  <Textarea
                                    id={`item-edit-${item.id}`}
                                    label="Edit item"
                                    value={editItemText}
                                    maxLength={ITEM_TEXT_LIMIT}
                                    disabled={busy}
                                    onChange={(event) => setItemDraft({
                                      checklistId: selected.id,
                                      itemId: item.id,
                                      text: event.target.value,
                                    })}
                                    helperText={`${editItemText.trim().length}/${ITEM_TEXT_LIMIT} characters`}
                                  />
                                  <div className="flex gap-2">
                                    <Button type="submit" size="sm" loading={busy} disabled={!validText(editItemText, ITEM_TEXT_LIMIT)}>
                                      Save item
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={busy}
                                      onClick={() => setItemDraft(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </form>
                              ) : (
                                <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{item.text}</p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.completed && (
                                  <Badge variant="success">
                                    Completed by {nameFor(item.completedById)} · {formatWhen(item.completedAt)}
                                  </Badge>
                                )}
                                {item.signedOffAt && (
                                  <Badge variant="info">
                                    Signed off by {nameFor(item.signedOffById)} · {formatWhen(item.signedOffAt)}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {canManage && !isEditing && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  aria-label={`Move up ${item.text}`}
                                  disabled={busy || index === 0}
                                  onClick={() => void handleReorder(index, -1)}
                                >
                                  ↑
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  aria-label={`Move down ${item.text}`}
                                  disabled={busy || index === selectedItems.length - 1}
                                  onClick={() => void handleReorder(index, 1)}
                                >
                                  ↓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy}
                                  onClick={() => setItemDraft({
                                    checklistId: selected.id,
                                    itemId: item.id,
                                    text: item.text,
                                  })}
                                >
                                  Edit item
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={busy}
                                  onClick={() => setDeleteItemId(item.id)}
                                >
                                  Delete item
                                </Button>
                              </div>
                            )}
                          </div>

                          {(canManage || canUncomplete || canSignOff || canRemoveSignOff) && !isEditing && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
                              {canManage && !item.completed && (
                                <Button size="sm" loading={busy} disabled={busy} onClick={() => void handleStateAction(item, 'complete')}>
                                  Complete
                                </Button>
                              )}
                              {canUncomplete && (
                                <Button size="sm" variant="secondary" loading={busy} disabled={busy} onClick={() => void handleStateAction(item, 'uncomplete')}>
                                  Uncomplete
                                </Button>
                              )}
                              {canSignOff && (
                                <Button size="sm" variant="secondary" loading={busy} disabled={busy} onClick={() => void handleStateAction(item, 'signOff')}>
                                  Sign off
                                </Button>
                              )}
                              {canRemoveSignOff && (
                                <Button size="sm" variant="ghost" loading={busy} disabled={busy} onClick={() => void handleStateAction(item, 'removeSignOff')}>
                                  Remove sign-off
                                </Button>
                              )}
                            </div>
                          )}

                          <FeedbackPanel
                            workspaceId={workspaceId}
                            projectId={projectId}
                            checklistId={selected.id}
                            itemId={item.id}
                            canPost={canManage}
                            canDeleteAny={canManage}
                            currentUserId={currentUserId}
                            busy={busy}
                            runAction={runAction}
                            nameFor={nameFor}
                            onNotice={setNotice}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}

                {canManage && (
                  <form className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4" onSubmit={(event) => void handleAddItem(event)}>
                    <Textarea
                      id="checklist-new-item"
                      label="Add item"
                      value={newItemText}
                      maxLength={ITEM_TEXT_LIMIT}
                      disabled={busy || atCap}
                      onChange={(event) => setNewItemText(event.target.value)}
                      helperText={`${newItemText.trim().length}/${ITEM_TEXT_LIMIT} characters`}
                    />
                    <Button type="submit" loading={busy} disabled={!validText(newItemText, ITEM_TEXT_LIMIT) || atCap}>
                      Add item
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New checklist"
        description="Add a title and optional description."
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-checklist-form" loading={busy} disabled={!createValid}>Create checklist</Button>
          </>
        }
      >
        <form id="create-checklist-form" className="space-y-3" onSubmit={(event) => void handleCreateChecklist(event)}>
          <Input
            id="checklist-create-title"
            label="Title"
            value={createTitle}
            maxLength={TITLE_LIMIT}
            disabled={busy}
            onChange={(event) => setCreateTitle(event.target.value)}
          />
          <Textarea
            id="checklist-create-description"
            label="Description"
            value={createDescription}
            maxLength={DESCRIPTION_LIMIT}
            disabled={busy}
            onChange={(event) => setCreateDescription(event.target.value)}
            helperText={`${createDescription.trim().length}/${DESCRIPTION_LIMIT} characters`}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteChecklistId !== null}
        onClose={() => setDeleteChecklistId(null)}
        onConfirm={() => void handleDeleteChecklist()}
        title="Delete checklist?"
        description="This removes the checklist and its live items."
        confirmLabel="Delete checklist"
        destructive
        loading={busy}
      />

      <ConfirmDialog
        open={deleteItemId !== null}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => void handleDeleteItem()}
        title="Delete item?"
        description="This removes the item from the checklist."
        confirmLabel="Delete item"
        destructive
        loading={busy}
      />
    </section>
  );
}
