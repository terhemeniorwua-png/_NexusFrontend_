import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

export interface UserProfileView {
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
    emailVerifiedAt: string | null;
    createdAt: string;
  };
  profile: {
    bio: string | null;
    jobTitle: string | null;
    /** Absolute URL to the uploaded avatar, legacy external URL, or null. */
    avatarUrl: string | null;
    timeZone: string;
    locale: string;
  };
}

export interface UpdateUserProfileInput {
  name?: string;
  bio?: string | null;
  jobTitle?: string | null;
  timeZone?: string;
  locale?: string;
}

export function getUserProfile(): Promise<UserProfileView> {
  return apiRequest<UserProfileView>('/users/me', { authenticated: true });
}

export function updateUserProfile(input: UpdateUserProfileInput): Promise<UserProfileView> {
  return apiRequest<UserProfileView>('/users/me', {
    method: 'PATCH',
    authenticated: true,
    body: JSON.stringify(input),
  });
}

/**
 * Upload a new avatar image.
 *
 * Sends the file as multipart/form-data with the field name `avatar` (the
 * backend multer config uses `.single('avatar')`). The Content-Type header
 * must NOT be set manually so the browser attaches the correct boundary.
 *
 * Returns the updated ProfileView on success.
 */
export async function uploadAvatar(file: File): Promise<UserProfileView> {
  const form = new FormData();
  form.append('avatar', file);
  try {
    return await apiRequest<UserProfileView>('/users/me/avatar', {
      method: 'POST',
      authenticated: true,
      // Pass FormData directly. Do not set Content-Type — the browser must add
      // the multipart/form-data boundary itself.
      body: form,
    });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<UserProfileView>('/users/me/avatar', {
      method: 'POST',
      authenticated: true,
      body: form,
    });
  }
}

/**
 * Remove the current avatar. Falls back to initials in the UI.
 * Returns the updated ProfileView (profile.avatarUrl will be null).
 */
export async function deleteAvatar(): Promise<UserProfileView> {
  try {
    return await apiRequest<UserProfileView>('/users/me/avatar', {
      method: 'DELETE',
      authenticated: true,
    });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<UserProfileView>('/users/me/avatar', {
      method: 'DELETE',
      authenticated: true,
    });
  }
}
