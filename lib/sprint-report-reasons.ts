/** Backend reason codes that have an explicit product-friendly explanation. */
const SPRINT_REPORT_REASON_COPY: Record<string, string> = {
  SPRINT_CREATED_BEFORE_AUDIT_TRAIL_EPOCH:
    'This sprint was created before scope history was recorded.',
  COMPLETED_SPRINT_MISSING_COMPLETION_AUDIT:
    'This sprint was completed without recorded scope history.',
  COMPLETED_SPRINT_MISSING_COMPLETION_TASK_IDS:
    'This sprint was completed without recorded scope history.',
  CARRY_IN_COMPLETION_MISSING_TASK_IDS:
    'Tasks carried in from an earlier sprint have no recorded history.',
};

/** Map known backend reason codes to copy; pass unknown codes through verbatim. */
export function sprintReportReasonCopy(reason?: string | null): string | null {
  if (!reason) return null;
  return SPRINT_REPORT_REASON_COPY[reason] ?? reason;
}
