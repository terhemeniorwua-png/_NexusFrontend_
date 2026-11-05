# Nexus Terms of Service

> **DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL**
>
> This draft is not a final or legally approved agreement. Bracketed text is unresolved and must be completed or approved before publication. The matching public draft is rendered at `/terms` from `lib/legal-policies.ts`.

**Provider:** [LEGAL ENTITY NAME — REQUIRED]  
**Effective date:** [EFFECTIVE DATE — REQUIRED]

## 1. Introduction and acceptance

These Terms govern access to and use of Nexus. By registering for or using the service, you agree to these Terms. If you do not agree, do not use Nexus. The contracting entity and final acceptance mechanism require approval.

## 2. The Nexus service

Nexus is a real-time workspace and project-management platform for workspaces, projects, tasks, collaboration, communication, files, scheduling, meetings, and productivity tools. Feature availability depends on workspace type, plan, role, permissions, and released functionality.

## 3. Eligibility and registration

You must be legally able to enter a binding agreement and provide accurate registration details. Minimum age and guardian-consent rules: **[MINIMUM AGE / ELIGIBILITY RULE — REQUIRED]**.

## 4. Account security and user responsibilities

Protect your credentials and devices, keep account details current, and report suspected unauthorized use to **[SECURITY CONTACT — REQUIRED]**. Do not bypass access controls or use another person’s account without authorization.

## 5. Personal workspaces

Your personal workspace is associated with your Nexus identity and remains separate from company and institution workspaces. You control personal content subject to applicable law and your sharing choices.

## 6. Company and Institution workspaces

These workspaces support collaboration among their members. Institution workspaces are not represented as a full learning-management system. Organization membership does not grant access to private resources unless access is separately granted.

## 7. Owners, administrators, and members

Owners and administrators manage membership, permissions, and settings within their authority. Members must follow applicable organization policies. Roles do not grant access beyond the permissions configured for a resource.

## 8. Acceptable use

Do not use Nexus unlawfully, infringe rights, distribute malicious code, disrupt the service, evade access controls, or access another person’s workspace or data without authorization. Reporting and enforcement procedures require legal approval.

## 9. User-generated content and ownership

You retain rights you hold in content you submit. You grant Nexus permission to host, process, transmit, display, and back it up as reasonably necessary to provide, secure, and support features you or your workspace use, subject to the approved Privacy Policy. You must have the rights needed to submit and share content. Shared organization content may remain available to that organization under its access and retention settings.

## 10. Files, uploads, storage, and shared resources

You are responsible for uploaded content and selecting who may access it. Do not upload content you lack authority to store or share. Storage limits, retention, and recovery behavior must be confirmed before they are promised.

## 11. Messages, calls, meetings, and collaboration

Use collaboration features lawfully and respect participant privacy. Recording, transcription, and retention behavior must be disclosed and supported by feature controls before those functions are enabled.

## 12. AI-assisted functionality

AI outputs may be inaccurate or incomplete. Review them before relying on or sharing them. AI-proposed changes to Nexus data require your explicit approval and backend authorization. AI providers, processing, and retention must be disclosed when those features are enabled.

## 13. Subscription plans and base prices

Approved prices are Pro at **$10/month or $50/year**, including **15 seats**, and Business at **$15/month or $70/year**, including **25 seats**. The workspace owner counts once and uses an included seat. Paystack checkout and subscription management are implemented in the application but remain disabled until merchant USD capability and credentials are configured and test-environment verification is completed.

## 14. Additional-seat billing

An additional seat is a distinct active workspace member beyond the selected plan’s included allowance. The approved rate for the selected subscription billing period is:

- **Pro:** $0.50 per additional active seat.
- **Business:** $1.00 per additional active seat.
- Monthly subscriptions bill these charges monthly; annual subscriptions bill them annually.
- Only active member accounts with active workspace membership count. Pending invitations, suspended, removed, and deactivated members are not billable.
- The workspace owner counts once and consumes one included seat.
- Each additional seat costs **$0.50 monthly** or **$1.00 annually** for both Pro and Business. The charge follows the base subscription billing duration.
- An additional seat takes effect immediately only after successful payment is confirmed by the provider; its charge is prorated for the remaining applicable billing period.
- A reduction in committed additional-seat quantity takes effect at renewal. No automatic credit is issued for an already-paid period. The backend recounts active members and does not remove or deactivate users to meet a quantity.
- The backend calculates prices and validates requested seat quantities against authoritative membership state; the client does not set prices or payment outcomes.

## 15. Monthly and annual billing

Monthly and annual base subscriptions use the approved prices above. Additional-seat charges follow the same cadence as the base subscription. Before requesting payment, checkout must disclose the base charge, included-seat allowance, additional-seat rate, and billing dates.

## 16. Subscription activation and payment confirmation

Paid access begins only after the backend verifies the Paystack transaction server-side against the expected reference, amount, and USD currency. A browser redirect or client-supplied status is not proof of payment. Webhook authenticity and idempotency are required before subscription state changes.

## 17. Upgrades, downgrades, and seat changes

The workspace owner must authorize plan and seat changes. A Pro-to-Business upgrade takes effect immediately after provider-confirmed payment and charges the prorated plan-price difference for the remaining current period. A Business-to-Pro downgrade is scheduled for renewal; current benefits remain until then. The service identifies any conflict with the lower seat allowance and does not remove members or data. Additional-seat increases are immediate after provider-confirmed payment and prorated for the remaining applicable billing period. Seat reductions take effect at renewal without an automatic credit. Billing dates and provider-calculated amounts must be shown before confirmation.

## 18. Cancellation

The workspace owner may request cancellation through a supported flow. Cancellation is scheduled for the end of the current paid period, and paid benefits continue until that effective date. Cancellation does not delete workspaces, members, projects, or files. Refunds are not automatic; refund requests are handled manually under the business’s approved refund policy and applicable law. Cancellation and refund requests are separate. The refund policy and these terms require legal review and approval.

## 19. Failed recurring payments and expired subscriptions

Failed-payment policy is deferred. Retry behavior, grace periods, notices, subscription status after repeated failures, paid-feature access, and treatment of additional-seat charges require a later business decision. No timeline or restriction is promised here. The service must show actual backend subscription state, must not grant paid access without verified payment, and must not delete customer data because payment failed.

## 20. Suspension and termination

Access may need to be restricted for security, legal requirements, non-payment, or material violations. Notice, review, appeal, and restoration procedures are **[PENDING LEGAL AND BUSINESS APPROVAL]**, subject to non-waivable legal rights.

## 21. Account deletion — product decision approved; legal review pending

An authenticated deletion request verifies the current password and account email, immediately revokes active sessions, and schedules permanent deletion exactly 30 days after the request. The account enters `PENDING_DELETION`; the user may recover it before the deadline by verifying identity. Once final deletion starts, normal recovery is unavailable. The request, recovery, and finalization are audited.

Owned workspaces and their shared projects, teams, messages, comments, files, and history are retained. Purely personal attachments are deleted after the 30-day recovery period; attachments shared with a workspace or linked to collaboration records are retained. A transfer requires the current owner's initiation, an eligible active member's explicit acceptance, and separate explicit acceptance of billing responsibility. Financial liability is not transferred automatically. If there is no accepted transfer by the deadline, the workspace remains suspended and a platform administrator may assign an owner without gaining unrestricted access to private content.

Subscription cancellation is scheduled for the recovery deadline to prevent future renewals; subscription state remains unchanged during the recovery period. Recovery cancels scheduled cancellation and verifies provider state before restoring billing. Outstanding invoices remain payable. Payment, invoice, receipt, refund, subscription, and audit records are retained as required; applicable retention periods require legal/accounting review. Shared content is preserved and personal attribution is replaced with “Deleted user” during finalization. This describes approved product behavior, not legal approval or regulatory compliance.

## 22. Personal workspace and shared content

Account deletion does not delete workspaces or shared content. Access to suspended workspaces is restricted. Messages, comments, files, projects, and collaboration history are retained under existing access controls. Author attribution changes to “Deleted user” and profile references are removed, but this does not mean all personal information in content is erased. Users may submit personal-information access, correction, erasure, or redaction requests for review; handling must protect other users' information and legitimate collaboration records. Applicable rights and legal obligations require professional legal review.

## 23. Shared organization content

Deleting an account does not delete an organization workspace or content belonging to other members. Workspace ownership transfer and suspension follow Section 21. An administrator's ownership resolution must be audited and does not grant unrestricted access to private workspace content.

## 24. Third-party services and integrations

Third-party services are subject to their own terms and privacy policies. Personal integrations do not automatically become workspace integrations. Provider and transfer details: **[PROCESSOR / INTEGRATION LIST — REQUIRED BEFORE FINAL APPROVAL]**.

## 25. Availability and service changes

Nexus may change, suspend, or discontinue features as the service evolves. Material-change notice and user options must follow an approved policy. This draft makes no uptime commitment.

## 26. Intellectual property

Nexus and its licensors retain rights in the platform and materials they provide. You receive a limited right to use available features for their intended purpose while authorized. No ownership of another party’s content is transferred.

## 27. Disclaimers and limitation of liability

Disclaimers, liability limits, and exceptions require jurisdiction-specific legal review. Nothing here limits liability that applicable law does not permit to be limited.

## 28. Disputes and governing law

Governing law and venue: **[JURISDICTION — REQUIRED LEGAL DECISION]**. Dispute process: **[APPROVED PROCESS — REQUIRED]**. No jurisdiction or dispute forum is selected by this draft.

## 29. Changes to these Terms

Notice methods, effective dates, and consent requirements for material changes are **[PENDING LEGAL APPROVAL]**. Users must be able to access the current approved version.

## 30. Provider and contact information

- Legal entity: **[LEGAL ENTITY NAME — REQUIRED]**
- Business address: **[REGISTERED / BUSINESS ADDRESS — REQUIRED]**
- Registration number, if applicable: **[REQUIRED]**
- Terms contact: **[CONTACT EMAIL OR FORM — REQUIRED]**
