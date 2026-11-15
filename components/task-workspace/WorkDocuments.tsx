'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiRequestError } from '@/lib/api';
import {
  createTaskWorkDocument,
  deleteTaskWorkDocument,
  getTaskWorkDocument,
  getTaskWorkDocumentVersion,
  getWorkDocumentConflict,
  listTaskWorkDocumentVersions,
  listTaskWorkDocuments,
  restoreTaskWorkDocumentVersion,
  updateTaskWorkDocument,
  type TaskWorkDocumentConflict,
  type TaskWorkDocumentDetail,
  type TaskWorkDocumentSummary,
  type TaskWorkDocumentVersion,
} from '@/services/tasks';
import type { SaveSyncState } from './TaskWorkspaceHeader';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

function jsonToPlainText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === 'text' && typeof n.text === 'string') return n.text;
  if (!Array.isArray(n.content)) return '';
  const sep = n.type === 'paragraph' || n.type === 'heading' || n.type === 'listItem' || n.type === 'tableRow' ? '\n' : '';
  return n.content.map(jsonToPlainText).filter(Boolean).join(sep);
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50',
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--color-surface-secondary,#f3f4f6)] text-[var(--color-text-primary)] hover:opacity-90',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

export function WorkDocuments({
  workspaceId,
  projectId,
  taskId,
  canEdit,
  canDelete,
  onSaveStateChange,
}: {
  workspaceId: string;
  projectId: string;
  taskId: string;
  canEdit: boolean;
  canDelete: boolean;
  onSaveStateChange: Dispatch<SetStateAction<SaveSyncState>>;
}) {
  const [items, setItems] = useState<TaskWorkDocumentSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [doc, setDoc] = useState<TaskWorkDocumentDetail | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [baseVersion, setBaseVersion] = useState<number>(1);
  const [conflict, setConflict] = useState<TaskWorkDocumentConflict | null>(null);
  const [conflictLocalCopy, setConflictLocalCopy] = useState('');
  const [busy, setBusy] = useState(false);

  const [versions, setVersions] = useState<TaskWorkDocumentVersion[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionPreview, setVersionPreview] = useState<{ version: number; content: unknown } | null>(null);

  const [createTitle, setCreateTitle] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJson = useRef<string>('');
  const dirtyRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: EMPTY_DOC,
    editorProps: {
      attributes: {
        class:
          'min-h-[220px] outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--color-border)] [&_td]:p-1 [&_th]:border [&_th]:border-[var(--color-border)] [&_th]:bg-[var(--color-surface-secondary)] [&_th]:p-1',
      },
    },
    onUpdate: () => {
      if (!doc || conflict) return;
      dirtyRef.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      onSaveStateChange('idle');
      saveTimer.current = setTimeout(() => void autosave(), 1500);
    },
  });

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await listTaskWorkDocuments(workspaceId, projectId, taskId);
      setItems(res.items);
      if (!selectedId && res.items.length > 0) setSelectedId(res.items[0].id);
    } catch (e) {
      setListError(e instanceof ApiRequestError ? e.message : 'Failed to load work documents.');
    } finally {
      setListLoading(false);
    }
  }, [workspaceId, projectId, taskId, selectedId]);

  const loadDoc = useCallback(async (documentId: string) => {
    setDocLoading(true);
    setDocError(null);
    setConflict(null);
    try {
      const res = await getTaskWorkDocument(workspaceId, projectId, taskId, documentId);
      setDoc(res);
      setTitle(res.title);
      setBaseVersion(res.currentVersion);
      const json = JSON.stringify(res.content ?? EMPTY_DOC);
      lastSavedJson.current = json;
      dirtyRef.current = false;
      editor?.commands.setContent((res.content as object) ?? EMPTY_DOC, { emitUpdate: false });
      onSaveStateChange('idle');
    } catch (e) {
      setDocError(e instanceof ApiRequestError ? e.message : 'Failed to load document.');
    } finally {
      setDocLoading(false);
    }
  }, [workspaceId, projectId, taskId, editor, onSaveStateChange]);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { if (selectedId) void loadDoc(selectedId); else setDoc(null); }, [selectedId, loadDoc]);
  useEffect(() => { editor?.setEditable(canEdit && !conflict && !docLoading && Boolean(doc)); }, [editor, canEdit, conflict, docLoading, doc]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const doSave = useCallback(async (mode: 'autosave' | 'manual') => {
    if (!editor || !doc || conflict || !canEdit) return;
    const content = editor.getJSON();
    const json = JSON.stringify(content);
    if (mode === 'autosave' && !dirtyRef.current) return;
    if (mode === 'autosave' && json === lastSavedJson.current) { dirtyRef.current = false; return; }
    onSaveStateChange('saving');
    try {
      const res = await updateTaskWorkDocument(workspaceId, projectId, taskId, doc.id, {
        baseVersion,
        content,
        title: title.trim() || doc.title,
        mode,
      });
      setDoc(res);
      setTitle(res.title);
      setBaseVersion(res.currentVersion);
      lastSavedJson.current = JSON.stringify(res.content ?? content);
      dirtyRef.current = false;
      setItems((prev) => prev.map((i) => (i.id === res.id ? { ...i, title: res.title, currentVersion: res.currentVersion, updatedAt: res.updatedAt } : i)));
      onSaveStateChange('saved');
      setTimeout(() => onSaveStateChange((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch (e) {
      const c = getWorkDocumentConflict(e);
      if (c) {
        setConflict(c);
        setConflictLocalCopy(jsonToPlainText(editor.getJSON()));
        onSaveStateChange('conflict');
      } else {
        onSaveStateChange('failed');
        setDocError(e instanceof ApiRequestError ? e.message : 'Failed to save document.');
      }
    }
  }, [editor, doc, conflict, canEdit, workspaceId, projectId, taskId, baseVersion, title, onSaveStateChange]);

  const autosave = useCallback(async () => {
    await doSave('autosave');
  }, [doSave]);

  async function handleCreate() {
    const name = createTitle.trim();
    if (!name) return;
    setBusy(true);
    try {
      const created = await createTaskWorkDocument(workspaceId, projectId, taskId, { title: name, content: EMPTY_DOC });
      setCreateTitle('');
      await loadList();
      setSelectedId(created.id);
    } catch (e) {
      setListError(e instanceof ApiRequestError ? e.message : 'Could not create document.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReloadLatest() {
    if (!conflict || !doc) return;
    const latest = conflict.latestContent ?? EMPTY_DOC;
    setDoc({ ...doc, ...conflict.document, content: latest });
    setBaseVersion(conflict.currentVersion);
    setTitle(conflict.document.title);
    editor?.commands.setContent((latest as object) ?? EMPTY_DOC, { emitUpdate: false });
    lastSavedJson.current = JSON.stringify(latest ?? EMPTY_DOC);
    dirtyRef.current = false;
    setConflict(null);
    onSaveStateChange('idle');
  }

  async function handleCopyLocal() {
    try {
      await navigator.clipboard.writeText(conflictLocalCopy || jsonToPlainText(editor?.getJSON()));
    } catch {
      // fallback: keep text visible in UI
    }
  }

  async function openVersions() {
    if (!doc) return;
    setVersionsOpen((v) => !v);
    if (versionsOpen) return;
    setVersionsLoading(true);
    try {
      const res = await listTaskWorkDocumentVersions(workspaceId, projectId, taskId, doc.id);
      setVersions(res.items);
    } catch (e) {
      setDocError(e instanceof ApiRequestError ? e.message : 'Failed to load versions.');
    } finally {
      setVersionsLoading(false);
    }
  }

  async function previewVersion(version: number) {
    if (!doc) return;
    try {
      const res = await getTaskWorkDocumentVersion(workspaceId, projectId, taskId, doc.id, version);
      setVersionPreview({ version: res.version, content: res.content });
    } catch (e) {
      setDocError(e instanceof ApiRequestError ? e.message : 'Failed to load version.');
    }
  }

  async function handleRestore(version: number) {
    if (!doc) return;
    if (conflict) return;
    setBusy(true);
    try {
      const restored = await restoreTaskWorkDocumentVersion(workspaceId, projectId, taskId, doc.id, version);
      setDoc(restored);
      setTitle(restored.title);
      setBaseVersion(restored.currentVersion);
      editor?.commands.setContent((restored.content as object) ?? EMPTY_DOC, { emitUpdate: false });
      lastSavedJson.current = JSON.stringify(restored.content ?? EMPTY_DOC);
      dirtyRef.current = false;
      setVersionPreview(null);
      await openVersions();
      setVersionsOpen(true);
      onSaveStateChange('saved');
      setTimeout(() => onSaveStateChange('idle'), 1200);
    } catch (e) {
      setDocError(e instanceof ApiRequestError ? e.message : 'Failed to restore version.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(documentId: string) {
    setBusy(true);
    try {
      await deleteTaskWorkDocument(workspaceId, projectId, taskId, documentId);
      if (selectedId === documentId) { setSelectedId(null); setDoc(null); }
      await loadList();
    } catch (e) {
      setListError(e instanceof ApiRequestError ? e.message : 'Failed to delete document.');
    } finally {
      setBusy(false);
    }
  }

  function setLink() {
    const prev = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL (https:// or mailto:)', prev || 'https://');
    if (url === null) return;
    if (url === '') { editor?.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    if (!/^(https?:|mailto:)/i.test(url)) return;
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  if (listLoading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <section aria-labelledby="work-docs-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="work-docs-heading" className="text-base font-semibold">Work documents</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Rich-text notes and deliverables for this task. Changes autosave and keep version history.</p>
        </div>
      </div>

      {listError ? <Alert variant="error" title="Error">{listError}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="p-3 sm:p-4">
          <h3 className="mb-2 text-sm font-semibold">Documents</h3>
          {canEdit ? (
            <div className="mb-3 flex gap-2">
              <Input id="new-doc-title" label="New document" srOnlyLabel placeholder="Document title" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
              <Button size="sm" onClick={() => void handleCreate()} disabled={busy || !createTitle.trim()}>Add</Button>
            </div>
          ) : null}
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No work documents yet.</p>
          ) : (
            <ul className="space-y-1" role="list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={[
                      'w-full rounded px-2 py-2 text-left text-sm',
                      selectedId === item.id ? 'bg-[var(--color-surface-secondary)] font-medium' : 'hover:bg-[var(--color-surface-secondary)]',
                    ].join(' ')}
                  >
                    <span className="block truncate">{item.title}</span>
                    <span className="block text-xs text-[var(--color-text-secondary)]">v{item.currentVersion}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="min-w-0 space-y-3">
          {!selectedId ? (
            <Card className="p-6"><p className="text-sm text-[var(--color-text-secondary)]">Select or create a document to start editing.</p></Card>
          ) : docLoading ? (
            <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
          ) : docError ? (
            <Alert variant="error" title="Unable to load document">{docError}</Alert>
          ) : doc ? (
            <>
              {conflict ? (
                <Alert variant="error" title="Conflict detected">
                  <p className="mb-2 text-sm">This document was updated elsewhere (current v{conflict.currentVersion}). Your unsaved changes were not overwritten.</p>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void handleReloadLatest()}>Reload latest</Button>
                    <Button size="sm" variant="secondary" onClick={() => void handleCopyLocal()}>Copy my text</Button>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">Your local text (copy before reloading)</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-[var(--color-border)] p-2 text-xs">{conflictLocalCopy || '(empty)'}</pre>
                  </details>
                </Alert>
              ) : null}

              <Card className="p-3 sm:p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Input id="doc-title" label="Title" srOnlyLabel value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit || Boolean(conflict)} className="font-medium" />
                  <div className="flex flex-wrap gap-2">
                    {canEdit ? <Button size="sm" variant="secondary" onClick={() => void doSave('manual')} disabled={Boolean(conflict) || busy}>Save</Button> : null}
                    <Button size="sm" variant="secondary" onClick={() => void openVersions()} disabled={busy}>History</Button>
                    {canDelete ? (
                      <Button size="sm" variant="secondary" onClick={() => void handleDelete(doc.id)} disabled={busy}>Delete</Button>
                    ) : null}
                  </div>
                </div>

                {canEdit ? (
                  <div className="mb-2 flex flex-wrap gap-1 border-b border-[var(--color-border)] pb-2" role="toolbar" aria-label="Formatting">
                    <ToolbarButton label="B" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor || Boolean(conflict)} />
                    <ToolbarButton label="I" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor || Boolean(conflict)} />
                    <ToolbarButton label="H1" active={editor?.isActive('heading', { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor || Boolean(conflict)} />
                    <ToolbarButton label="H2" active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor || Boolean(conflict)} />
                    <ToolbarButton label="H3" active={editor?.isActive('heading', { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} disabled={!editor || Boolean(conflict)} />
                    <ToolbarButton label="• List" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor || Boolean(conflict)} />
                    <ToolbarButton label="1. List" active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor || Boolean(conflict)} />
                    <ToolbarButton label="Link" active={editor?.isActive('link')} onClick={setLink} disabled={!editor || Boolean(conflict)} />
                    <ToolbarButton label="Table" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} disabled={!editor || Boolean(conflict)} />
                  </div>
                ) : null}

                <div className="prose max-w-none min-h-[240px] rounded border border-[var(--color-border)] p-3 text-sm focus-within:ring-1 focus-within:ring-[var(--color-primary)]">
                  <EditorContent editor={editor} />
                </div>
                {!canEdit ? <p className="mt-2 text-xs text-[var(--color-text-secondary)]">You have read-only access to this document.</p> : null}
              </Card>

              {versionsOpen ? (
                <Card className="p-3 sm:p-4">
                  <h3 className="mb-2 text-sm font-semibold">Version history</h3>
                  {versionsLoading ? <p className="text-sm">Loading versions…</p> : versions.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">No versions yet.</p> : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <ul className="space-y-2" role="list">
                        {versions.map((v) => (
                          <li key={v.id} className="flex items-center justify-between gap-2 rounded border border-[var(--color-border)] p-2 text-sm">
                            <div>
                              <p className="font-medium">v{v.version} {v.version === doc.currentVersion ? '(current)' : ''}</p>
                              <p className="text-xs text-[var(--color-text-secondary)]">{v.savedBy?.name ?? 'Unknown'} · {new Date(v.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="secondary" onClick={() => void previewVersion(v.version)}>View</Button>
                              {canEdit ? <Button size="sm" variant="secondary" onClick={() => void handleRestore(v.version)} disabled={Boolean(conflict) || busy}>Restore</Button> : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="rounded border border-[var(--color-border)] p-2 text-sm">
                        <p className="mb-1 font-medium">Preview {versionPreview ? `v${versionPreview.version}` : ''}</p>
                        {versionPreview ? (
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{jsonToPlainText(versionPreview.content) || '(empty)'}</pre>
                        ) : (
                          <p className="text-[var(--color-text-secondary)]">Select a version to preview its text.</p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
