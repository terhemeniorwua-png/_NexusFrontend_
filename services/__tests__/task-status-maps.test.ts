import { describe, expect, it } from 'vitest';
import { TASK_STATUSES } from '@/services/insights';
import type { TaskStatus } from '@/services/tasks';

describe('task status maps', () => {
  it('includes AWAITING_CLARIFICATION in TASK_STATUSES', () => {
    expect(TASK_STATUSES).toContain('AWAITING_CLARIFICATION');
  });

  it('TaskStatus type includes AWAITING_CLARIFICATION at compile time', () => {
    const status: TaskStatus = 'AWAITING_CLARIFICATION';
    expect(status).toBe('AWAITING_CLARIFICATION');
  });
});
