import { describe, expect, it } from 'vitest';
import { sprintReportReasonCopy } from './sprint-report-reasons';

describe('sprintReportReasonCopy', () => {
  it.each([
    ['SPRINT_CREATED_BEFORE_AUDIT_TRAIL_EPOCH', 'This sprint was created before scope history was recorded.'],
    ['COMPLETED_SPRINT_MISSING_COMPLETION_AUDIT', 'This sprint was completed without recorded scope history.'],
    ['COMPLETED_SPRINT_MISSING_COMPLETION_TASK_IDS', 'This sprint was completed without recorded scope history.'],
    ['CARRY_IN_COMPLETION_MISSING_TASK_IDS', 'Tasks carried in from an earlier sprint have no recorded history.'],
  ])('maps %s to product copy', (reason, expected) => {
    expect(sprintReportReasonCopy(reason)).toBe(expected);
  });

  it('passes an unknown reason through unchanged', () => {
    expect(sprintReportReasonCopy('NEW_BACKEND_REASON')).toBe('NEW_BACKEND_REASON');
  });

  it('returns null when no reason is provided', () => {
    expect(sprintReportReasonCopy()).toBeNull();
    expect(sprintReportReasonCopy(null)).toBeNull();
  });
});
