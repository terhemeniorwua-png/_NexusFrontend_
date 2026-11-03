/**
 * lib/navigation.ts
 *
 * Pure helpers for the application shell navigation.
 *
 * These functions only decide what to render. They are not a security
 * boundary: the backend remains authoritative for access to every resource.
 */

import type {
  NavItem,
  NavSection,
  NavigationContext,
  WorkspaceKind,
} from '@/types/navigation';

/**
 * Whether a navigation item should be highlighted for the current path.
 *
 * Exact matches always win. A parent path also matches its descendants, so
 * `/projects` is active for `/projects/42`, but `/project` is not active for
 * `/projects`.
 */
export function isPathActive(href: string, activePath: string): boolean {
  if (!href) return false;
  if (href === activePath) return true;
  if (href === '/') return false;

  const base = href.endsWith('/') ? href.slice(0, -1) : href;
  return activePath === base || activePath.startsWith(`${base}/`);
}

function matchesWorkspaceKind(
  kinds: WorkspaceKind[] | undefined,
  workspaceKind: WorkspaceKind,
): boolean {
  if (!kinds || kinds.length === 0) return true;
  return kinds.includes(workspaceKind);
}

function hasPermission(
  required: string[] | undefined,
  granted: string[] | undefined,
): boolean {
  if (!required || required.length === 0) return true;
  // Unknown permissions are treated as "not granted" so restricted navigation
  // is never shown optimistically while the real permissions load.
  if (!granted || granted.length === 0) return false;
  return required.some((permission) => granted.includes(permission));
}

/** Whether a single navigation item is visible in the supplied context. */
export function isNavItemVisible(
  item: NavItem,
  context: NavigationContext,
): boolean {
  return (
    matchesWorkspaceKind(item.workspaceKinds, context.workspaceKind) &&
    hasPermission(item.permissions, context.permissions)
  );
}

/**
 * Filter navigation sections for the active workspace and permission set.
 *
 * Sections that are out of scope, or that have no visible items after
 * filtering, are removed so the sidebar never renders an empty group.
 */
export function filterNavSections(
  sections: NavSection[],
  context: NavigationContext,
): NavSection[] {
  return sections
    .filter((section) =>
      matchesWorkspaceKind(section.workspaceKinds, context.workspaceKind),
    )
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isNavItemVisible(item, context)),
    }))
    .filter((section) => section.items.length > 0);
}

/** Find the section that contains the active path, if any. */
export function findActiveSectionId(
  sections: NavSection[],
  activePath: string,
): string | undefined {
  return sections.find((section) =>
    section.items.some((item) => isPathActive(item.href, activePath)),
  )?.id;
}
