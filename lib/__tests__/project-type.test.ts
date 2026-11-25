import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROJECT_TYPE,
  DEFAULT_PROJECT_TAB_ORDER,
  normaliseProjectType,
  orderTabsForType,
  PROJECT_TYPE_STARTERS,
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

describe('PROJECT_TYPE_STARTERS', () => {
  it('defaults Engineering to sprints and every other type to backlog only', () => {
    expect(PROJECT_TYPE_STARTERS.ENGINEERING.workflowMode).toBe('SPRINTS');
    for (const type of PROJECT_TYPES.filter((entry) => entry !== 'ENGINEERING')) {
      expect(PROJECT_TYPE_STARTERS[type].workflowMode).toBe('BACKLOG_ONLY');
    }
  });

  it('leaves General without suggestions and marks every template ASSIGNED', () => {
    expect(PROJECT_TYPE_STARTERS.GENERAL.taskTemplates).toEqual([]);
    expect(PROJECT_TYPE_STARTERS.GENERAL.checklist).toBeNull();
    for (const type of PROJECT_TYPES.filter((entry) => entry !== 'GENERAL')) {
      expect(PROJECT_TYPE_STARTERS[type].taskTemplates).toHaveLength(2);
      expect(PROJECT_TYPE_STARTERS[type].checklist).not.toBeNull();
      for (const template of PROJECT_TYPE_STARTERS[type].taskTemplates) {
        expect(template.status).toBe('ASSIGNED');
      }
    }
  });
});

describe('orderTabsForType', () => {
  const allTabs = DEFAULT_PROJECT_TAB_ORDER.map((key) => ({ key }));
  const keys = (tabs: readonly { key: string }[]) => tabs.map((tab) => tab.key);

  it.each([
    ['GENERAL', [
      'overview', 'tasks', 'sprints', 'members', 'checklists', 'reviews',
      'milestones', 'code', 'dev-activity', 'dev-activity-developers',
      'activity', 'reports', 'settings',
    ]],
    ['ENGINEERING', [
      'overview', 'tasks', 'sprints', 'code', 'dev-activity', 'dev-activity-developers',
      'reviews', 'checklists', 'milestones', 'members', 'activity', 'reports', 'settings',
    ]],
    ['DESIGN', [
      'overview', 'tasks', 'reviews', 'checklists', 'sprints', 'milestones',
      'code', 'dev-activity', 'dev-activity-developers', 'members', 'activity',
      'reports', 'settings',
    ]],
    ['OPERATIONS', [
      'overview', 'tasks', 'checklists', 'milestones', 'members', 'activity',
      'code', 'dev-activity', 'dev-activity-developers', 'reviews', 'reports',
      'settings', 'sprints',
    ]],
    ['MARKETING', [
      'overview', 'tasks', 'milestones', 'checklists', 'reviews', 'members',
      'activity', 'code', 'dev-activity', 'dev-activity-developers', 'reports',
      'settings', 'sprints',
    ]],
    ['HR', [
      'overview', 'tasks', 'checklists', 'members', 'reviews', 'milestones',
      'activity', 'code', 'dev-activity', 'dev-activity-developers', 'reports',
      'settings', 'sprints',
    ]],
  ] as const)('orders every tab for %s', (type, expected) => {
    expect(keys(orderTabsForType(allTabs, type))).toEqual(expected);
  });

  it.each(PROJECT_TYPES)('never removes a tab for %s', (type) => {
    const ordered = orderTabsForType(allTabs, type);
    expect(ordered).toHaveLength(allTabs.length);
    expect([...keys(ordered)].sort()).toEqual([...keys(allTabs)].sort());
  });

  it.each(PROJECT_TYPES)(
    'places dev-activity-developers after dev-activity after code for %s',
    (type) => {
      const input = [...allTabs].reverse();
      const ordered = keys(orderTabsForType(input, type));
      expect(ordered[ordered.indexOf('code') + 1]).toBe('dev-activity');
      expect(ordered[ordered.indexOf('dev-activity') + 1]).toBe('dev-activity-developers');
      expect([...ordered].sort()).toEqual([...keys(input)].sort());
    },
  );

  it('keeps dev-activity in today\'s order for GENERAL', () => {
    expect(keys(orderTabsForType(allTabs, 'GENERAL'))).toEqual(DEFAULT_PROJECT_TAB_ORDER);
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
