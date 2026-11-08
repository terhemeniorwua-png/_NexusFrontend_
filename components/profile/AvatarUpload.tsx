'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api';
import { deleteAvatar, uploadAvatar, type UserProfileView } from '@/services/profile';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const ACCEPTED_ACCEPT = ACCEPTED_TYPES.join(',');

// ── Error mapping ─────────────────────────────────────────────────────────────

function friendlyError(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Something went wrong uploading your photo. Please try again.';
  }
  switch (error.code) {
    case 'AVATAR_TOO_LARGE':
      return 'That photo is too large. Please choose one under 2 MB.';
    case 'AVATAR_TYPE_UNSUPPORTED':
    case 'AVATAR_IMAGE_INVALID':
      return 'That file type is not supported. Please use a JPEG, PNG, or WebP photo.';
    case 'AVATAR_UPLOAD_INVALID':
    case 'AVATAR_REQUIRED':
      return 'The upload failed. Please try again.';
    case 'AVATAR_RATE_LIMITED':
      return 'Too many photo changes. Please wait a few minutes and try again.';
    case 'AVATAR_DIMENSIONS_TOO_LARGE':
      return 'That image is too large in dimensions. Please use a smaller photo.';
    default:
      if (error.status === 401) return 'Your session has expired. Please sign in again.';
      if (error.status === 413) return 'That photo is too large. Please choose one under 2 MB.';
      if (error.status === 429) return 'Too many photo changes. Please wait a few minutes and try again.';
      return error.message || 'Something went wrong uploading your photo. Please try again.';
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AvatarUploadProps {
  /** Current avatar URL — null shows initials. */
  avatarUrl: string | null;
  /** Display name for initials fallback and alt text. */
  name: string;
  /**
   * Called when an upload or deletion succeeds with the updated ProfileView.
   * The parent should update its avatarUrl state from this.
   */
  onProfileUpdate: (updated: UserProfileView) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * AvatarUpload
 *
 * Replaces the avatar URL input field. Clicking "Change photo" opens the
 * device file picker. After selecting a file it is validated client-side
 * (size + MIME type), then uploaded. An object-URL preview is shown
 * immediately while uploading and replaced with the confirmed avatarUrl on
 * success.
 *
 * "Remove photo" calls DELETE and falls back to initials.
 *
 * Accessibility:
 * - The hidden file input is triggered by the visible button (aria-controls +
 *   a direct .click() call so keyboard activation works).
 * - Errors are announced via an aria-live region.
 * - Images have descriptive alt text.
 * - Focus moves back to the "Change photo" button after an upload or removal.
 */
export function AvatarUpload({ avatarUrl, name, onProfileUpdate }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const changeButtonWrapRef = useRef<HTMLSpanElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = uploading || removing;

  // Revoke preview blob URLs when they change or the component unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function openPicker() {
    setError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset input value so the same file can be re-selected after an error.
    event.target.value = '';
    if (!file) return;

    // Client-side validation for fast feedback.
    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      setError('That file type is not supported. Please use a JPEG, PNG, or WebP photo.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That photo is too large. Please choose one under 2 MB.');
      return;
    }

    setError(null);

    // Show an optimistic preview before the upload completes.
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const updated = await uploadAvatar(file);
      // Replace the object URL with the confirmed server URL.
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      onProfileUpdate(updated);
    } catch (cause) {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      setError(friendlyError(cause));
    } finally {
      setUploading(false);
      // Return focus to the "Change photo" button via its wrapper.
      changeButtonWrapRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }
  }

  async function handleRemove() {
    setConfirmRemove(false);
    setError(null);
    setRemoving(true);
    try {
      const updated = await deleteAvatar();
      onProfileUpdate(updated);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setRemoving(false);
      changeButtonWrapRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }
  }

  // The URL shown in the avatar: prefer the optimistic preview, then the
  // confirmed server URL.
  const displayUrl = preview ?? avatarUrl;
  const hasPhoto = Boolean(avatarUrl);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* Avatar preview */}
      <div className="flex-shrink-0" aria-hidden="true">
        <Avatar
          src={displayUrl}
          name={name}
          size="lg"
          className={uploading ? 'opacity-60 transition-opacity' : ''}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {/* Hidden file input — triggered by the button below */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_ACCEPT}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleFileChange}
          />

          <span ref={changeButtonWrapRef}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={uploading}
              disabled={busy}
              onClick={openPicker}
              aria-label={uploading ? 'Uploading photo…' : 'Change photo'}
            >
              {uploading ? 'Uploading…' : 'Change photo'}
            </Button>
          </span>

          {hasPhoto && !confirmRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmRemove(true)}
              aria-label="Remove photo"
            >
              Remove photo
            </Button>
          )}

          {confirmRemove && (
            <div
              role="group"
              aria-label="Confirm photo removal"
              className="flex items-center gap-2"
            >
              <span className="text-sm text-[var(--color-text-secondary)]">Remove this photo?</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                loading={removing}
                disabled={busy}
                onClick={() => { void handleRemove(); }}
                aria-label="Yes, remove photo"
              >
                Remove
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmRemove(false)}
                aria-label="Cancel photo removal"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--color-text-muted)]">
          JPEG, PNG or WebP · max 2 MB
        </p>

        {/* Live error region — announced to screen readers */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="min-h-[1.25rem]"
        >
          {error && (
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
