# Nexus Subscription and Billing Policy

> **DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL**
>
> This draft reflects the approved commercial rules and current application behavior. It is not a legal approval or a statement that Paystack live payments have been verified. Resolve bracketed business, legal, and deployment details before publication.

**Provider:** [LEGAL ENTITY NAME — REQUIRED]  
**Effective date:** [EFFECTIVE DATE — REQUIRED]  
**Contact:** [BILLING CONTACT — REQUIRED]

## Plans and prices

Published prices are in USD. Pro is $10 monthly or $50 annually and includes 15 seats. Business is $15 monthly or $70 annually and includes 25 seats. The workspace owner consumes one included seat. Additional seats cost $0.50 monthly or $1 annually for both Pro and Business. Annual subscriptions therefore use annual additional-seat billing.

The merchant is based initially in Nigeria and intends to serve customers internationally. USD transactions may be offered only after the merchant account is enabled for USD by Paystack. Nexus does not silently convert USD prices to NGN or another currency. If USD is unavailable, checkout is unavailable until the merchant resolves that account requirement.

## Billable seats

The backend is authoritative. It counts the active workspace owner once and distinct active workspace members whose accounts are active. Pending invitations, suspended members, removed members, and deactivated accounts are excluded. Additional seats equal the positive difference between active billable seats and the plan allowance.

The workspace owner selects a target seat quantity. The backend validates that the requested quantity covers active members and calculates the price. A newly activated workspace member cannot exceed an active paid subscription’s committed seat quantity. The owner must purchase an additional seat before activating another member.

## Changes and renewals

- Plan upgrades and seat increases take effect after the backend verifies successful payment. The incremental amount is prorated through the current paid period.
- Downgrades and seat reductions are scheduled for renewal. Existing benefits continue through the paid period. Seat reductions do not receive automatic mid-cycle credits.
- Additional seats follow the base subscription cadence.
- Cancellation stops renewal at the end of the paid period. Benefits remain available through the effective cancellation date.
- Failed-payment retry, grace-period, notification, access, and repeated-failure rules are deferred and are not promised by this draft.

## Payment handling

Checkout uses Paystack hosted checkout. Nexus does not collect or store raw card details. A browser redirect does not establish payment; the backend verifies the transaction reference, amount, and currency with Paystack before changing subscription state. Paystack webhooks are authenticated and processed idempotently.

Paystack plan amounts are fixed. Nexus creates provider plans for a plan, cadence, and seat quantity; prorated changes use a separate transaction followed by recurring plan setup. Provider/database failures may require reconciliation. Supported payment instruments and international availability depend on the merchant account and Paystack.

## Invoices and records

Billing history currently records Paystack references, amounts, currency, status, payment time, and billing period. [INVOICE/TAX DOCUMENT REQUIREMENTS — LEGAL AND ACCOUNTING REVIEW REQUIRED.] No tax rate or tax treatment is specified by this draft.

## Refunds

Nexus does not issue automatic refunds for subscription cancellation or seat reductions. Refund requests are handled manually under the approved refund policy and applicable law. Refund requests are separate from cancellation requests. [REFUND CONTACT, ELIGIBILITY, AND PROCESS — BUSINESS AND LEGAL REVIEW REQUIRED.]

## Legal and business details to resolve

- Legal entity, registration details, and business address.
- Governing law, jurisdiction, and dispute process.
- Consumer disclosures and any cancellation/refund rights that cannot be waived.
- Tax, invoice, and record-retention obligations.
- Billing support contact and complaint handling.
- Paystack contract, supported currencies, payment channels, and production account configuration.

