import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROJECT_TYPE,
  normaliseProjectType,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  projectTypeLabel,
} from '@/lib/project-type';

describe('project type contract', () => {
  it('exposes the six backend project types', () => {
    expect(PROJECT_TYPES).toEqual([
      'GENERAL', 'ENGINEERING', 'DESIGN', 'OPERATIONS', 'MARKETING', 'HR',
    ]);
    expect(DEFAULT_PROJECT_TYPE).toBe('GENERAL');
  });

  it.each(PROJECT_TYPES)('keeps %s and its label', (type) => {
    expect(normaliseProjectType(type)).toBe(type);
    expect(projectTypeLabel(type)).toBe(PROJECT_TYPE_LABELS[type]);
  });

  it('falls back to GENERAL for a missing type', () => {
    expect(normaliseProjectType(undefined)).toBe('GENERAL');
    expect(projectTypeLabel(undefined)).toBe('General');
  });

  it('falls back to GENERAL for an unknown type from an older backend', () => {
    expect(normaliseProjectType('LEGACY_TYPE')).toBe('GENERAL');
    expect(normaliseProjectType(null)).toBe('GENERAL');
    expect(normaliseProjectType(42)).toBe('GENERAL');
    expect(projectTypeLabel('LEGACY_TYPE')).toBe('General');
  });
});
