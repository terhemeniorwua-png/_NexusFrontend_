import { ApiRequestError } from '@/lib/api';

export type DevActivityErrorContext = 'commits' | 'developers';

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.';

function isInvalidCursor(error: ApiRequestError): boolean {
  if (error.code !== 'VALIDATION_ERROR') return false;
  const msg = error.message.toLowerCase();
  return msg.includes('cursor');
}

function isRepositoryFilter404(error: ApiRequestError): boolean {
  if (error.status !== 404) return false;
  return (
    error.code === 'PROJECT_REPOSITORY_NOT_FOUND' ||
    error.message.toLowerCase().includes('repository')
  );
}

function isDateRange400(error: ApiRequestError): boolean {
  if (error.status !== 400) return false;
  if (isInvalidCursor(error)) return false;
  return (
    error.code === 'VALIDATION_ERROR' ||
    error.message.toLowerCase().includes('from') ||
    error.message.toLowerCase().includes('to') ||
    error.message.toLowerCase().includes('date') ||
    error.message.toLowerCase().includes('range')
  );
}

export function devActivityErrorMessage(
  cause: unknown,
  context: DevActivityErrorContext,
  fallback = DEFAULT_FALLBACK,
): string {
  if (!(cause instanceof ApiRequestError)) {
    return fallback;
  }

  if (cause.status === 403) {
    return context === 'commits'
      ? "You do not have access to this project's activity."
      : 'You do not have access to this report.';
  }

  if (isRepositoryFilter404(cause)) {
    return 'This repository is not available.';
  }

  if (context === 'commits' && isInvalidCursor(cause)) {
    return 'This page of commits could not be loaded. Please refresh.';
  }

  if (isDateRange400(cause)) {
    return 'Check the selected dates and try again.';
  }

  if (cause.message && cause.message.trim()) {
    return cause.message;
  }

  return fallback;
}
