import { apiRequest, ApiRequestError, setAccessToken } from "@/lib/api";
import { refreshSession } from "@/services/auth";

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

export interface AccountDeletionResponse {
  status: "PENDING_DELETION";
  scheduledDeletionAt: string;
}

export function getAccountSessions(): Promise<AccountSessionsResponse> {
  return apiRequest<AccountSessionsResponse>("/auth/sessions", {
    authenticated: true,
  });
}

export function changeAccountPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/password/change", {
    method: "POST",
    authenticated: true,
    body: JSON.stringify(input),
  });
}

export function requestAccountEmailChange(input: {
  email: string;
  currentPassword: string;
}): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/email/change", {
    method: "POST",
    authenticated: true,
    body: JSON.stringify(input),
  });
}

export async function deleteAccount(input: {
  currentPassword: string;
  confirmation: string;
}): Promise<AccountDeletionResponse> {
  const request = () =>
    apiRequest<AccountDeletionResponse>("/auth/delete", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify(input),
    });
  let result: AccountDeletionResponse;
  try {
    result = await request();
  } catch (error) {
    if (
      !(error instanceof ApiRequestError) ||
      error.status !== 401 ||
      error.code === "INVALID_CREDENTIALS"
    )
      throw error;
    await refreshSession();
    result = await request();
  }
  setAccessToken(null);
  return result;
}

export async function signOutAllSessions(): Promise<void> {
  try {
    await apiRequest<void>("/auth/logout-all", {
      method: "POST",
      authenticated: true,
    });
  } finally {
    setAccessToken(null);
  }
}
