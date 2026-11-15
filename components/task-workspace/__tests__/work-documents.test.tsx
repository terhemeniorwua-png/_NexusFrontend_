import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { WorkDocuments } from '../WorkDocuments';
import { ApiRequestError } from '@/lib/api';

const docMocks = vi.hoisted(() => ({
  listTaskWorkDocuments: vi.fn(),
  getTaskWorkDocument: vi.fn(),
  createTaskWorkDocument: vi.fn(),
  updateTaskWorkDocument: vi.fn(),
  listTaskWorkDocumentVersions: vi.fn(),
  getTaskWorkDocumentVersion: vi.fn(),
  restoreTaskWorkDocumentVersion: vi.fn(),
  deleteTaskWorkDocument: vi.fn(),
}));

vi.mock('@/services/tasks', async () => {
  const actual = await vi.importActual<typeof import('@/services/tasks')>('@/services/tasks');
  return {
    ...actual,
    listTaskWorkDocuments: docMocks.listTaskWorkDocuments,
    getTaskWorkDocument: docMocks.getTaskWorkDocument,
    createTaskWorkDocument: docMocks.createTaskWorkDocument,
    updateTaskWorkDocument: docMocks.updateTaskWorkDocument,
    listTaskWorkDocumentVersions: docMocks.listTaskWorkDocumentVersions,
    getTaskWorkDocumentVersion: docMocks.getTaskWorkDocumentVersion,
    restoreTaskWorkDocumentVersion: docMocks.restoreTaskWorkDocumentVersion,
    deleteTaskWorkDocument: docMocks.deleteTaskWorkDocument,
  };
});

// Minimal TipTap mock: capture onUpdate and expose controllable API
let capturedOnUpdate: (() => void) | undefined;
const fakeEditor = {
  getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'edited' }] }] })),
  commands: { setContent: vi.fn() },
  setEditable: vi.fn(),
  isActive: vi.fn(() => false),
  getAttributes: vi.fn(() => ({})),
  chain: vi.fn(() => ({
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    extendMarkRange: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    insertTable: vi.fn().mockReturnThis(),
    run: vi.fn(),
  })),
};

vi.mock('@tiptap/react', () => ({
  useEditor: (opts: { onUpdate?: () => void }) => {
    capturedOnUpdate = opts?.onUpdate;
    return fakeEditor;
  },
  EditorContent: () => <div data-testid="editor-content" />,
}));

const summary = {
  id: 'doc-1',
  taskId: 'task-1',
  title: 'Spec',
  createdById: 'u1',
  createdBy: { id: 'u1', name: 'User' },
  currentVersion: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('WorkDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnUpdate = undefined;
    fakeEditor.getJSON.mockReturnValue({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'edited' }] }] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows empty state when no documents', async () => {
    docMocks.listTaskWorkDocuments.mockResolvedValue({ items: [] });
    render(
      <WorkDocuments workspaceId="w1" projectId="p1" taskId="t1" canEdit canDelete={false} onSaveStateChange={vi.fn()} />,
    );
    expect(await screen.findByText('No work documents yet.')).toBeInTheDocument();
  });

  it('shows loaded document and read-only state without edit permission', async () => {
    docMocks.listTaskWorkDocuments.mockResolvedValue({ items: [summary] });
    docMocks.getTaskWorkDocument.mockResolvedValue({ ...summary, content: { type: 'doc', content: [] } });
    render(
      <WorkDocuments workspaceId="w1" projectId="p1" taskId="t1" canEdit={false} canDelete={false} onSaveStateChange={vi.fn()} />,
    );
    expect(await screen.findByDisplayValue('Spec')).toBeInTheDocument();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('shows list error state', async () => {
    docMocks.listTaskWorkDocuments.mockRejectedValue(new ApiRequestError('Boom', 500));
    render(
      <WorkDocuments workspaceId="w1" projectId="p1" taskId="t1" canEdit canDelete={false} onSaveStateChange={vi.fn()} />,
    );
    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });

  it('handles 409 conflict by showing reload/copy UI and never discarding local text', async () => {
    docMocks.listTaskWorkDocuments.mockResolvedValue({ items: [summary] });
    docMocks.getTaskWorkDocument.mockResolvedValue({ ...summary, content: { type: 'doc', content: [] } });
    const conflictErr = new ApiRequestError('Conflict', 409, 'WORK_DOCUMENT_CONFLICT', {
      currentVersion: 2,
      latestContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'latest' }] }] },
      document: { ...summary, currentVersion: 2, title: 'Spec latest' },
    });
    docMocks.updateTaskWorkDocument.mockRejectedValue(conflictErr);
    const onSave = vi.fn();
    render(
      <WorkDocuments workspaceId="w1" projectId="p1" taskId="t1" canEdit canDelete={false} onSaveStateChange={onSave} />,
    );
    await screen.findByDisplayValue('Spec');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/conflict detected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload latest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy my text/i })).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith('conflict');
    // local text remains accessible
    expect(screen.getByText(/edited/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /reload latest/i }));
    await waitFor(() => expect(screen.queryByText(/conflict detected/i)).not.toBeInTheDocument());
    expect(fakeEditor.commands.setContent).toHaveBeenCalled();
  });

  it('autosaves after debounce and reports saving/saved states', async () => {
    vi.useFakeTimers();
    docMocks.listTaskWorkDocuments.mockResolvedValue({ items: [summary] });
    docMocks.getTaskWorkDocument.mockResolvedValue({ ...summary, content: { type: 'doc', content: [] } });
    docMocks.updateTaskWorkDocument.mockResolvedValue({ ...summary, currentVersion: 2, content: { type: 'doc', content: [] }, throttled: false });
    const onSave = vi.fn();
    render(
      <WorkDocuments workspaceId="w1" projectId="p1" taskId="t1" canEdit canDelete={false} onSaveStateChange={onSave} />,
    );
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByDisplayValue('Spec')).toBeInTheDocument();
    expect(capturedOnUpdate).toBeDefined();

    await act(async () => { capturedOnUpdate?.(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    await act(async () => { await Promise.resolve(); });

    expect(docMocks.updateTaskWorkDocument).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith('saving');
    expect(onSave).toHaveBeenCalledWith('saved');
  });
});
