export type PlanSetupStatus = 'approved-not-connected' | 'pending-approval';

export interface WorkspacePlanOverview {
  id: 'individual' | 'company' | 'institution';
  title: string;
  audience: string;
  summary: string;
}

/**
 * Public plan copy only. Prices and member allowances stay absent until they
 * are approved; subscription mutations must be connected to backend APIs.
 */
export const subscriptionPlanOverview: WorkspacePlanOverview[] = [
  {
    id: 'individual',
    title: 'Individual',
    audience: 'Personal workspace',
    summary: 'The approved product model includes a free personal workspace. Workspace setup is not available from this page.',
  },
  {
    id: 'company',
    title: 'Company',
    audience: 'Teams and organisations',
    summary: 'The approved product model allows companies to start free. Paid prices and included or additional seat allowances are pending approval.',
  },
  {
    id: 'institution',
    title: 'Institution',
    audience: 'Schools and institutions',
    summary: 'Institution plans are separate from company plans. Free and paid plan setup is not connected in the current application.',
  },
];

export const paidSubscriptionAvailability = {
  status: 'pending-approval' as const satisfies PlanSetupStatus,
  checkoutAvailable: false,
  pricing: null,
  seatAllowances: null,
  trialEnrollmentAvailable: false,
  notice: 'Paid plans and trial enrollment are not available yet. Prices, seat allowances, and backend subscription setup are pending.',
};
