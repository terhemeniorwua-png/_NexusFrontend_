'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ApiRequestError } from '@/lib/api';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  createFileVersionFeedback,
  deleteFileVersion,
  deleteFileVersionFeedback,
  downloadFileVersion,
  formatBytes,
  listFileVersionFeedback,
  listFileVersions,
  makeFileVersionCurrent,
  updateFileVersionFeedback,
  uploadFileVersion,
  type AttachmentVersionFeedbackSummary,
  type AttachmentVersionSummary,
  type FileSummary,
} from '@/services/files';

const MAX_FEEDBACK_LENGTH = 4000;
const FEEDBACK_LENGTH_ERROR = `Feedback must be between 1 and ${MAX_FEEDBACK_LENGTH} characters.`;

type FeedbackByVersion = Record<string, AttachmentVersionFeedbackSummary[]>;

interface FileVersionsPanelProps {
  workspaceId: string;
  file: Pick<FileSummary, 'id' | 'fileName'>;
  /** Caller supplies the backend-equivalent write capability. */
  canManage: boolean;
  /** Admin capability used to delete other people's feedback. */
  canDeleteAny?: boolean;
  currentUserId?: string | null;
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function versionKey(version: AttachmentVersionSummary, index: number): string {
  return version.id ?? `version-${index}`;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function feedbackError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_FEEDBACK_LENGTH) return FEEDBACK_LENGTH_ERROR;
  return null;
}

/**
 * Inline attachment version history. Capabilities are supplied by the caller
 * because this panel appears both inside the project permission provider and
 * on the workspace files page, which has no project permission context.
 */
export function FileVersionsPanel({
  workspaceId,
  file,
  canManage,
  canDeleteAny = false,
  currentUserId = null,
}: FileVersionsPanelProps) {
  const idPrefix = useId();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<AttachmentVersionSummary[]>([]);
  const [feedbackByVersion, setFeedbackByVersion] = useState<FeedbackByVersion>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [localFeedbackError, setLocalFeedbackError] = useState<string | null>(null);

  const loadSequence = useRef(0);
  const busyRef = useRef(false);
  const versionInputRef = useRef<HTMLInputElement | null>(null);

  const sortedVersions = useMemo(
    () => [...versions].sort((left, right) => {
      const leftDate = left.createdAt ? Date.parse(left.createdAt) : Number.NEGATIVE_INFINITY;
      const rightDate = right.createdAt ? Date.parse(right.createdAt) : Number.NEGATIVE_INFINITY;
      if (leftDate !== rightDate) return rightDate - leftDate;
      return (right.versionNumber ?? 0) - (left.versionNumber ?? 0);
    }),
    [versions],
  );

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError(null);

    try {
      const result = await listFileVersions(workspaceId, file.id, { limit: 100 });
      const items = result.items ?? [];
      const feedbackEntries = await Promise.all(items.map(async (version, index) => {
        const key = versionKey(version, index);
        if (!canManage || !version.id) return [key, [] as AttachmentVersionFeedbackSummary[]] as const;
        try {
          const feedback = await listFileVersionFeedback(workspaceId, file.id, version.id, { limit: 100 });
          return [key, feedback.items ?? []] as const;
        } catch {
          // Version history must stay visible if feedback cannot be loaded.
          return [key, [] as AttachmentVersionFeedbackSummary[]] as const;
        }
      }));

      if (sequence !== loadSequence.current) return;
      setVersions(items);
      setFeedbackByVersion(Object.fromEntries(feedbackEntries));
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      setVersions([]);
      setFeedbackByVersion({});
      setError(messageFor(cause, 'Could not load file versions.'));
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [canManage, file.id, workspaceId]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => {
      active = false;
      loadSequence.current += 1;
    };
  }, [load, open]);

  const isBusy = loading || busyAction !== null;

  async function runAction(
    actionKey: string,
    action: () => Promise<void>,
    options: { clearVersionUpload?: boolean; onSuccess?: () => void } = {},
  ): Promise<void> {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyAction(actionKey);
    setError(null);
    setLocalFeedbackError(null);

    let failure: string | null = null;
    try {
      await action();
      options.onSuccess?.();
    } catch (cause) {
      failure = messageFor(cause, 'The request failed. Please try again.');
    } finally {
      // Refresh even after a failed mutation so the list reflects backend state.
      await load();
      if (failure) setError(failure);
      if (options.clearVersionUpload && versionInputRef.current) {
        versionInputRef.current.value = '';
      }
      busyRef.current = false;
      setBusyAction(null);
    }
  }

  function handleVersionFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setVersionFile(event.target.files?.[0] ?? null);
  }

  async function handleUploadVersion(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!versionFile) {
      setError('Select a file to upload.');
      return;
    }
    if (versionFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`${versionFile.name} exceeds the 50 MB limit (${formatBytes(versionFile.size)}).`);
      return;
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(versionFile.type)) {
      setError(`${versionFile.name}: file type "${versionFile.type || 'unknown'}" is not supported.`);
      return;
    }

    await runAction(
      'upload-version',
      async () => {
        await uploadFileVersion({
          workspaceId,
          fileId: file.id,
          file: versionFile,
          changeNote,
        });
      },
      {
        clearVersionUpload: true,
        onSuccess: () => {
          setVersionFile(null);
          setChangeNote('');
        },
      },
    );
  }

  async function handleDownloadVersion(
    version: AttachmentVersionSummary,
    fileName: string,
  ): Promise<void> {
    if (!version.id) return;
    await runAction(
      `download-${version.id}`,
      async () => {
        await downloadFileVersion(workspaceId, file.id, version.id ?? '', fileName);
      },
    );
  }

  async function handleMakeCurrent(version: AttachmentVersionSummary): Promise<void> {
    if (!version.id) return;
    await runAction(
      `make-current-${version.id}`,
      async () => { await makeFileVersionCurrent(workspaceId, file.id, version.id ?? ''); },
    );
  }

  async function handleDeleteVersion(version: AttachmentVersionSummary): Promise<void> {
    if (!version.id) return;
    await runAction(
      `delete-version-${version.id}`,
      async () => { await deleteFileVersion(workspaceId, file.id, version.id ?? ''); },
    );
  }

  async function handlePostFeedback(version: AttachmentVersionSummary, key: string): Promise<void> {
    if (!version.id) return;
    const draft = feedbackDrafts[key] ?? '';
    const validationError = feedbackError(draft);
    if (validationError) {
      setLocalFeedbackError(validationError);
      return;
    }

    await runAction(
      `add-feedback-${key}`,
      async () => {
        await createFileVersionFeedback(workspaceId, file.id, version.id ?? '', draft.trim());
      },
      {
        onSuccess: () => setFeedbackDrafts((previous) => ({ ...previous, [key]: '' })),
      },
    );
  }

  async function handleUpdateFeedback(version: AttachmentVersionSummary, feedbackId: string): Promise<void> {
    if (!version.id) return;
    const validationError = feedbackError(editDraft);
    if (validationError) {
      setLocalFeedbackError(validationError);
      return;
    }

    await runAction(
      `edit-feedback-${feedbackId}`,
      async () => {
        await updateFileVersionFeedback(
          workspaceId,
          file.id,
          version.id ?? '',
          feedbackId,
          editDraft.trim(),
        );
      },
      {
        onSuccess: () => {
          setEditingFeedbackId(null);
          setEditDraft('');
        },
      },
    );
  }

  async function handleDeleteFeedback(version: AttachmentVersionSummary, feedbackId: string): Promise<void> {
    if (!version.id) return;
    await runAction(
      `delete-feedback-${feedbackId}`,
      async () => {
        await deleteFileVersionFeedback(workspaceId, file.id, version.id ?? '', feedbackId);
      },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        aria-expanded={open}
        aria-controls={`${idPrefix}-versions`}
        onClick={() => setOpen((value) => !value)}
      >
        Versions
      </Button>

      {open && (
        <div id={`${idPrefix}-versions`} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Version history</h3>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBusy}
              onClick={() => { void load(); }}
            >
              Refresh
            </Button>
          </div>

          {error ? <Alert variant="error" className="mb-3">{error}</Alert> : null}
          {localFeedbackError ? <Alert variant="error" className="mb-3">{localFeedbackError}</Alert> : null}
          {loading ? (
            <p className="text-sm text-[var(--color-text-secondary)]" role="status">Loading versions…</p>
          ) : null}

          {canManage && (
            <form
              onSubmit={(event) => { void handleUploadVersion(event); }}
              aria-label="Upload new version"
              className="mb-4 space-y-2 rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] p-3"
            >
              <p className="text-sm font-medium">Upload new version</p>
              <input
                ref={versionInputRef}
                type="file"
                accept={ALLOWED_MIME_TYPES.join(',')}
                aria-label="New version file"
                disabled={isBusy}
                onChange={handleVersionFileChange}
                className="block w-full text-xs text-[var(--color-text-secondary)] disabled:opacity-50"
              />
              <Textarea
                id={`${idPrefix}-change-note`}
                label="Change note (optional)"
                value={changeNote}
                maxLength={4000}
                rows={2}
                disabled={isBusy}
                onChange={(event) => setChangeNote(event.target.value)}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isBusy || !versionFile}
                loading={busyAction === 'upload-version'}
              >
                Upload version
              </Button>
            </form>
          )}

          {!loading && versions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No versions found for this file.</p>
          ) : (
            <ol className="space-y-3" aria-label="File versions">
              {sortedVersions.map((version, index) => {
                const key = versionKey(version, index);
                const versionId = version.id;
                const versionNumber = version.versionNumber ?? '—';
                const fileName = version.fileName ?? file.fileName;
                const items = feedbackByVersion[key] ?? [];

                return (
                  <li key={key} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Version {versionNumber}
                          {version.isCurrent ? (
                            <Badge variant="success" className="ml-2">Current</Badge>
                          ) : null}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
                          {fileName} · {typeof version.sizeBytes === 'number' ? formatBytes(version.sizeBytes) : '—'} · {version.uploadedById ?? 'Unknown uploader'} · {formatDate(version.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                          {version.changeNote ? `Note: ${version.changeNote}` : 'No change note'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isBusy || !versionId}
                          loading={busyAction === `download-${versionId}`}
                          onClick={() => { void handleDownloadVersion(version, fileName); }}
                          aria-label={`Download version ${versionNumber}`}
                        >
                          Download
                        </Button>
                        {canManage && versionId && !version.isCurrent ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isBusy}
                            loading={busyAction === `make-current-${versionId}`}
                            onClick={() => { void handleMakeCurrent(version); }}
                            aria-label={`Make version ${versionNumber} current`}
                          >
                            Make current
                          </Button>
                        ) : null}
                        {canManage && versionId ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isBusy}
                            loading={busyAction === `delete-version-${versionId}`}
                            onClick={() => { void handleDeleteVersion(version); }}
                            aria-label={`Delete version ${versionNumber}`}
                          >
                            Delete version
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {canManage && versionId ? (
                      <section className="mt-3 border-t border-[var(--color-border)] pt-3" aria-label={`Feedback for version ${versionNumber}`}>
                        <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">Feedback</p>
                        {items.length === 0 ? (
                          <p className="mb-2 text-xs text-[var(--color-text-muted)]">No feedback yet.</p>
                        ) : (
                          <ul className="mb-3 space-y-2" aria-label={`Feedback items for version ${versionNumber}`}>
                            {items.map((item, itemIndex) => {
                              const itemKey = item.id ?? `${key}-feedback-${itemIndex}`;
                              const isOwn = Boolean(currentUserId && item.authorId === currentUserId);
                              const canDeleteFeedback = Boolean(item.id) && (isOwn || canDeleteAny);
                              const isEditing = editingFeedbackId === item.id;

                              return (
                                <li key={itemKey} className="rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] p-2">
                                  <p className="whitespace-pre-wrap text-sm">{item.body ?? ''}</p>
                                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                    {item.authorId ?? 'Unknown'} · {formatDate(item.createdAt)}
                                    {item.editedAt ? ' · Edited' : ''}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {isOwn && item.id ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isBusy}
                                        onClick={() => {
                                          setEditingFeedbackId(item.id ?? null);
                                          setEditDraft(item.body ?? '');
                                          setLocalFeedbackError(null);
                                        }}
                                        aria-label={`Edit feedback ${itemKey}`}
                                      >
                                        Edit
                                      </Button>
                                    ) : null}
                                    {canDeleteFeedback && item.id ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isBusy}
                                        loading={busyAction === `delete-feedback-${item.id}`}
                                        onClick={() => { void handleDeleteFeedback(version, item.id ?? ''); }}
                                        aria-label={`Delete feedback ${itemKey}`}
                                      >
                                        Delete
                                      </Button>
                                    ) : null}
                                  </div>
                                  {isEditing && item.id ? (
                                    <form
                                      className="mt-2 space-y-2"
                                      aria-label={`Edit feedback ${itemKey}`}
                                      onSubmit={(event) => {
                                        event.preventDefault();
                                        void handleUpdateFeedback(version, item.id ?? '');
                                      }}
                                    >
                                      <Textarea
                                        id={`${idPrefix}-edit-${itemKey}`}
                                        label="Edit feedback"
                                        value={editDraft}
                                        maxLength={MAX_FEEDBACK_LENGTH}
                                        rows={2}
                                        disabled={isBusy}
                                        onChange={(event) => setEditDraft(event.target.value)}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          type="submit"
                                          size="sm"
                                          disabled={isBusy}
                                          loading={busyAction === `edit-feedback-${item.id}`}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          disabled={isBusy}
                                          onClick={() => {
                                            setEditingFeedbackId(null);
                                            setEditDraft('');
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </form>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <form
                          className="space-y-2"
                          aria-label={`Add feedback for version ${versionNumber}`}
                          onSubmit={(event) => {
                            event.preventDefault();
                            void handlePostFeedback(version, key);
                          }}
                        >
                          <Textarea
                            id={`${idPrefix}-feedback-${key}`}
                            label="Add feedback"
                            value={feedbackDrafts[key] ?? ''}
                            maxLength={MAX_FEEDBACK_LENGTH}
                            rows={2}
                            disabled={isBusy}
                            onChange={(event) => setFeedbackDrafts((previous) => ({
                              ...previous,
                              [key]: event.target.value,
                            }))}
                          />
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {(feedbackDrafts[key] ?? '').length}/{MAX_FEEDBACK_LENGTH}
                          </p>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={isBusy || !(feedbackDrafts[key] ?? '').trim()}
                            loading={busyAction === `add-feedback-${key}`}
                          >
                            Post feedback
                          </Button>
                        </form>
                      </section>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
