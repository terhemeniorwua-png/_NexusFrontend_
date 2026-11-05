import { describe, expect, it } from 'vitest';
import { buildAppNavigation } from './app-navigation';
import type { Workspace } from '@/services/workspaces';

function workspace(type: Workspace['type']): Workspace {
  return {
    id: `workspace-${type.toLowerCase()}`, name: 'Test workspace', slug: 'test-workspace',
    description: null, type, isPersonal: type === 'INDIVIDUAL', visibility: 'PRIVATE',
    status: 'ACTIVE', ownerId: 'user-1', role: 'OWNER', organizationRole: null,
    joinCodeEnabled: false, memberCount: 1, projectCount: 0, teamCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function hrefs(type: Workspace['type']): string[] {
  return buildAppNavigation(workspace(type)).flatMap((section) => section.items.map((item) => item.href));
}

describe('workspace-aware organization navigation', () => {
  it('shows teams in company workspaces but not institution-only groups', () => {
    expect(hrefs('COMPANY')).toContain('/app/teams');
    expect(hrefs('COMPANY')).not.toContain('/app/groups');
    expect(hrefs('COMPANY')).toContain('/app/members');
  });

  it('shows teams and institution groups only for institution workspaces', () => {
    expect(hrefs('INSTITUTION')).toContain('/app/teams');
    expect(hrefs('INSTITUTION')).toContain('/app/groups');
    expect(hrefs('INDIVIDUAL')).not.toContain('/app/teams');
    expect(hrefs('INDIVIDUAL')).not.toContain('/app/groups');
  });

  it('shows the projects entry for all workspace types', () => {
    expect(hrefs('COMPANY')).toContain('/app/projects');
    expect(hrefs('INSTITUTION')).toContain('/app/projects');
    expect(hrefs('INDIVIDUAL')).toContain('/app/projects');
  });
});
