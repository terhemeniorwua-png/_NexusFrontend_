# Nexus Privacy Policy

> **DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL**
>
> This draft reflects the repository implementation inspected for this task. Planned-feature processing is distinguished from functionality currently connected. Bracketed text must be resolved before publication as a final policy. The matching public draft is rendered at `/privacy` from `lib/legal-policies.ts`.

**Provider / controller:** [LEGAL ENTITY NAME — REQUIRED]  
**Effective date:** [EFFECTIVE DATE — REQUIRED]

## 1. Introduction

This draft describes information handled by Nexus and processing that may occur when available features are used. Production deployment, vendors, and applicable law must be reviewed before publication.

## 2. Categories of information

Depending on features actually used, Nexus may process account/profile details, authentication and session data, workspace/collaboration records, uploaded-file metadata, and technical/security records. Not every product feature is connected in the reviewed frontend or backend.

## 3. Account and profile information

The backend account model stores email, name, account status, email-verification state, timestamps, a password hash, and optional profile fields. Authentication uses session records. The backend stores refresh-token digests rather than raw refresh-token values.

## 4. Workspace, project, task, and collaboration data

The backend defines workspace, membership, invitation, join-request, project, task, and related data models. Workspace APIs currently expose workspace and membership operations. Other project/task/team data is processed as those operations are implemented and used.

## 5. Messages, meetings, and communication data

Messaging and meeting content, participant details, recordings, transcripts, and attendance are not connected through the reviewed frontend API. If introduced, the information collected, controls, recipients, and retention must be disclosed before use.

## 6. Files and uploaded assets

The backend schema includes file-attachment metadata, but the reviewed frontend has no connected upload flow. The storage provider, file contents, access methods, retention, and deletion behavior require confirmation before upload functionality is offered.

## 7. Subscription and payment-related information

The backend stores workspace subscription status, billing interval, seat quantity, period dates, pending changes, provider references, payment amounts/statuses, and billing history. Paystack hosted checkout collects payment details directly; Nexus does not receive or store raw card details. Checkout and USD entitlements remain disabled until the merchant enables USD and configures credentials. Paystack is the payment processor for test/live configurations. Deployment-specific processor terms, data locations, retention, and contact details require legal review before publication.

## 8. Technical, device, and log information

Backend session and audit-log models include IP address and user-agent fields. Authentication and API operations may create operational logs. Production log contents, device signals, retention, and monitoring vendors must be verified against deployment.

## 9. AI-related data processing

AI assistant and writing-assistance requests are not connected in the reviewed frontend. If enabled, prompts, selected text, and authorized context may be sent through the Nexus backend to its configured AI service. Provider identity, retention, model-training use, and user controls must be confirmed and disclosed first.

## 10. How information is used

Current account/workspace information supports registration, authentication, session management, verification, password recovery, workspace membership, invitations, join requests, and security. Other processing occurs only when the associated feature is implemented and enabled.

## 11. Authentication and security

The reviewed architecture uses short-lived bearer access tokens, a rotating refresh token in an HttpOnly cookie, and a CSRF cookie/header for refresh and logout. Passwords are stored as hashes. End-to-end encryption has not been verified and is not claimed.

## 12. Cookies and similar technologies

The backend sets `nexus_rt` as an HttpOnly refresh cookie and uses `nexus_csrf` for CSRF protection. The frontend stores theme preference under `nexus-theme` in local storage. No analytics cookie or analytics SDK is configured in the reviewed frontend. Production cookie attributes and expiry must be verified.

## 13. Service providers and processors

The backend has a configurable, provider-agnostic transactional email transport. It may use SMTP or a console/disabled adapter depending on deployment; the production mail provider is not identified by this repository. Payment, hosting, analytics, AI, and storage processors must be identified before related features are offered.

Paystack processes payment transactions and recurring authorizations when billing is enabled. Production processor locations, transfer mechanism, contract, and retention must be confirmed in deployment: **[PRODUCTION PROCESSOR REGISTER — REQUIRED]**.

## 14. Third-party integrations

No connected third-party calendar, file-storage, messaging, or OAuth integration was found in the reviewed frontend. If enabled, data shared with each provider depends on the connection and user action; that provider’s terms and privacy policy also apply.

## 15. Hosting, storage, and international transfers

The architecture uses PostgreSQL as durable source of truth and Redis for supporting ephemeral, coordination, and caching needs. Actual hosting regions, object storage, backups, and international transfer locations depend on deployment and have not been supplied.

Hosting provider, data locations, and transfer safeguards: **[DEPLOYMENT DETAILS — REQUIRED]**.

## 16. Data retention

Service records are retained as needed to provide the service, protect security, resolve disputes, and meet legal obligations. Applicable legal retention periods for financial records, audit records, backups, and other data require legal/accounting review; this draft does not invent those periods.

## 17. Account deletion — product decision approved; legal review pending

After identity verification, an account deletion request changes the account to `PENDING_DELETION`, records the request time, and schedules final deletion exactly 30 days later. Sessions and refresh credentials are revoked immediately. The user may verify identity and recover the account before the deadline. Recovery and finalization are mutually exclusive; normal recovery is unavailable after finalization starts. The request, recovery, and completion are audited.

Owned workspaces are retained. Workspaces without an accepted owner transfer are suspended; shared projects, teams, messages, comments, files, and workspace history remain under existing access controls. An accepted transfer requires the recipient to be an active member and to separately accept billing responsibility. No outstanding financial liability is silently transferred. At final deletion, personal author attribution is replaced with “Deleted user,” profile picture and profile references are removed, and collaboration content is retained. Personal information within retained collaboration content is not automatically purged; users may submit access, correction, erasure, or redaction requests for review, subject to protecting other people and legitimate collaboration records. Purely personal attachments are deleted only at final deletion after the 30-day recovery period; recovery preserves them. Shared workspace and collaboration-linked attachments are retained. An authorized platform administrator may resolve ownership after the recovery deadline; this does not grant unrestricted access to private content.

Subscription cancellation is scheduled at the 30-day deadline to prevent future renewals. During the recovery period the subscription remains in its current state. Recovery cancels scheduled cancellation and provider state is checked before billing is restored. Outstanding invoices remain payable. Applicable retention periods for invoices, payment references, receipts, refunds, subscription history, and audit records require legal/accounting review. These are approved product decisions, not legal approval or a claim of regulatory compliance.

## 18. Personal workspace and shared content

No workspace or shared content is automatically deleted as a result of account deletion. Messages, comments, files, projects, and collaboration history are retained and remain governed by existing access controls. The approved personal-attachment exception is limited to purely personal attachments, which are deleted after the recovery period; shared or collaboration-linked files are retained. Personal information inside retained content follows the review process described above; applicable rights, response timelines, and legal obligations remain subject to professional legal review.

## 19. Shared organization data

Account deletion does not delete an organization workspace or content belonging to other members. Ownership transfer, suspension, and administrator resolution follow Section 17. Administrator ownership assignment is audited and does not grant unrestricted access to private workspace content.

## 20. User rights and privacy requests

Depending on applicable law, users may have rights to access, correct, export, restrict, object to, or request deletion of personal information. Applicable rights, identity verification, response timelines, and appeal processes require legal review.

Privacy request contact: **[PRIVACY CONTACT — REQUIRED]**.

## 21. Data security

Nexus uses authentication, access controls, password hashing, session protections, and other safeguards present in the backend. Backend authorization controls workspace access. No certification, end-to-end encryption, or absolute-security guarantee is claimed.

## 22. Children’s privacy and eligibility

The minimum registration age and rules for minors have not been approved. Do not publish a specific age threshold until product and legal review sets it.

Minimum age and guardian requirements: **[CHILDREN’S PRIVACY RULE — REQUIRED]**.

## 23. Policy changes

Material-change notices, effective dates, and any legally required consent must follow a process approved by counsel. Users should be able to access the current policy version.

## 24. Contact information

- Legal entity: **[LEGAL ENTITY NAME — REQUIRED]**
- Privacy contact: **[PRIVACY EMAIL OR FORM — REQUIRED]**
- Business address: **[ADDRESS — REQUIRED]**
