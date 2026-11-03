# Nexus Subscription and Billing Backend Requirements

**Status: Approved product rules and provider-independent calculation helpers are implemented; no billing API or payment integration is operational.**

This document separates implemented backend policy code from persistent billing and payment-provider work. Checkout and subscription management remain unavailable.

## Repository findings

The frontend and backend are separate repositories. The backend at `../__NexusBackend__` uses Express, TypeScript, Prisma, and PostgreSQL. It contains workspace membership, invitation, and email-webhook modules, but no subscription models or migrations, subscription endpoints, payment SDK/configuration, payment webhook, invoice service, or lifecycle persistence. The signed email webhook is not a payment integration.

The `WorkspaceMembership` model has a unique `(workspaceId, userId)` constraint. This prevents duplicate membership rows but alone does not prevent provider-side duplicate charges.

## Approved commercial configuration

| Plan | Monthly base | Annual base | Included members | Extra active member |
|---|---:|---:|---:|---:|
| Pro | $10/month | $50/year | 15 | $0.50/member/month |
| Business | $15/month | $70/year | 25 | $1/member/month |

The workspace owner counts once and consumes an included seat. These prices and allowances are centralized in the frontend `lib/subscription-plans.ts` and backend `src/modules/billing/pricing.ts` catalogs. Checkout remains disabled because the backend has no payment or subscription integration.

## Approved membership billing policy

- Only distinct active workspace members whose account is active count as billable members.
- Pending invitations, suspended members, removed members, and deactivated accounts do not count.
- The workspace owner counts once as an active member and consumes one included seat, if the owner account is active.
- Additional-member charges apply only above the selected plan's included allowance.
- Pro additional members cost $0.50/member/month; Business additional members cost $1/member/month.
- Additional members remain monthly charges when the base subscription is annual.
- A new additional seat takes effect immediately only after verified successful payment and is prorated for the remaining applicable monthly seat period.
- A committed seat reduction takes effect at renewal; there is no automatic credit for an already-paid period.
- Membership changes in one workspace do not affect another workspace. The server derives counts from the requested workspace's database state; frontend counts are not authoritative.
- Billing calculations must not deactivate/remove members, charge pending invitations, or count an owner twice.

The backend currently implements a server-owned integer-cent catalog, a Prisma-backed workspace-scoped active-member lookup/deduplicator, seat-quantity/monthly-charge calculation, and provider-independent lifecycle/proration policy helpers in `src/modules/billing/`. Unit tests cover these calculations. These helpers are not called by API routes and do not enforce membership mutations or persist subscription state.

## Approved lifecycle policy

- **Upgrade:** Pro to Business takes effect immediately after provider-confirmed successful payment. Calculate the prorated old/new plan difference for the remaining current billing period. Until confirmation, preserve the old plan and entitlements.
- **Downgrade:** Schedule Business to Pro at renewal. Keep the old plan active through the paid period. Report target allowance conflicts; do not remove members, workspaces, projects, or files.
- **Increase seats:** Apply immediately only after provider-confirmed successful payment, prorated for the remaining monthly seat period. Seat charges stay monthly with an annual base plan.
- **Reduce seats:** Apply the lower committed quantity at renewal, recount active membership from the database, and issue no automatic credit. Never remove/deactivate users to fit a quantity.
- **Cancellation:** Schedule cancellation at the end of the current paid period, retain benefits until that effective date, persist the request/date, and make repeat operations idempotent.
- **Refunds:** No automatic refunds. A request is handled manually under the approved refund policy and applicable law. Cancellation and refund requests remain separate.
- **Authorization:** Only the workspace owner may perform billing changes. Server authorization must not rely on client roles or IDs.

The current policy module computes charge/timing intent only. It cannot activate a subscription, persist scheduled changes, verify a payment, or make an operation idempotent in durable storage. The catalog and calculation code must not be mistaken for a live billing system.

## Required backend API and persistent implementation

After a payment provider is selected, establish and implement an API contract and subscription data model for:

1. Reading the server-owned plan catalog and subscription status, period dates, included allowance, authoritative active-member count, committed additional-seat quantity, cancellation status, and next renewal.
2. Creating checkout/payment operations from server-calculated prices and quantities; the browser cannot submit authoritative prices, seat counts, subscription status, or payment outcomes.
3. Previewing and applying owner-authorized upgrades, downgrades, seat increases/reductions, and cancellation with provider timing/proration.
4. Recording provider subscription/customer identifiers, plan/pricing version, billing cadence, state, current period, committed seat quantity, scheduled changes, and effective cancellation date.
5. Receiving authenticated provider events with signature verification, replay protection, durable unique event IDs, idempotent processing, and transactional entitlement updates.
6. Exposing billing history, payment methods, invoices, and receipts only where supported by the approved provider contract.
7. Enforcing membership seat obligations transactionally against authoritative database state before membership activation can create a charge or exceed a paid quantity.

All billing mutations must be owner-authorized and audited. A client redirect or success message is never proof of payment. Do not store raw card data or expose provider credentials. Provider event processing and membership/subscription state changes require database transactions and duplicate-event protection.

## Explicitly deferred failed-payment requirements

The business has deferred failed-payment policy. Retry behavior/count, grace period, notifications, repeated-failure subscription status, continued paid access, and treatment of additional-seat charges remain undecided. Do not implement speculative retries, timelines, notices, or access restrictions. Existing failure handling must never grant paid access without verified payment or destroy customer data because payment failed.

## Provider-dependent blockers

- Payment provider selection, supported currencies, tax handling, invoice requirements, production credentials and webhook configuration.
- Provider API contract, secure payment confirmation, signatures/replay protection, durable idempotency, and provider-backed proration behavior.
- Subscription schema/migration, routes, subscription lifecycle persistence, entitlement integration, billing authorization, and transactional membership enforcement.
- Live provider and backend verification, including duplicate webhook behavior and payment-success/failure paths.
- Legal approval of the Terms and Privacy drafts and applicable refund/cancellation wording.

## Frontend behavior

The pricing page shows the approved base prices, included-member allowances, owner inclusion, and additional-member monthly rates. It explains that only active members beyond the allowance are billable. Checkout, plan changes, cancellation, payment methods, invoices, and paid entitlement changes remain unavailable. Do not calculate authoritative totals in the browser.
