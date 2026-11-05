/**
 * types/navigation.ts
 *
 * Shared types for the Nexus application shell.
 *
 * These types describe the data the shell renders. They are intentionally
 * presentation-focused: the backend remains authoritative for the user's
 * workspaces, roles, and permissions. Callers map backend responses into these
 * shapes once the authentication and workspace contracts are confirmed in
 * Phases 3–7.
 */

/**
 * Workspace presentation kind.
 *
 * This mirrors the three documented Nexus workspace types. It is a frontend
 * union, not a confirmed backend enum. Map the backend workspace type into this
 * union in one place rather than checking backend strings in components.
 */
export type WorkspaceKind = 'individual' | 'company' | 'institution';

/** A workspace the current user can switch to. */
export interface WorkspaceSummary {
  /** Stable workspace identifier supplied by the backend. */
  id: string;
  /** Display name. */
  name: string;
  /** Presentation kind used for navigation and labelling. */
  kind: WorkspaceKind;
  /** Optional workspace avatar or logo URL. */
  avatarUrl?: string | null;
  /** Optional backend-supplied label, for example "Company". */
  kindLabel?: string;
  /**
   * The current user's membership role in this workspace, as supplied by the
   * backend. Free-form on purpose: do not invent a role enum here, and never
   * derive permissions from this value on the client.
   */
  role?: string;
}

/** Minimal current-user identity used by the shell. */
export interface CurrentUserSummary {
  /** Stable user identifier supplied by the backend. */
  id: string;
  /** Display name used for the avatar and menu label. */
  name: string;
  /** Optional email shown in the account menu. */
  email?: string;
  /** Optional avatar URL. Falls back to initials. */
  avatarUrl?: string | null;
}

/** A single navigation destination. */
export interface NavItem {
  /** Stable identifier, unique within its section. */
  id: string;
  /** Visible label. Also used as the accessible name when the sidebar collapses. */
  label: string;
  /** Destination path, supplied by the caller from the route constants. */
  href: string;
  /**
   * When true, the item is only active on an exact path match. Use it for
   * overview destinations such as `/app` that would otherwise match every
   * descendant route.
   */
  exact?: boolean;
  /** Optional leading icon. The shell renders it as decoration. */
  icon?: React.ReactNode;
  /**
   * Optional unread/outstanding count shown beside the label.
   * Keep message counts separate from general notification counts: pass the
   * correct source for each item and never combine the two totals.
   */
  badgeCount?: number;
  /** Accessible description of what `badgeCount` represents, e.g. "unread messages". */
  badgeLabel?: string;
  /**
   * When present, the item is only shown for these workspace kinds.
   * Omit to show the item in every workspace kind.
   */
  workspaceKinds?: WorkspaceKind[];
  /**
   * Permission keys required to see this item. The user needs at least one.
   * When an item declares permissions and the caller has not supplied a
   * permission list, the item is hidden. Hiding UI is not authorisation: the
   * backend must still reject unauthorised requests.
   */
  permissions?: string[];
}

/** A labelled group of navigation destinations. */
export interface NavSection {
  /** Stable identifier, unique within the sidebar. */
  id: string;
  /** Optional group label. Omit for an unlabelled group. */
  label?: string;
  /** Destinations in this group. */
  items: NavItem[];
  /**
   * When present, the whole section is only shown for these workspace kinds.
   * Items may narrow this further.
   */
  workspaceKinds?: WorkspaceKind[];
}

/** Context used to decide which navigation entries are visible. */
export interface NavigationContext {
  /** Active workspace kind. */
  workspaceKind: WorkspaceKind;
  /**
   * Permission keys granted by the backend for the active workspace.
   * Pass `undefined` when they are not known yet; permission-gated items are
   * hidden rather than shown optimistically.
   */
  permissions?: string[];
}
