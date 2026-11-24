/**
 * Maps task status enum values to sentence-case display text.
 * Never returns the raw enum or an empty string.
 */
export function formatTaskStatusLabel(value: string | null | undefined): string {
  const normalized = value?.trim();
  if (!normalized) return 'Unknown';

  switch (normalized) {
    case 'ASSIGNED':
      return 'Assigned';
    case 'AWAITING_CLARIFICATION':
      return 'Awaiting clarification';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'SUBMITTED':
      return 'Submitted';
    case 'UNDER_REVIEW':
      return 'Under review';
    case 'APPROVED':
      return 'Approved';
    case 'CHANGES_REQUESTED':
      return 'Changes requested';
    default: {
      const spaced = normalized.replaceAll('_', ' ').toLowerCase();
      return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    }
  }
}
