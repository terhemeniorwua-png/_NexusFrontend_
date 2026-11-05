# Nexus Subscription and Billing Backend Requirements

**Status: Billing API, Paystack adapter, and transactional paid-seat capacity checks are implemented in the current backend worktree; merchant USD capability, migration application, and provider test verification remain unresolved.**

This document records the implemented backend billing path and the provider and product gates that remain. Checkout stays disabled until the configured Paystack account confirms USD is enabled.

## Repository findings

The frontend and backend are separate repositories. The backend at `../__NexusBackend__` uses Express, TypeScript, Prisma, and PostgreSQL. The current backend worktree contains subscription models, a migration, owner-authorized billing routes, Paystack client, signed webhook route, checkout verification, and lifecycle persistence. These files are uncommitted existing work and require build/test/database validation before deployment.

The `WorkspaceMembership` model has a unique `(workspaceId, userId)` constraint. This prevents duplicate membership rows but alone does not prevent provider-side duplicate charges.

## Approved commercial configuration

| Plan | Monthly base | Annual base | Included members | Extra active member |
|---|---:|---:|---:|---:|
| Pro | $10/month | $50/year | 15 | $0.50/member per selected billing period |
| Business | $15/month | $70/year | 25 | $1/member per selected billing period |

The workspace owner counts once and consumes an included seat. These prices and allowances are centralized in the frontend `lib/subscription-plans.ts` and backend `src/modules/billing/pricing.ts` catalogs. Annual subscriptions use annual additional-seat charges. Checkout is disabled until USD account capability and credentials are configured.

## Approved membership billing policy

- Only distinct active workspace members whose account is active count as billable members.
- Pending invitations, suspended members, removed members, and deactivated accounts do not count.
- The workspace owner counts once as an active member and consumes one included seat, if the owner account is active.
- Additional-member charges apply only above the selected plan's included allowance.
- Additional members cost $0.50 monthly or $1 annually for both Pro and Business.
- Additional seats use the base subscription cadence: annual subscriptions bill additional seats annually.
- A new additional seat takes effect immediately only after verified successful payment and is prorated for the remaining base subscription billing period.
- A committed seat reduction takes effect at renewal; there is no automatic credit for an already-paid period.
- Membership changes in one workspace do not affect another workspace. The server derives counts from the requested workspace's database state; frontend counts are not authoritative.
- Billing calculations must not deactivate/remove members, charge pending invitations, or count an owner twice.

The backend implements a server-owned integer-cent catalog, a Prisma-backed workspace-scoped active-member lookup/deduplicator, monthly/annual seat-quantity calculation, lifecycle/proration helpers, persistent checkout/subscription/payment/webhook-event models, and billing routes in `src/modules/billing/`. Invitation acceptance, approved join requests, direct member creation, and suspended-member restoration check paid seat capacity inside their workspace transactions. Billing checkout accepts a requested target quantity but validates it against current active seats and calculates the amount server-side.

## Approved lifecycle policy

- **Upgrade:** Pro to Business takes effect immediately after provider-confirmed successful payment. Calculate the prorated old/new plan difference for the remaining current billing period. Until confirmation, preserve the old plan and entitlements.
- **Downgrade:** Schedule Business to Pro at renewal. Keep the old plan active through the paid period. Report target allowance conflicts; do not remove members, workspaces, projects, or files.
- **Increase seats:** Apply immediately only after provider-confirmed successful payment, prorated for the remaining base billing period. Annual subscriptions use annual seat billing.
- **Reduce seats:** Apply the lower committed quantity at renewal, recount active membership from the database, and issue no automatic credit. Never remove/deactivate users to fit a quantity.
- **Cancellation:** Schedule cancellation at the end of the current paid period, retain benefits until that effective date, persist the request/date, and make repeat operations idempotent.
- **Refunds:** No automatic refunds. A request is handled manually under the approved refund policy and applicable law. Cancellation and refund requests remain separate.
- **Authorization:** Only the workspace owner may perform billing changes. Server authorization must not rely on client roles or IDs.

The service verifies transactions server-side, persists billing state, processes signed webhooks, and the workspace membership activation flows check active paid-seat capacity transactionally. These paths remain unverified against a configured Paystack test account.

## Required backend API and persistent implementation

Implemented API paths (all workspace paths require authentication; billing mutations require workspace ownership):

- `GET /billing/plans`
- `GET /billing/workspaces/:workspaceId`
- `GET /billing/workspaces/:workspaceId/payments`
- `POST /billing/workspaces/:workspaceId/checkout`
- `POST /billing/workspaces/:workspaceId/verify`
- `POST /billing/workspaces/:workspaceId/change`
- `POST /billing/workspaces/:workspaceId/cancel`
- `POST /webhooks/paystack`

Remaining backend requirements:

1. Integrate member removal/suspension with scheduled seat reduction and renewal quantity synchronization.
2. Reconcile webhook events and subscription state against the Paystack account; validate retry-safe handling against a real Paystack test account.

All billing mutations must be owner-authorized and audited. A client redirect or success message is never proof of payment. Do not store raw card data or expose provider credentials. Provider event processing and membership/subscription state changes require database transactions and duplicate-event protection.

## Explicitly deferred failed-payment requirements

The business has deferred failed-payment policy. Retry behavior/count, grace period, notifications, repeated-failure subscription status, continued paid access, and treatment of additional-seat charges remain undecided. Do not implement speculative retries, timelines, notices, or access restrictions. Existing failure handling must never grant paid access without verified payment or destroy customer data because payment failed.

## Paystack design and provider limitations

The backend uses hosted checkout via `POST /transaction/initialize`, server-side verification via `GET /transaction/verify/:reference`, recurring plan creation via `POST /plan`, recurring subscription creation via `POST /subscription`, and period-end provider cancellation via `POST /subscription/disable`. It verifies the `x-paystack-signature` HMAC-SHA512 using the Paystack secret key. Reusable authorization and subscription management tokens are stored encrypted with `PAYSTACK_ENCRYPTION_KEY`; raw card data is not stored.

Paystack plans have a fixed amount and documented monthly/annual intervals, so Nexus creates/reuses a plan per plan, cadence, and billable-seat count. A variable prorated initial charge is initialized separately; on verified payment, the server creates a recurring subscription with the matching full-cycle plan, starting after the current paid period when applicable. Downgrades/seat reductions create a replacement plan subscription for the renewal date, then disable the prior provider subscription. These cross-provider/database actions require reconciliation if a provider call succeeds but the database write fails.

Paystack docs state supported currencies are account/market dependent. USD is disabled by default and cannot be enabled from code; the merchant must confirm USD transactions with Paystack and verify the configured account. No currency conversion is implemented. The merchant's actual account configuration cannot be inspected by this repository.

## Environment and Dashboard setup

Configure these values in the backend's local `.env` (never in the frontend `.env.local`) and the backend deployment secret manager. `.env.example` contains empty placeholders only:

- `PAYSTACK_SECRET_KEY`: test secret key from Paystack Dashboard **Settings → API keys & webhooks** for sandbox verification; replace with the live secret only after a separately approved production launch.
- `PAYSTACK_WEBHOOK_SECRET`: the Paystack webhook signing secret (`whsec_...`) used to verify the timestamped `Paystack-Signature` header. Keep it server-side; Paystack's current signature supports a 300-second timestamp window and key-rotation signatures.
- `PAYSTACK_WEBHOOK_PREVIOUS_SECRET`: optional previous `whsec_...` secret during Paystack's signing-secret rotation overlap. Remove it when the overlap ends. The legacy `x-paystack-signature` is accepted only when the timestamped header is absent and is verified with `PAYSTACK_SECRET_KEY`.
- `PAYSTACK_USD_ENABLED`: leave `false` until Paystack confirms USD transactions are enabled for the actual merchant account; set `true` only after that confirmation.
- `PAYSTACK_CALLBACK_URL`: absolute Nexus billing return URL, for example `https://<your-domain>/app/billing`. Production configuration requires HTTPS.
- `PAYSTACK_ENCRYPTION_KEY`: generate a stable base64url-encoded 32-byte key for encrypting subscription management tokens at rest. Preserve it across deployments; losing it prevents provider subscription management.
- `PAYSTACK_API_URL`: keep the documented default `https://api.paystack.co` unless Paystack supplies a different endpoint.
- `PAYSTACK_REQUEST_TIMEOUT_MS`: optional request timeout; documented default is 15000 ms.

The browser public key is not required because checkout uses Paystack's hosted transaction URL. In Paystack Dashboard, configure the webhook URL as `https://<backend-domain>/api/v1/webhooks/paystack` for the matching test/live environment and configure the webhook signing secret. The backend reads raw request bytes and validates Paystack's timestamped signature; it retains legacy `x-paystack-signature` support for installations that have not migrated to the new header. Local webhook testing requires a publicly reachable HTTPS tunnel. Do not paste credentials into chat or commit them.

## Provider-dependent blockers

- Paystack USD support for this merchant, tax handling, invoice requirements, production credentials and webhook configuration.
- Paystack test credentials and confirmation of USD-enabled merchant configuration.
- Member removal/suspension-to-seat-reduction synchronization and provider/database reconciliation.
- Migration application to a verified disposable database.
- Live provider and backend verification, including duplicate webhook behavior and payment-success/failure paths.
- Legal approval of the Terms and Privacy drafts and applicable refund/cancellation wording.

## Frontend behavior

The pricing and authenticated billing pages display base/seat pricing, current backend subscription state, authoritative active-member count, renewal/cancellation dates, billing history, target seat quantity, checkout, plan changes, and period-end cancellation. The browser never grants paid access or supplies a price; requested seat quantity is checked against authoritative membership state by the backend. Merchant USD configuration and Paystack test-mode validation are still outstanding.
