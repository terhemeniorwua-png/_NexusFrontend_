import { apiRequest, setAccessToken } from '@/lib/api';

export interface AccountSession {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AccountSessionsResponse {
  sessions: AccountSession[];
}

export function getAccountSessions(): Promise<AccountSessionsResponse> {
  return apiRequest<AccountSessionsResponse>('/auth/sessions', { authenticated: true });
}

export function changeAccountPassword(input: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/password/change', {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify(input),
  });
}

export function requestAccountEmailChange(input: { email: string; currentPassword: string }): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/email/change', {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify(input),
  });
}

export async function signOutAllSessions(): Promise<void> {
  try {
    await apiRequest<void>('/auth/logout-all', { method: 'POST', authenticated: true });
  } finally {
    setAccessToken(null);
  }
}
