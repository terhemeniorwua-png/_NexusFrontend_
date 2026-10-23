/**
 * types/ui.ts
 *
 * Shared TypeScript types for Nexus UI component props.
 * Import from here when building components in components/ui/.
 */

// ─── Variant types ───────────────────────────────────────────────────────────

/** Button / badge color roles */
export type ColorRole =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info';

/** Button variants */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

/** Alert / badge variants */
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

// ─── Size types ───────────────────────────────────────────────────────────────

/** Common size scale */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Button / input sizes */
export type ComponentSize = 'sm' | 'md' | 'lg';

/** Avatar sizes */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

// ─── Task status types ────────────────────────────────────────────────────────

/**
 * Nexus task workflow statuses.
 * ASSIGNED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED
 * CHANGES_REQUESTED → IN_PROGRESS
 *
 * Note: valid status transitions are enforced by the backend.
 * The frontend must not allow arbitrary transitions.
 */
export type TaskStatus =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'CHANGES_REQUESTED';

/** Task priority levels */
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// ─── Role types ───────────────────────────────────────────────────────────────

/**
 * Nexus workspace/project roles.
 * Exact string values must match the backend's role enum.
 * Confirm with backend before using in permission logic.
 */
export type UserRole = 'OWNER' | 'PM' | 'MEMBER' | 'VIEWER' | 'COLLABORATOR';

// ─── Common component prop types ─────────────────────────────────────────────

/** Props shared by most interactive components */
export interface BaseProps {
  className?: string;
  id?: string;
}

/** Props for components that can be disabled */
export interface DisableableProps extends BaseProps {
  disabled?: boolean;
}

/** Props for labeled form controls */
export interface LabeledProps extends BaseProps {
  /** Visible label text — required for accessibility */
  label: string;
  /** id of the control; label htmlFor is set to this */
  id: string;
  /** Helper text shown below the control */
  helperText?: string;
  /** Error message; also sets aria-invalid on the control */
  errorMessage?: string;
  /** Whether this field is required */
  required?: boolean;
}

/** Child render slot */
export interface WithChildren {
  children: React.ReactNode;
}

/** Optional children */
export interface WithOptionalChildren {
  children?: React.ReactNode;
}
