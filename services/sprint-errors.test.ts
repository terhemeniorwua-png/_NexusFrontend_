import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import { SPRINT_ERROR_COPY, sprintErrorCopy, sprintErrorMessage } from './sprint-errors';

describe('sprint error copy', () => {
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
