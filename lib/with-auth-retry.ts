import { ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

/**
 * Runs a request; on a 401 it refreshes the session once (which restores the
 * in-memory access token) and retries. Covers the page-reload case where the
 * access token is null until a refresh happens.
 */
export async function withAuthRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      await refreshSession();
      return run();
    }
    throw error;
  }
}
