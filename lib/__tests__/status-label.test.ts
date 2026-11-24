import { describe, expect, it } from 'vitest';
import { formatTaskStatusLabel } from '../status-label';

describe('formatTaskStatusLabel', () => {
  it('maps every known task status to its exact display text', () => {
    expect(formatTaskStatusLabel('ASSIGNED')).toBe('Assigned');
    expect(formatTaskStatusLabel('AWAITING_CLARIFICATION')).toBe('Awaiting clarification');
    expect(formatTaskStatusLabel('IN_PROGRESS')).toBe('In progress');
    expect(formatTaskStatusLabel('SUBMITTED')).toBe('Submitted');
    expect(formatTaskStatusLabel('UNDER_REVIEW')).toBe('Under review');
    expect(formatTaskStatusLabel('APPROVED')).toBe('Approved');
    expect(formatTaskStatusLabel('CHANGES_REQUESTED')).toBe('Changes requested');
  });

  it('spaces, lowercases and capitalises unknown values', () => {
    expect(formatTaskStatusLabel('SOME_NEW_STATUS')).toBe('Some new status');
    expect(formatTaskStatusLabel('already_MIXED_case')).toBe('Already mixed case');
    expect(formatTaskStatusLabel('SOME_NEW_STATUS')).not.toContain('_');
  });

  it('never renders a raw or empty value', () => {
    expect(formatTaskStatusLabel('')).toBe('Unknown');
    expect(formatTaskStatusLabel('   ')).toBe('Unknown');
    expect(formatTaskStatusLabel(null)).toBe('Unknown');
    expect(formatTaskStatusLabel(undefined)).toBe('Unknown');
  });
});
