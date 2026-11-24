import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROJECT_TYPE,
  DEFAULT_PROJECT_TAB_ORDER,
  normaliseProjectType,
  orderTabsForType,
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

describe('orderTabsForType', () => {
  const allTabs = DEFAULT_PROJECT_TAB_ORDER.map((key) => ({ key }));
  const keys = (tabs: readonly { key: string }[]) => tabs.map((tab) => tab.key);

  it.each([
    ['GENERAL', [
      'overview', 'tasks', 'sprints', 'members', 'checklists', 'reviews',
      'milestones', 'code', 'activity', 'reports', 'settings',
    ]],
    ['ENGINEERING', [
      'overview', 'tasks', 'sprints', 'code', 'reviews', 'checklists',
      'milestones', 'members', 'activity', 'reports', 'settings',
    ]],
    ['DESIGN', [
      'overview', 'tasks', 'reviews', 'checklists', 'sprints', 'milestones',
      'code', 'members', 'activity', 'reports', 'settings',
    ]],
    ['OPERATIONS', [
      'overview', 'tasks', 'checklists', 'milestones', 'members', 'activity',
      'code', 'reviews', 'reports', 'settings', 'sprints',
    ]],
    ['MARKETING', [
      'overview', 'tasks', 'milestones', 'checklists', 'reviews', 'members',
      'activity', 'code', 'reports', 'settings', 'sprints',
    ]],
    ['HR', [
      'overview', 'tasks', 'checklists', 'members', 'reviews', 'milestones',
      'activity', 'code', 'reports', 'settings', 'sprints',
    ]],
  ] as const)('orders every tab for %s', (type, expected) => {
    expect(keys(orderTabsForType(allTabs, type))).toEqual(expected);
  });

  it.each(PROJECT_TYPES)('never removes a tab for %s', (type) => {
    const ordered = orderTabsForType(allTabs, type);
    expect(ordered).toHaveLength(allTabs.length);
    expect([...keys(ordered)].sort()).toEqual([...keys(allTabs)].sort());
  });

  it('falls back to today\'s order for missing or unknown types', () => {
    expect(keys(orderTabsForType(allTabs, undefined))).toEqual(DEFAULT_PROJECT_TAB_ORDER);
    expect(keys(orderTabsForType(allTabs, 'LEGACY_TYPE'))).toEqual(DEFAULT_PROJECT_TAB_ORDER);
    expect(keys(orderTabsForType(allTabs, null))).toEqual(DEFAULT_PROJECT_TAB_ORDER);
  });

  it('keeps tabs not listed by a type after the listed ones in their original order', () => {
    const tabs = [
      { key: 'activity' },
      { key: 'sprints' },
      { key: 'code' },
      { key: 'overview' },
      { key: 'tasks' },
    ];
    // OPERATIONS does not list sprints, so it stays behind the listed tabs.
    expect(keys(orderTabsForType(tabs, 'OPERATIONS'))).toEqual([
      'overview', 'tasks', 'activity', 'code', 'sprints',
    ]);
  });
});
