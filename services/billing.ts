import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';
import type { BillingPeriod } from '@/lib/subscription-plans';

export type BillingPlanId = 'PRO' | 'BUSINESS';
export type BillingInterval = 'MONTHLY' | 'ANNUAL';
export interface BillingTarget { plan: BillingPlanId; interval: BillingInterval; billableSeats: number }

export interface BillingSummary {
  subscription: null | {
    id: string;
    plan: BillingPlanId;
    interval: BillingInterval;
    currency: 'USD';
    status: 'PENDING' | 'ACTIVE' | 'NON_RENEWING' | 'CANCELLED' | 'ATTENTION';
    billableSeats: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    pendingChange: null | { plan: BillingPlanId | null; interval: BillingInterval | null; billableSeats: number | null; effectiveAt: string };
  };
  activeBillableSeats: number;
  includedSeats: number;
  additionalSeats: number;
  nextRenewalAt: string | null;
}

export interface BillingPayment {
  providerReference: string;
  amountSubunit: number;
  currency: string;
  status: string;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

async function billingRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...init, authenticated: true });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...init, authenticated: true });
  }
}

const workspacePath = (workspaceId: string) => `/billing/workspaces/${encodeURIComponent(workspaceId)}`;

export function getBillingSummary(workspaceId: string): Promise<BillingSummary> {
  return billingRequest<BillingSummary>(workspacePath(workspaceId));
}

export function getBillingHistory(workspaceId: string): Promise<BillingPayment[]> {
  return billingRequest<BillingPayment[]>(`${workspacePath(workspaceId)}/payments`);
}

export function startBillingCheckout(workspaceId: string, target: BillingTarget): Promise<{ authorizationUrl: string; reference: string; amountSubunit: number; currency: string }> {
  return billingRequest(`${workspacePath(workspaceId)}/checkout`, { method: 'POST', body: JSON.stringify(target) });
}

export function verifyBillingCheckout(workspaceId: string, reference: string): Promise<BillingSummary> {
  return billingRequest(`${workspacePath(workspaceId)}/verify`, { method: 'POST', body: JSON.stringify({ reference }) });
}

export function scheduleBillingChange(workspaceId: string, target: BillingTarget): Promise<unknown> {
  return billingRequest(`${workspacePath(workspaceId)}/change`, { method: 'POST', body: JSON.stringify(target) });
}

export function cancelBilling(workspaceId: string): Promise<{ cancelAtPeriodEnd: boolean; effectiveAt: string | null }> {
  return billingRequest(`${workspacePath(workspaceId)}/cancel`, { method: 'POST' });
}

export function apiInterval(period: BillingPeriod): BillingInterval {
  return period === 'monthly' ? 'MONTHLY' : 'ANNUAL';
}
