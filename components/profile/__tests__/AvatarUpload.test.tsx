import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import { deleteAvatar, uploadAvatar } from '@/services/profile';
import { AvatarUpload } from '../AvatarUpload';

// ── Service mocks ─────────────────────────────────────────────────────────────

vi.mock('@/services/profile', () => ({
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
}));

// ── URL mock (jsdom doesn't implement createObjectURL) ────────────────────────

const fakeObjectUrl = 'blob:fake-preview-url';
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => fakeObjectUrl);
  URL.revokeObjectURL = vi.fn();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(name: string, type: string, sizeBytes = 500_000): File {
  // Craft a File whose .size property matches the requested byte count.
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

const baseProps = {
  avatarUrl: null,
  name: 'Ada Lovelace',
  onProfileUpdate: vi.fn(),
};

const updatedProfile = {
  user: { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', status: 'ACTIVE', emailVerifiedAt: null, createdAt: '' },
  profile: { bio: null, jobTitle: null, avatarUrl: '/api/v1/users/me/avatar', timeZone: 'UTC', locale: 'en' },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AvatarUpload', () => {
  it('renders the Change photo button and no Remove photo button when there is no avatar', () => {
    render(<AvatarUpload {...baseProps} />);
    expect(screen.getByRole('button', { name: /Change photo/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove photo/i })).not.toBeInTheDocument();
  });

  it('renders the Remove photo button when an avatar URL is set', () => {
    render(<AvatarUpload {...baseProps} avatarUrl="/api/v1/users/me/avatar" />);
    expect(screen.getByRole('button', { name: /Remove photo/i })).toBeInTheDocument();
  });

  it('does not render an Avatar URL input field', () => {
    render(<AvatarUpload {...baseProps} />);
    expect(screen.queryByLabelText(/avatar.*url/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/https?:\/\//i)).not.toBeInTheDocument();
  });

  // ── Client-side validation ───────────────────────────────────────────────

  it('shows an error and sends no request when the file type is unsupported', async () => {
    render(<AvatarUpload {...baseProps} />);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const badFile = makeFile('photo.gif', 'image/gif');
    // Use fireEvent to bypass the `accept` attribute filter that userEvent applies.
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(
      screen.getByText(/file type is not supported/i),
    ).toBeInTheDocument();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('shows an error and sends no request when the file exceeds 2 MB', async () => {
    render(<AvatarUpload {...baseProps} />);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const bigFile = makeFile('photo.jpg', 'image/jpeg', 3 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(screen.getByText(/too large/i)).toBeInTheDocument();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  // ── Successful upload ────────────────────────────────────────────────────

  it('sends FormData to uploadAvatar and calls onProfileUpdate on success', async () => {
    vi.mocked(uploadAvatar).mockResolvedValue(updatedProfile);
    const onProfileUpdate = vi.fn();
    const user = userEvent.setup();
    render(<AvatarUpload {...baseProps} onProfileUpdate={onProfileUpdate} />);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const validFile = makeFile('photo.png', 'image/png');
    await user.upload(input, validFile);

    await waitFor(() => expect(uploadAvatar).toHaveBeenCalledOnce());
    // The argument must be the File itself (not a FormData — the service wraps it).
    expect(uploadAvatar).toHaveBeenCalledWith(validFile);
    expect(onProfileUpdate).toHaveBeenCalledWith(updatedProfile);
  });

  it('shows an uploading state while the request is in flight', async () => {
    let resolve!: (v: typeof updatedProfile) => void;
    vi.mocked(uploadAvatar).mockImplementation(() => new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<AvatarUpload {...baseProps} />);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, makeFile('photo.webp', 'image/webp'));

    expect(screen.getByRole('button', { name: /Uploading/i })).toBeDisabled();
    resolve(updatedProfile);
    await waitFor(() => expect(uploadAvatar).toHaveBeenCalled());
  });

  it('revokes the preview object URL on success', async () => {
    vi.mocked(uploadAvatar).mockResolvedValue(updatedProfile);
    const user = userEvent.setup();
    render(<AvatarUpload {...baseProps} />);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, makeFile('photo.jpg', 'image/jpeg'));

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith(fakeObjectUrl));
  });

  // ── Server error codes ───────────────────────────────────────────────────

  it.each([
    ['AVATAR_TOO_LARGE', 413, /too large/i],
    ['AVATAR_TYPE_UNSUPPORTED', 415, /not supported/i],
    ['AVATAR_IMAGE_INVALID', 415, /not supported/i],
    ['AVATAR_RATE_LIMITED', 429, /too many photo changes/i],
  ])('maps server error code %s to a friendly message', async (code, status, pattern) => {
    vi.mocked(uploadAvatar).mockRejectedValue(new ApiRequestError('server msg', status, code));
    const user = userEvent.setup();
    render(<AvatarUpload {...baseProps} />);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, makeFile('photo.jpg', 'image/jpeg'));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(pattern));
  });

  // ── Remove flow ──────────────────────────────────────────────────────────

  it('asks for confirmation before calling deleteAvatar', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload {...baseProps} avatarUrl="/api/v1/users/me/avatar" />);

    await user.click(screen.getByRole('button', { name: /Remove photo/i }));

    // Confirmation step shown; delete not called yet.
    expect(screen.getByRole('group', { name: /Confirm photo removal/i })).toBeInTheDocument();
    expect(deleteAvatar).not.toHaveBeenCalled();
  });

  it('calls deleteAvatar and calls onProfileUpdate on confirmation', async () => {
    const deletedProfile = {
      ...updatedProfile,
      profile: { ...updatedProfile.profile, avatarUrl: null },
    };
    vi.mocked(deleteAvatar).mockResolvedValue(deletedProfile);
    const onProfileUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      <AvatarUpload {...baseProps} avatarUrl="/api/v1/users/me/avatar" onProfileUpdate={onProfileUpdate} />,
    );

    await user.click(screen.getByRole('button', { name: /Remove photo/i }));
    await user.click(screen.getByRole('button', { name: /Yes, remove photo/i }));

    await waitFor(() => expect(deleteAvatar).toHaveBeenCalledOnce());
    expect(onProfileUpdate).toHaveBeenCalledWith(deletedProfile);
  });

  it('cancels the remove confirmation without calling deleteAvatar', async () => {
    const user = userEvent.setup();
    render(<AvatarUpload {...baseProps} avatarUrl="/api/v1/users/me/avatar" />);

    await user.click(screen.getByRole('button', { name: /Remove photo/i }));
    await user.click(screen.getByRole('button', { name: /Cancel photo removal/i }));

    expect(deleteAvatar).not.toHaveBeenCalled();
    // Back to normal Remove photo button.
    expect(screen.getByRole('button', { name: /Remove photo/i })).toBeInTheDocument();
  });
});
