'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { ApiRequestError } from '@/lib/api';
import {
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  listDocumentRevisions,
  listDocumentComments,
  addDocumentComment,
  deleteDocumentComment,
  type DocumentSummary,
  type DocumentCommentSummary,
  type DocumentRevision,
} from '@/services/documents';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Document detail panel ────────────────────────────────────────────────────

interface DetailPanelProps {
  workspaceId: string;
  document: DocumentSummary;
  currentUserId: string;
  onUpdated: (doc: DocumentSummary) => void;
  onDeleted: (docId: string) => void;
}

function DetailPanel({ workspaceId, document, currentUserId, onUpdated, onDeleted }: DetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(document.title);
  const [editContent, setEditContent] = useState(document.content);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [comments, setComments] = useState<DocumentCommentSummary[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reset local state when the selected document changes.
  // Defer state setters off the synchronous effect body to satisfy the
  // react-hooks/set-state-in-effect rule.
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setEditing(false);
      setEditTitle(document.title);
      setEditContent(document.content);
      setSaveError(null);
      setDeleteError(null);
    });
    return () => { active = false; };
  }, [document.id, document.title, document.content]);

  async function handleSave() {
    if (saving) return;
    if (!editTitle.trim()) { setSaveError('Title is required.'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateDocument(workspaceId, document.id, {
        title: editTitle.trim(),
        content: editContent,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? err.message : 'Could not save document.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDocument(workspaceId, document.id);
      onDeleted(document.id);
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Could not delete document.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function loadComments() {
    setLoadingComments(true);
    setCommentError(null);
    try {
      setComments(await listDocumentComments(workspaceId, document.id));
    } catch (err) {
      setCommentError(err instanceof ApiRequestError ? err.message : 'Could not load comments.');
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const added = await addDocumentComment(workspaceId, document.id, newComment.trim());
      setComments((prev) => [...prev, added]);
      setNewComment('');
    } catch (err) {
      setCommentError(err instanceof ApiRequestError ? err.message : 'Could not post comment.');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    setDeletingCommentId(commentId);
    try {
      await deleteDocumentComment(workspaceId, document.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setCommentError(err instanceof ApiRequestError ? err.message : 'Could not delete comment.');
    } finally {
      setDeletingCommentId(null);
    }
  }

  async function loadRevisions() {
    setLoadingRevisions(true);
    setRevisionError(null);
    try {
      setRevisions(await listDocumentRevisions(workspaceId, document.id));
    } catch (err) {
      setRevisionError(err instanceof ApiRequestError ? err.message : 'Could not load revision history.');
    } finally {
      setLoadingRevisions(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <Input
            id="doc-title-edit"
            label="Document title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={300}
            className="flex-1"
          />
        ) : (
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold text-[var(--color-text-primary)]">{document.title}</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              By {document.authorName} · Updated {relativeTime(document.updatedAt)} · {document.revisionCount} revision{document.revisionCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={() => { void handleSave(); }} loading={saving} disabled={saving}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setEditTitle(document.title); setEditContent(document.content); }} disabled={saving}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(true)}>Delete</Button>
            </>
          )}
        </div>
      </div>

      {saveError && <Alert variant="error">{saveError}</Alert>}
      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      {/* Content / editor */}
      {editing ? (
        <Textarea
          id="doc-content-edit"
          label="Content"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={16}
          maxLength={500_000}
          helperText="Plain text — rich editing requires a document editor integration."
        />
      ) : (
        <Card className="p-5">
          {document.content ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-text-primary)]">
              {document.content}
            </pre>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] italic">This document has no content yet. Click Edit to add some.</p>
          )}
        </Card>
      )}

      {/* Tabs: Comments | Revisions */}
      <Tabs
        tabs={[
          {
            id: 'comments',
            label: `Comments (${document.commentCount})`,
            content: (
              <CommentsSection
                comments={comments}
                loading={loadingComments}
                error={commentError}
                newComment={newComment}
                submitting={submittingComment}
                deletingId={deletingCommentId}
                currentUserId={currentUserId}
                onLoad={loadComments}
                onNewCommentChange={setNewComment}
                onSubmit={handleAddComment}
                onDelete={handleDeleteComment}
              />
            ),
          },
          {
            id: 'revisions',
            label: `Revisions (${document.revisionCount})`,
            content: (
              <RevisionsSection
                revisions={revisions}
                loading={loadingRevisions}
                error={revisionError}
                onLoad={loadRevisions}
              />
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete document"
        description={`Delete "${document.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { void handleDelete(); }}
        onClose={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </div>
  );
}

// ─── Comments section ─────────────────────────────────────────────────────────

interface CommentsSectionProps {
  comments: DocumentCommentSummary[];
  loading: boolean;
  error: string | null;
  newComment: string;
  submitting: boolean;
  deletingId: string | null;
  currentUserId: string;
  onLoad: () => void;
  onNewCommentChange: (val: string) => void;
  onSubmit: () => void;
  onDelete: (id: string) => void;
}

function CommentsSection({
  comments, loading, error, newComment, submitting, deletingId,
  currentUserId, onLoad, onNewCommentChange, onSubmit, onDelete,
}: CommentsSectionProps) {
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (!loadedOnce.current) { loadedOnce.current = true; onLoad(); }
  }, [onLoad]);

  return (
    <div className="mt-4 space-y-4">
      {error && <Alert variant="error">{error}<Button variant="secondary" size="sm" className="mt-2" onClick={onLoad}>Retry</Button></Alert>}
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading comments">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : comments.length === 0 && !error ? (
        <p className="text-sm text-[var(--color-text-muted)]">No comments yet.</p>
      ) : (
        <ul className="space-y-2" aria-label="Document comments">
          {comments.map((c) => (
            <li key={c.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {c.authorName} · {relativeTime(c.createdAt)}
                    {c.editedAt ? ' (edited)' : ''}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-primary)]">{c.body}</p>
                </div>
                {c.authorId === currentUserId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onDelete(c.id)}
                    disabled={deletingId === c.id}
                    aria-label="Delete comment"
                  >
                    {deletingId === c.id ? '…' : 'Delete'}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* Add comment */}
      <div className="flex gap-2">
        <Textarea
          id="new-doc-comment"
          label="Add a comment"
          value={newComment}
          onChange={(e) => onNewCommentChange(e.target.value)}
          rows={2}
          maxLength={10_000}
          className="flex-1"
        />
        <div className="flex items-end">
          <Button size="sm" onClick={onSubmit} loading={submitting} disabled={submitting || !newComment.trim()}>
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Revisions section ────────────────────────────────────────────────────────

function RevisionsSection({ revisions, loading, error, onLoad }: {
  revisions: DocumentRevision[];
  loading: boolean;
  error: string | null;
  onLoad: () => void;
}) {
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (!loadedOnce.current) { loadedOnce.current = true; onLoad(); }
  }, [onLoad]);

  return (
    <div className="mt-4 space-y-3">
      {error && <Alert variant="error">{error}<Button variant="secondary" size="sm" className="mt-2" onClick={onLoad}>Retry</Button></Alert>}
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading revisions">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : revisions.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No saved revisions yet.</p>
      ) : (
        <ul className="space-y-1" aria-label="Document revisions">
          {revisions.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
              <span className="shrink-0 text-xs font-mono text-[var(--color-text-muted)]">v{revisions.length - i}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--color-text-secondary)]">{r.authorName} · {relativeTime(r.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Create document form ─────────────────────────────────────────────────────

interface CreateFormProps {
  workspaceId: string;
  onCreated: (doc: DocumentSummary) => void;
  onCancel: () => void;
}

function CreateForm({ workspaceId, onCreated, onCancel }: CreateFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const doc = await createDocument(workspaceId, { title: title.trim(), content });
      onCreated(doc);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not create document.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">New document</h2>
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <Input
          id="new-doc-title"
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
          autoFocus
        />
        <Textarea
          id="new-doc-content"
          label="Content (optional)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          maxLength={500_000}
          helperText="Plain text content. Rich editing requires a document editor integration."
        />
        <div className="flex gap-2">
          <Button type="submit" loading={saving} disabled={saving}>Create document</Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { activeWorkspace, user } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const currentUserId = user?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const latestLoad = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (wsId: string, searchQuery: string, cursor?: string, append = false) => {
    if (!wsId) return;
    const seq = ++latestLoad.current;
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }
    try {
      const result = await listDocuments(wsId, { cursor, limit: 25, search: searchQuery || undefined });
      if (seq !== latestLoad.current) return;
      if (append) setDocuments((prev) => [...prev, ...result.items]);
      else { setDocuments(result.items); setSelectedId(null); }
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      setError(err instanceof ApiRequestError ? err.message : 'Could not load documents.');
    } finally {
      if (seq === latestLoad.current) { setLoading(false); setLoadingMore(false); }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load(workspaceId, search) : undefined);
    return () => { active = false; };
  }, [workspaceId, load]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { void load(workspaceId, value); }, 400);
  }

  function handleCreated(doc: DocumentSummary) {
    setDocuments((prev) => [doc, ...prev]);
    setCreating(false);
    setSelectedId(doc.id);
  }

  function handleUpdated(updated: DocumentSummary) {
    setDocuments((prev) => prev.map((d) => d.id === updated.id ? updated : d));
  }

  function handleDeleted(docId: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setSelectedId(null);
  }

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null;

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Documents" />
        <EmptyState title="No workspace selected" description="Select a workspace to manage documents." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Documents"
        description="Create, edit, and collaborate on workspace documents."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: document list */}
        <aside className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              id="doc-search"
              label="Search documents"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              maxLength={200}
              className="flex-1"
            />
            <div className="mt-6">
              <Button size="sm" onClick={() => { setCreating(true); setSelectedId(null); }}>New</Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading documents">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <Skeleton className="mb-1.5 h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <Alert variant="error">{error}<Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load(workspaceId, search); }}>Retry</Button></Alert>
          ) : documents.length === 0 ? (
            <EmptyState title={search ? 'No documents match your search' : 'No documents yet'} description={search ? 'Try a different search term.' : 'Click New to create your first document.'} />
          ) : (
            <ul className="space-y-1" aria-label="Documents">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedId(doc.id); setCreating(false); }}
                    className={[
                      'w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors',
                      selectedId === doc.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]',
                    ].join(' ')}
                    aria-current={selectedId === doc.id ? 'true' : undefined}
                  >
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {doc.authorName} · {relativeTime(doc.updatedAt)}
                      {doc.commentCount > 0 ? ` · ${doc.commentCount} comment${doc.commentCount !== 1 ? 's' : ''}` : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {nextCursor && (
            <Button variant="secondary" className="w-full" onClick={() => { void load(workspaceId, search, nextCursor, true); }} loading={loadingMore} disabled={loadingMore}>
              Load more
            </Button>
          )}
        </aside>

        {/* Right: detail / create */}
        <main>
          {creating ? (
            <CreateForm workspaceId={workspaceId} onCreated={handleCreated} onCancel={() => setCreating(false)} />
          ) : selectedDoc ? (
            <DetailPanel
              workspaceId={workspaceId}
              document={selectedDoc}
              currentUserId={currentUserId}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
              Select a document to view it, or click New to create one.
            </div>
          )}
        </main>
      </div>
    </PageContainer>
  );
}
