# Nexus Legal and Compliance Implementation Guide

**Version:** 0.1  
**Status:** Working draft — product-owner confirmation and legal review pending  
**Jurisdiction assumption:** Nigeria (unconfirmed)  
**Payment provider:** Paystack

This guide records the legal and product-policy input supplied on 2026-11-04. It is not legal advice, legal approval, or confirmation that the described behavior exists. Public Terms and Privacy pages remain visibly marked as drafts. Do not infer approval from the presence of this file.

## 1. Document lifecycle

Use these states when tracking policy artifacts:

- **DRAFT** — content exists but has not been approved.
- **PRODUCT_APPROVED** — product owner confirms commercial and operational decisions.
- **LEGAL_REVIEW** — submitted for legal review.
- **LEGAL_APPROVED** — counsel approves the relevant document.
- **PUBLISHED** — approved text is published and its current version is accessible.

The supplied legal pack is a fictional working draft. The provider entity, address, contacts, effective date, minimum age, jurisdiction, privacy facts, retention periods, and other bracketed or unresolved facts are not to be fabricated.

## 2. Public policy routes

The proposal names `/legal/terms`, `/legal/privacy`, `/legal/subscription`, and `/legal/refund-policy`. The existing frontend currently exposes `/terms` and `/privacy`. Do not silently redirect, duplicate, or publish the additional routes as approved legal content; route and content publication requires an implementation decision after product and legal review.

Public policy pages must be accessible without authentication, responsive, keyboard accessible, and consistent with the Nexus design system. They should show the document version, effective date, approval state, and links to related policies. Drafts must retain a prominent review warning.

## 3. Registration consent dependency

The proposal requires explicit Terms and Privacy acceptance, with optional marketing consent separate and unchecked by default. Before implementing registration consent:

1. Confirm the approved document versions and which acceptances are legally required.
2. Add and verify a backend contract that records user, document type/version, timestamp, and acceptance source.
3. Keep optional marketing consent independent from required acceptance.
4. Prevent registration when required acceptance is missing and preserve clear validation feedback.

The inspected `/auth/register` request accepts `{ name, email, password }`; no legal-acceptance fields or recording endpoint were found. Do not invent a frontend-only acceptance record or claim that consent is recorded.

## 4. Checkout disclosures

Before a payment request, the interface must show the server-provided plan, billing duration, price and currency, included seats, additional-seat rate, renewal frequency, cancellation terms, applicable trial conditions, and policy links. The backend remains authoritative for prices, seat counts, payment confirmation, and subscription state. A checkout redirect is not proof of payment.

The supplied pricing values are labeled provisional in the legal pack. Existing product decisions and the live backend catalog must be reconciled before changing the pricing UI. Do not activate recurring billing or promise a trial conversion rule without an approved product policy and a matching provider/backend contract.

## 5. Account deletion policy and backend mismatch

The newly supplied provisional product policy proposes immediate revocation of sign-in access after explicit confirmation, no user-facing recovery period, asynchronous deletion of eligible personal information, preservation/anonymization of eligible shared organization records, ownership transfer or workspace restriction, cancellation of recurring billing, and retention of legally required financial records.

The inspected backend instead schedules deletion after a 30-day recovery period. Its worker can also defer cleanup for organization ownership, last-admin, shared personal-workspace, and file-metadata conditions; there is no object-storage adapter for avatar/file cleanup. The frontend has no account deletion UI. Keep deletion UI blocked until product policy, legal text, backend contract, ownership and billing lifecycle, storage cleanup, anonymization, and retention behavior are aligned and integration-tested.

## 6. Avatar policy and backend dependency

The provisional avatar proposal specifies private AWS S3 storage, JPEG/JPG, PNG, WebP, GIF, and AVIF, with file size strictly below 1,000,000 bytes. It requires extension, MIME, and file-signature validation; secure server-authorized upload; replacement/removal; shared profile updates; and eligible object deletion during account deletion.

The current profile API only reads/writes an `avatarUrl`; no upload authorization, storage, signature validation, remove, or object-deletion contract was found. Do not upload directly from the browser, expose AWS credentials, or present an editable URL as an upload workflow.

## 7. Cross-device onboarding dependency

The provisional account-lifecycle policy requires the selected Personal, Institution, or Business type and onboarding progress to survive email verification and authentication across browsers and devices, support resuming incomplete onboarding, and avoid duplicate workspace creation.

The existing frontend stores intent in browser local storage. The backend registration contract accepts only name, email, and password, and the verification link contains only its token. The local value does not meet the cross-device requirement. Implement persistent onboarding only after the backend provides a retrieval/update contract or an approved verification-link contract change.

## 8. Required verification before publication or lifecycle release

- Legal pages render publicly and show the correct approval/version state.
- Required consent is recorded by the backend against an approved document version; optional consent is separate.
- Checkout disclosures match the backend catalog and verified payment behavior.
- Deletion immediately revokes sessions if that policy is approved; ownership, billing, data preservation/anonymization, object cleanup, and retention workflows are integration-tested.
- Avatar upload validates actual file signatures and size, supports replacement/removal, and uses backend-authorized private storage.
- Onboarding intent survives a second browser/device and resumes without duplicate workspaces.
- Responsive and accessibility checks cover each new public and account workflow.

Do not mark a phase complete based solely on draft pages or client-side state. Record unimplemented backend dependencies in `PHASES.md` and keep affected phase statuses open.
