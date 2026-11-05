/**
 * lib/app-navigation.ts
 *
 * Navigation for the authenticated application shell.
 *
 * Items are declarative so the existing shell can filter them by workspace
 * kind and backend-supplied permission keys. Filtering improves the interface;
 * the backend still authorises every request.
 */

import type { NavSection, WorkspaceKind } from '@/types/navigation';
import type { Workspace } from '@/services/workspaces';

export function workspaceKindFor(workspace: Workspace | null): WorkspaceKind {
  if (workspace?.type === 'COMPANY') return 'company';
  if (workspace?.type === 'INSTITUTION') return 'institution';
  return 'individual';
}

/** Builds the shell navigation for the active workspace. */
export function buildAppNavigation(workspace: Workspace | null): NavSection[] {
  const sections: NavSection[] = [
    {
      id: 'workspace',
      label: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview', href: '/app', exact: true },
        { id: 'workspaces', label: 'Workspaces', href: '/app/workspaces' },
        { id: 'discover', label: 'Discover', href: '/app/discover' },
      ],
    },
    {
      id: 'people',
      label: 'People and access',
      items: [
        {
          id: 'members',
          label: 'Members',
          href: '/app/members',
          permissions: ['member:view'],
        },
        { id: 'teams', label: 'Teams and structure', href: '/app/teams', workspaceKinds: ['company', 'institution'] },
        { id: 'groups', label: 'Institution groups', href: '/app/groups', workspaceKinds: ['institution'] },
      ],
    },
    {
      id: 'account',
      label: 'Account',
      items: [
        { id: 'invitations', label: 'Invitations', href: '/app/invitations' },
        { id: 'billing', label: 'Billing', href: '/app/billing' },
        { id: 'profile', label: 'Profile', href: '/app/profile' },
        { id: 'privacy-requests', label: 'Privacy requests', href: '/app/privacy-requests' },
      ],
    },
  ];

  // An authenticated user without a workspace can still create one and browse
  // public organisations; the switch and member views have no target yet.
  if (!workspace) {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.id !== 'members'),
      }))
      .filter((section) => section.items.length > 0);
  }

  const workspaceKind = workspaceKindFor(workspace);
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.workspaceKinds || item.workspaceKinds.includes(workspaceKind),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
