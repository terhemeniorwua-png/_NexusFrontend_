import { describe, it, expect } from 'vitest';
import {
  filterNavSections,
  findActiveSectionId,
  isNavItemVisible,
  isPathActive,
} from '../navigation';
import type { NavSection } from '@/types/navigation';

const sections: NavSection[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { id: 'home', label: 'Home', href: '/' },
      { id: 'projects', label: 'Projects', href: '/projects' },
      {
        id: 'billing',
        label: 'Billing',
        href: '/billing',
        permissions: ['billing:read'],
        workspaceKinds: ['company', 'institution'],
      },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    workspaceKinds: ['individual'],
    items: [{ id: 'my-tasks', label: 'My Tasks', href: '/my-tasks' }],
  },
  {
    id: 'empty',
    label: 'Empty',
    items: [
      {
        id: 'admin',
        label: 'Admin',
        href: '/admin',
        permissions: ['admin:access'],
      },
    ],
  },
];

describe('isPathActive', () => {
  it('matches an exact path', () => {
    expect(isPathActive('/projects', '/projects')).toBe(true);
  });

  it('matches descendant paths on a segment boundary', () => {
    expect(isPathActive('/projects', '/projects/42')).toBe(true);
    expect(isPathActive('/projects/', '/projects/42')).toBe(true);
  });

  it('does not match a partial segment', () => {
    expect(isPathActive('/project', '/projects')).toBe(false);
  });

  it('only matches the root exactly', () => {
    expect(isPathActive('/', '/')).toBe(true);
    expect(isPathActive('/', '/projects')).toBe(false);
  });

  it('returns false for an empty href', () => {
    expect(isPathActive('', '/projects')).toBe(false);
  });
});

describe('isNavItemVisible', () => {
  it('shows items without restrictions', () => {
    expect(
      isNavItemVisible(
        { id: 'home', label: 'Home', href: '/' },
        { workspaceKind: 'company' },
      ),
    ).toBe(true);
  });

  it('scopes items to the active workspace kind', () => {
    const item = {
      id: 'billing',
      label: 'Billing',
      href: '/billing',
      workspaceKinds: ['company' as const],
    };

    expect(
      isNavItemVisible(item, {
        workspaceKind: 'company',
        permissions: ['billing:read'],
      }),
    ).toBe(true);
    expect(
      isNavItemVisible(item, {
        workspaceKind: 'individual',
        permissions: ['billing:read'],
      }),
    ).toBe(false);
  });

  it('shows permission-gated items when at least one permission is granted', () => {
    const item = {
      id: 'billing',
      label: 'Billing',
      href: '/billing',
      permissions: ['billing:read', 'billing:manage'],
    };

    expect(
      isNavItemVisible(item, {
        workspaceKind: 'company',
        permissions: ['billing:manage'],
      }),
    ).toBe(true);
  });

  it('hides permission-gated items when permissions are unknown', () => {
    const item = {
      id: 'billing',
      label: 'Billing',
      href: '/billing',
      permissions: ['billing:read'],
    };

    expect(
      isNavItemVisible(item, { workspaceKind: 'company' }),
    ).toBe(false);
  });
});

describe('filterNavSections', () => {
  it('filters by workspace kind and permission and drops empty groups', () => {
    const result = filterNavSections(sections, {
      workspaceKind: 'company',
      permissions: ['billing:read'],
    });

    expect(result.map((section) => section.id)).toEqual(['workspace']);
    expect(result[0].items.map((item) => item.id)).toEqual([
      'home',
      'projects',
      'billing',
    ]);
  });

  it('keeps individual-only groups for an individual workspace', () => {
    const result = filterNavSections(sections, {
      workspaceKind: 'individual',
      permissions: ['admin:access'],
    });

    expect(result.map((section) => section.id)).toEqual([
      'workspace',
      'personal',
      'empty',
    ]);
    expect(result[0].items.map((item) => item.id)).toEqual([
      'home',
      'projects',
    ]);
  });

  it('does not mutate the input sections', () => {
    const before = JSON.stringify(sections);
    filterNavSections(sections, {
      workspaceKind: 'company',
      permissions: [],
    });
    expect(JSON.stringify(sections)).toBe(before);
  });
});

describe('findActiveSectionId', () => {
  it('returns the section containing the active path', () => {
    expect(findActiveSectionId(sections, '/projects/42')).toBe('workspace');
  });

  it('returns undefined when no item matches', () => {
    expect(findActiveSectionId(sections, '/unknown')).toBeUndefined();
  });
});
