import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import { SPRINT_ERROR_COPY, sprintErrorCopy, sprintErrorMessage } from './sprint-errors';

describe('sprint error copy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(Object.entries(SPRINT_ERROR_COPY))('maps %s to plain copy', (code, copy) => {
    expect(sprintErrorCopy(code)).toBe(copy);
    expect(sprintErrorMessage(new ApiRequestError(`Stage 2 ${code} detail`, 409, code), 'Fallback')).toBe(copy);
  });

  it('passes through an unknown code using the backend message', () => {
    expect(sprintErrorCopy('SOME_NEW_CODE')).toBeNull();
    expect(sprintErrorMessage(new ApiRequestError('Backend knows best', 422, 'SOME_NEW_CODE'), 'Fallback'))
      .toBe('Backend knows best');
  });

  it('uses the fallback when there is no mapped copy and no backend message', () => {
    expect(sprintErrorMessage(new ApiRequestError('', 409, 'SOME_NEW_CODE'), 'Fallback')).toBe('Fallback');
    expect(sprintErrorMessage(new Error('not an API error'), 'Fallback')).toBe('Fallback');
  });

  it('warns once in development when an unknown code uses the backend message', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NODE_ENV', 'development');
    const cause = new ApiRequestError('Backend knows best', 422, 'WARN_ONCE_CODE');

    expect(sprintErrorMessage(cause, 'Fallback')).toBe('Backend knows best');
    expect(sprintErrorMessage(cause, 'Fallback')).toBe('Backend knows best');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Unknown sprint error code: WARN_ONCE_CODE');
  });

  it('does not warn outside development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NODE_ENV', 'test');

    expect(sprintErrorMessage(new ApiRequestError('Backend knows best', 422, 'NO_DEV_WARN_CODE'), 'Fallback'))
      .toBe('Backend knows best');
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn for mapped codes in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NODE_ENV', 'development');

    expect(sprintErrorMessage(
      new ApiRequestError('Stage 2 detail', 409, 'SPRINT_NOT_EDITABLE'),
      'Fallback',
    )).toBe('Only planned sprints can be edited.');
    expect(warn).not.toHaveBeenCalled();
  });

  it('never exposes a known code or stage-2 wording in mapped copy', () => {
    const message = sprintErrorMessage(
      new ApiRequestError('Stage 2 sprints cannot be edited (SPRINT_NOT_EDITABLE)', 409, 'SPRINT_NOT_EDITABLE'),
      'Fallback',
    );
    expect(message).toBe('Only planned sprints can be edited.');
    expect(message).not.toContain('SPRINT_NOT_EDITABLE');
    expect(message).not.toMatch(/stage 2/i);
  });
});
