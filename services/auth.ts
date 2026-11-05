import { apiRequest, ApiRequestError, setAccessToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  expiresAt: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  csrfToken: string;
  session: AuthSession;
}

export interface AuthMessage {
  message: string;
}

let refreshInFlight: Promise<AuthResponse> | null = null;

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: AuthUser; verificationRequired: true }> {
  return apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setAccessToken(result.accessToken);
  return result;
}

export async function reactivateAccount(input: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser }> {
  return apiRequest('/auth/reactivate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function verifyEmail(token: string): Promise<{ user: AuthUser }> {
  return apiRequest('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function resendVerification(email: string): Promise<AuthMessage> {
  return apiRequest('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function requestPasswordReset(email: string): Promise<AuthMessage> {
  return apiRequest('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<AuthMessage> {
  return apiRequest('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function refreshSession(): Promise<AuthResponse> {
  if (refreshInFlight) return refreshInFlight;

  const refresh = apiRequest<AuthResponse>('/auth/refresh', { method: 'POST' })
    .then((result) => {
      if (!result || typeof result.accessToken !== 'string' || !result.accessToken) {
        throw new ApiRequestError('Your session could not be restored. Sign in again.', 401, 'INVALID_REFRESH_RESPONSE');
      }
      setAccessToken(result.accessToken);
      return result;
    })
    .catch((error: unknown) => {
      setAccessToken(null);
      throw error;
    });

  refreshInFlight = refresh;
  void refresh.then(
    () => { if (refreshInFlight === refresh) refreshInFlight = null; },
    () => { if (refreshInFlight === refresh) refreshInFlight = null; },
  );
  return refresh;
}

export async function signOut(): Promise<void> {
  try {
    await apiRequest<void>('/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}
