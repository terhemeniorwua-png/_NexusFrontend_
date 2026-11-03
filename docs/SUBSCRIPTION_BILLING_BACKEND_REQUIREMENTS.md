# Nexus Subscription and Billing Backend Requirements

**Status: Requirements only — no billing API or payment integration is currently implemented.**

This note records approved billing policies and the backend work needed before frontend checkout or subscription management can be enabled. It does not define route names, provider configuration, or a working API contract.

## Repository findings

The adjacent backend OpenAPI contract and modules contain authentication, users, workspaces, memberships, invitations, join requests, and email webhooks. They do not contain subscription, payment, checkout, invoice, or billing operations. No payment-provider SDK or billing configuration was found. The email provider webhook is for transactional email and is not a payment integration.

The backend already has a `WorkspaceMembership` uniqueness constraint on `(workspaceId, userId)`. This helps prevent duplicate membership rows but does not implement billable-seat calculations, subscription state, payment verification, or provider-side seat synchronization.

## Approved commercial configuration

| Plan | Monthly base | Annual base | Additional member |
|---|---:|---:|---:|
| Pro | $10/month | $50/year | $0.50 per member per month |
| Business | $15/month | $70/year | $1.00 per member per month |

The number of included members in either plan is **pending approval**. Until it is decided, do not calculate or advertise a total price that depends on the allowance.

## Approved seat policy

- An additional seat is an additional billable member beyond the selected plan's included allowance.
- Only an accepted, active workspace member is eligible for an additional-member charge. Pending invitations are not billable.
- Pro additional members cost $0.50/member/month; Business additional members cost $1.00/member/month.
- Additional-member charges recur monthly even when the base subscription is annual.
- Do not count the workspace owner twice if the owner also has a membership row.
- Do not create duplicate billing for the same member and workspace.
- Removing an additional member stops future recurring charges under the provider's supported billing-cycle and proration rules. Do not promise an unapproved credit or proration amount.
- The backend calculates and enforces billable seats. Client-submitted member counts are display hints only and must never set the charge.

Before implementation, product must confirm which membership statuses and roles are billable (including guests and suspended memberships), the included-seat allowances, and any provider-specific behavior needed to honor removal timing.

## Required contract operations

The backend team should define actual route names, schemas, authorization, errors, and idempotency behavior for these operation categories. These are requirements, not proposed or implemented endpoints:

1. Read the server-owned plan catalog, current subscription state, included-seat allowance, current active billable-member count, additional-member rate, billing period, and next billing dates.
2. Start checkout using a server-calculated amount and a server-created provider checkout session. The browser must not supply an authoritative price, allowance, member count, or payment result.
3. Preview and apply plan changes and additional-seat quantity changes, returning provider-calculated timing and proration details before the user confirms.
4. Request cancellation and read its confirmed effective date and status.
5. Read payment status, failed-payment actions, invoices/receipts, and provider customer/payment-method references as supported by the selected provider.
6. Receive provider payment/subscription webhooks through a server endpoint with provider signature verification and replay protection.

All reads and mutations must use the existing authentication and workspace authorization architecture. Only the authorized billing owner may perform billing mutations. Every response that changes displayed entitlements must report the backend's authoritative state.

## Required server-side data and safeguards

- A workspace-to-subscription association; plan and pricing version; monthly/annual base cadence; subscription/payment state; current period; cancellation state; and provider customer/subscription references.
- The approved included-seat count and billable-member policy once supplied. Until then, checkout must remain disabled.
- A backend-derived set/count of unique billable `(workspaceId, userId)` memberships. Count an owner once; exclude pending invitations; prevent duplicate member charges; reconcile membership changes with provider quantities.
- Securely stored provider identifiers and billing records. Never store or log raw card data or provider secrets in the frontend.
- A durable provider-event record with a unique provider event identifier, verified signature result, processing outcome, and idempotent handling. Replayed events must not duplicate charges, entitlements, or state transitions.
- Subscription activation only after an authentic server-verified successful-payment event. A redirect or client-provided success status is not evidence of payment.
- Audit records for billing-owner actions and relevant subscription state changes without exposing secrets or payment credentials.

## Business decisions still required

- Included-seat allowances for Pro and Business.
- Whether guests, suspended members, or other membership roles are billable.
- Upgrade/downgrade effective dates and proration behavior.
- Seat reduction/removal timing and any provider-supported proration or credit behavior.
- Cancellation effective date and any refund policy.
- Failed-payment retry schedule, notices, grace period, and access restrictions.
- Expired-subscription behavior and when paid features are restricted.
- Payment provider, supported currencies, tax handling, invoice requirements, and production webhook configuration.

Do not invent refund periods, proration amounts, grace-period lengths, cancellation dates, provider settings, or access restrictions. Obtain product/legal approval and the provider contract first.

## Frontend dependency

The frontend may show the approved base and additional-member rates as informational pricing. Checkout, plan changes, cancellation, payment methods, invoices, and subscription entitlements remain unavailable until the backend publishes and implements this contract. Frontend seat totals are never authoritative.
