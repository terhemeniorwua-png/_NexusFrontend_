import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileVersionsPanel } from '../FileVersionsPanel';
import { ApiRequestError } from '@/lib/api';
import type {
  AttachmentVersionFeedbackSummary,
  AttachmentVersionSummary,
} from '@/services/files';

const mocks = vi.hoisted(() => ({
  listFileVersions: vi.fn(),
  listFileVersionFeedback: vi.fn(),
  uploadFileVersion: vi.fn(),
  makeFileVersionCurrent: vi.fn(),
  deleteFileVersion: vi.fn(),
  createFileVersionFeedback: vi.fn(),
  updateFileVersionFeedback: vi.fn(),
  deleteFileVersionFeedback: vi.fn(),
  downloadFileVersion: vi.fn(),
}));

vi.mock('@/services/files', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/files')>();
  return { ...actual, ...mocks };
});

const WS = 'workspace-1';
const FILE_ID = 'file-1';
const CURRENT_USER = 'user-2';

const file = { id: FILE_ID, fileName: 'report.pdf' };

const oldVersion: AttachmentVersionSummary = {
  id: 'version-1',
  attachmentId: FILE_ID,
  versionNumber: 1,
  isCurrent: false,
  fileName: 'report-v1.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  uploadedById: 'user-1',
  changeNote: 'Initial draft',
  createdAt: '2026-11-20T10:00:00.000Z',
};

const currentVersion: AttachmentVersionSummary = {
  id: 'version-2',
  attachmentId: FILE_ID,
  versionNumber: 2,
  isCurrent: true,
  fileName: 'report-v2.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 204800,
  uploadedById: CURRENT_USER,
  changeNote: 'Updated figures',
  createdAt: '2026-11-21T10:00:00.000Z',
};

const ownFeedback: AttachmentVersionFeedbackSummary = {
  id: 'feedback-own',
  attachmentVersionId: 'version-1',
  authorId: CURRENT_USER,
  body: 'Please check the total.',
  createdAt: '2026-11-21T11:00:00.000Z',
  updatedAt: '2026-11-21T11:00:00.000Z',
  editedAt: null,
};

const otherFeedback: AttachmentVersionFeedbackSummary = {
  id: 'feedback-other',
  attachmentVersionId: 'version-1',
  authorId: 'user-3',
  body: 'Looks good to me.',
  createdAt: '2026-11-21T12:00:00.000Z',
  updatedAt: '2026-11-21T12:00:00.000Z',
  editedAt: null,
};

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Versions' }));
  expect(await screen.findByText('Version history')).toBeInTheDocument();
}

describe('FileVersionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listFileVersions.mockResolvedValue({ items: [], nextCursor: null });
    mocks.listFileVersionFeedback.mockResolvedValue({ items: [], nextCursor: null });
    mocks.uploadFileVersion.mockResolvedValue(currentVersion);
    mocks.makeFileVersionCurrent.mockResolvedValue(currentVersion);
    mocks.deleteFileVersion.mockResolvedValue(undefined);
    mocks.createFileVersionFeedback.mockResolvedValue(ownFeedback);
    mocks.updateFileVersionFeedback.mockResolvedValue(ownFeedback);
    mocks.deleteFileVersionFeedback.mockResolvedValue(undefined);
    mocks.downloadFileVersion.mockResolvedValue(undefined);
  });

  it('renders versions newest first with the current badge and version details', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [oldVersion, currentVersion], nextCursor: null });

    render(
      <FileVersionsPanel
        workspaceId={WS}
        file={file}
        canManage
        canDeleteAny={false}
        currentUserId={CURRENT_USER}
      />,
    );
    await openPanel(user);

    const list = await screen.findByRole('list', { name: 'File versions' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Version 2');
    expect(rows[1]).toHaveTextContent('Version 1');
    expect(within(rows[0]).getByText('Current')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/report-v2\.pdf/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/200 KB/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/user-2/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Updated figures/)).toBeInTheDocument();
    expect(within(rows[0]).getByRole('button', { name: 'Download version 2' })).toBeInTheDocument();
  });

  it('uploads a new version with the selected file and change note', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [currentVersion], nextCursor: null });
    render(
      <FileVersionsPanel workspaceId={WS} file={file} canManage currentUserId={CURRENT_USER} />,
    );
    await openPanel(user);

    const newFile = new File(['v3'], 'report-v3.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('New version file'), newFile);
    await user.type(screen.getByLabelText('Change note (optional)'), 'Revised figures');
    await user.click(screen.getByRole('button', { name: 'Upload version' }));

    await waitFor(() => expect(mocks.uploadFileVersion).toHaveBeenCalledWith({
      workspaceId: WS,
      fileId: FILE_ID,
      file: newFile,
      changeNote: 'Revised figures',
    }));
  });

  it('sends make-current and delete-version requests for the right version', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [oldVersion, currentVersion], nextCursor: null });
    render(
      <FileVersionsPanel workspaceId={WS} file={file} canManage currentUserId={CURRENT_USER} />,
    );
    await openPanel(user);

    await user.click(screen.getByRole('button', { name: 'Make version 1 current' }));
    await waitFor(() => expect(mocks.makeFileVersionCurrent).toHaveBeenCalledWith(WS, FILE_ID, 'version-1'));

    await user.click(screen.getByRole('button', { name: 'Delete version 1' }));
    await waitFor(() => expect(mocks.deleteFileVersion).toHaveBeenCalledWith(WS, FILE_ID, 'version-1'));
  });

  it('disables actions while a request is in flight and does not submit twice', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [oldVersion], nextCursor: null });
    let resolveRequest: (() => void) | undefined;
    mocks.makeFileVersionCurrent.mockReturnValue(new Promise<void>((resolve) => {
      resolveRequest = resolve;
    }));

    render(
      <FileVersionsPanel workspaceId={WS} file={file} canManage currentUserId={CURRENT_USER} />,
    );
    await openPanel(user);

    const makeCurrent = screen.getByRole('button', { name: 'Make version 1 current' });
    await user.click(makeCurrent);
    await waitFor(() => expect(makeCurrent).toBeDisabled());
    fireEvent.click(makeCurrent);

    expect(resolveRequest).toBeTypeOf('function');
    resolveRequest?.();
    await waitFor(() => expect(mocks.makeFileVersionCurrent).toHaveBeenCalledTimes(1));
  });

  it('posts, edits and deletes feedback with the backend-equivalent requests', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [oldVersion], nextCursor: null });
    mocks.listFileVersionFeedback.mockResolvedValue({ items: [ownFeedback, otherFeedback], nextCursor: null });

    render(
      <FileVersionsPanel
        workspaceId={WS}
        file={file}
        canManage
        canDeleteAny={false}
        currentUserId={CURRENT_USER}
      />,
    );
    await openPanel(user);

    const section = await screen.findByRole('region', { name: 'Feedback for version 1' });
    expect(within(section).getByText('Please check the total.')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Edit feedback feedback-own' })).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Edit feedback feedback-other' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Delete feedback feedback-other' })).not.toBeInTheDocument();

    await user.type(within(section).getByLabelText('Add feedback'), 'Needs a source');
    await user.click(within(section).getByRole('button', { name: 'Post feedback' }));
    await waitFor(() => expect(mocks.createFileVersionFeedback)
      .toHaveBeenCalledWith(WS, FILE_ID, 'version-1', 'Needs a source'));

    await user.click(within(section).getByRole('button', { name: 'Edit feedback feedback-own' }));
    const editBox = within(section).getByLabelText('Edit feedback');
    await user.clear(editBox);
    await user.type(editBox, 'Updated comment');
    await user.click(within(section).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocks.updateFileVersionFeedback)
      .toHaveBeenCalledWith(WS, FILE_ID, 'version-1', 'feedback-own', 'Updated comment'));

    await user.click(within(section).getByRole('button', { name: 'Delete feedback feedback-own' }));
    await waitFor(() => expect(mocks.deleteFileVersionFeedback)
      .toHaveBeenCalledWith(WS, FILE_ID, 'version-1', 'feedback-own'));
  });

  it('lets an admin delete another author’s feedback', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [oldVersion], nextCursor: null });
    mocks.listFileVersionFeedback.mockResolvedValue({ items: [otherFeedback], nextCursor: null });

    render(
      <FileVersionsPanel
        workspaceId={WS}
        file={file}
        canManage
        canDeleteAny
        currentUserId={CURRENT_USER}
      />,
    );
    await openPanel(user);

    const section = await screen.findByRole('region', { name: 'Feedback for version 1' });
    await user.click(within(section).getByRole('button', { name: 'Delete feedback feedback-other' }));
    await waitFor(() => expect(mocks.deleteFileVersionFeedback)
      .toHaveBeenCalledWith(WS, FILE_ID, 'version-1', 'feedback-other'));
  });

  it('enforces the 1–4000 character feedback limit in the client', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [oldVersion], nextCursor: null });
    render(
      <FileVersionsPanel workspaceId={WS} file={file} canManage currentUserId={CURRENT_USER} />,
    );
    await openPanel(user);

    const section = await screen.findByRole('region', { name: 'Feedback for version 1' });
    const textarea = within(section).getByLabelText('Add feedback');
    const postButton = within(section).getByRole('button', { name: 'Post feedback' });
    expect(postButton).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'a'.repeat(4001) } });
    await user.click(postButton);

    expect(await screen.findByText(/between 1 and 4000 characters/)).toBeInTheDocument();
    expect(mocks.createFileVersionFeedback).not.toHaveBeenCalled();
  });

  it('hides all write actions and feedback for viewers', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [oldVersion], nextCursor: null });
    render(
      <FileVersionsPanel
        workspaceId={WS}
        file={file}
        canManage={false}
        canDeleteAny={false}
        currentUserId={CURRENT_USER}
      />,
    );
    await openPanel(user);

    expect(await screen.findByText('Version 1')).toBeInTheDocument();
    expect(screen.queryByText('Upload new version')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make version 1 current' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete version 1' })).not.toBeInTheDocument();
    expect(screen.queryByText('Feedback')).not.toBeInTheDocument();
    expect(mocks.listFileVersionFeedback).not.toHaveBeenCalled();
  });

  it('shows the backend LAST_VERSION message and refreshes after the failed delete', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [oldVersion], nextCursor: null });
    mocks.deleteFileVersion.mockRejectedValue(
      new ApiRequestError('The last live version cannot be deleted', 409, 'LAST_VERSION'),
    );

    render(
      <FileVersionsPanel workspaceId={WS} file={file} canManage currentUserId={CURRENT_USER} />,
    );
    await openPanel(user);

    await user.click(screen.getByRole('button', { name: 'Delete version 1' }));

    expect(await screen.findByText('The last live version cannot be deleted')).toBeInTheDocument();
    await waitFor(() => expect(mocks.listFileVersions).toHaveBeenCalledTimes(2));
  });

  it('renders a version with missing fields without crashing', async () => {
    const user = userEvent.setup();
    mocks.listFileVersions.mockResolvedValue({ items: [{}], nextCursor: null });
    render(
      <FileVersionsPanel workspaceId={WS} file={file} canManage currentUserId={CURRENT_USER} />,
    );
    await openPanel(user);

    expect(await screen.findByText(/Version —/)).toBeInTheDocument();
    expect(screen.getByText(/Unknown uploader/)).toBeInTheDocument();
    expect(screen.getByText('No change note')).toBeInTheDocument();
    expect(mocks.listFileVersionFeedback).not.toHaveBeenCalled();
  });
});
