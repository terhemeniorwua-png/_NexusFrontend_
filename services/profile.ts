import { apiRequest } from '@/lib/api';

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
    avatarUrl: string | null;
    timeZone: string;
    locale: string;
  };
}

export interface UpdateUserProfileInput {
  name?: string;
  bio?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
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
