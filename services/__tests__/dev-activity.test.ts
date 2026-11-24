import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import { devActivityErrorMessage } from '../dev-activity-errors';
import {
  buildDevActivityCommitsQuery,
  buildDevActivityDevelopersQuery,
} from '../dev-integrations';

describe('dev-activity query builders', () => {
  it('drops undefined and empty values', () => {
    expect(
      buildDevActivityCommitsQuery({
        cursor: '',
        repositoryId: '  ',
        authorLogin: undefined,
        from: '',
        to: undefined,
        limit: 20,
      }),
    ).toBe('?limit=20');

    expect(
      buildDevActivityDevelopersQuery({
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-30T23:59:59.999Z',
        repositoryId: ' ',
      }),
    ).toBe('?from=2026-11-01T00%3A00%3A00.000Z&to=2026-11-30T23%3A59%3A59.999Z');
  });

  it('treats cursor as an opaque string', () => {
    const cursor = 'eyJjIjoiMjAyNi0xMS0yNFQwMDowMDowMC4wMDBaIiwiaSI6ImFiYyJ9';
    expect(buildDevActivityCommitsQuery({ cursor, limit: 20 })).toBe(
      `?cursor=${encodeURIComponent(cursor)}&limit=20`,
    );
  });
});

describe('devActivityErrorMessage', () => {
  it('uses mapped 403 copy by context', () => {
    expect(
      devActivityErrorMessage(
        new ApiRequestError('Forbidden', 403, 'PERMISSION_DENIED'),
        'commits',
      ),
    ).toBe("You do not have access to this project's activity.");
    expect(
      devActivityErrorMessage(
        new ApiRequestError('Forbidden', 403, 'PERMISSION_DENIED'),
        'developers',
      ),
    ).toBe('You do not have access to this report.');
  });

  it('maps 404 repository filter copy before backend message', () => {
    expect(
      devActivityErrorMessage(
        new ApiRequestError('Linked repository not found', 404, 'PROJECT_REPOSITORY_NOT_FOUND'),
        'commits',
      ),
    ).toBe('This repository is not available.');
  });

  it('maps invalid cursor and date/range validation', () => {
    expect(
      devActivityErrorMessage(
        new ApiRequestError('Invalid cursor', 400, 'VALIDATION_ERROR'),
        'commits',
      ),
    ).toBe('This page of commits could not be loaded. Please refresh.');
    expect(
      devActivityErrorMessage(
        new ApiRequestError('from must be before to', 400, 'VALIDATION_ERROR'),
        'developers',
      ),
    ).toBe('Check the selected dates and try again.');
  });

  it('falls back to backend message then existing fallback', () => {
    expect(
      devActivityErrorMessage(new ApiRequestError('Custom backend message', 500, 'INTERNAL'), 'commits'),
    ).toBe('Custom backend message');
    expect(devActivityErrorMessage(new Error('network'), 'commits')).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
