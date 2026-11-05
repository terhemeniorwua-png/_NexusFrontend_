export interface LegalPolicySection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalPolicyContent {
  title: string;
  summary: string;
  approvalState: "draft-requires-legal-review";
  sections: LegalPolicySection[];
}

const draftState = "draft-requires-legal-review" as const;

/** Draft policy copy for review. Replace placeholders only with approved facts. */
export const legalPolicies: Record<"terms" | "privacy", LegalPolicyContent> = {
  terms: {
    title: "Terms of Service",
    summary:
      "Draft terms for the Nexus real-time workspace and project-management platform. This draft is not legally approved and contains placeholders that must be completed before publication as final terms.",
    approvalState: draftState,
    sections: [
      {
        id: "introduction",
        heading: "1. Introduction and acceptance",
        paragraphs: [
          "These Terms of Service (the “Terms”) govern access to and use of Nexus. By creating an account or using Nexus, you agree to these Terms. If you do not agree, do not use the service.",
          "The contracting legal entity, effective date, and final acceptance flow must be confirmed before publication.",
        ],
        bullets: [
          "Provider legal name: [LEGAL ENTITY NAME — REQUIRED]",
          "Effective date: [EFFECTIVE DATE — REQUIRED]",
        ],
      },
      {
        id: "service",
        heading: "2. The Nexus service",
        paragraphs: [
          "Nexus is a real-time workspace and project-management platform intended to bring together workspaces, projects, tasks, collaboration, communication, files, scheduling, meetings, and productivity tools. Feature availability may depend on workspace type, plan, role, permissions, and whether a feature has been released.",
        ],
      },
      {
        id: "eligibility",
        heading: "3. Eligibility and registration",
        paragraphs: [
          "You must be legally able to enter into a binding agreement to register and use Nexus. The minimum age and any guardian-consent rules require legal approval: [MINIMUM AGE / ELIGIBILITY RULE — REQUIRED].",
          "You must provide accurate registration information, keep it current, and use an account you are authorised to control.",
        ],
      },
      {
        id: "security",
        heading: "4. Account security and responsibilities",
        paragraphs: [
          "You are responsible for protecting your credentials, controlling access to your devices, and promptly reporting suspected unauthorised access through [SECURITY CONTACT — REQUIRED]. Do not share credentials or bypass authentication and access controls.",
          "You are responsible for activity performed through your account, subject to rights and remedies that applicable law does not allow these Terms to limit.",
        ],
      },
      {
        id: "personal-workspaces",
        heading: "5. Personal workspaces",
        paragraphs: [
          "A personal workspace is associated with your Nexus identity and is separate from company and institution workspaces. You control personal content subject to these Terms, applicable law, and any sharing or collaboration choices you make.",
        ],
      },
      {
        id: "organization-workspaces",
        heading: "6. Company and Institution workspaces",
        paragraphs: [
          "Company and Institution workspaces support collaboration among their members. Institutions are not represented as a full learning-management system. Joining an organization does not give you access to private resources unless access is granted.",
        ],
      },
      {
        id: "organization-roles",
        heading: "7. Organization owners, administrators, and members",
        paragraphs: [
          "Workspace owners and administrators manage membership, permissions, and workspace settings within their authority. Members must follow applicable organization policies. Workspace roles do not grant access beyond the permissions configured for a resource.",
        ],
      },
      {
        id: "acceptable-use",
        heading: "8. Acceptable use",
        paragraphs: [
          "You may not use Nexus to break the law, infringe another person’s rights, distribute malicious code, interfere with service operation, evade access controls, or access another person’s workspace or data without authorisation. Additional abuse reporting and enforcement procedures require approval.",
        ],
      },
      {
        id: "user-content",
        heading: "9. User-generated content and ownership",
        paragraphs: [
          "As between you and Nexus, you retain rights you hold in content you submit. You grant Nexus permission to host, process, transmit, display, and back up that content only as reasonably necessary to provide, secure, and support the features you and your workspace use, subject to the approved Privacy Policy.",
          "You must have the rights and permissions needed to submit and share content. Content shared in an organization may remain available to that organization under its access and retention settings.",
        ],
      },
      {
        id: "files",
        heading: "10. Files, uploads, storage, and shared resources",
        paragraphs: [
          "You are responsible for the files and other material you upload and for choosing who may access them. Do not upload content you are not authorised to store or share. Storage limits, file retention details, and supported recovery behavior must be stated in approved product information before they are promised.",
        ],
      },
      {
        id: "communications",
        heading: "11. Messages, calls, meetings, and collaboration",
        paragraphs: [
          "Nexus collaboration features may include messages, comments, calls, meetings, presence, and shared work. Use these features lawfully and respect participant privacy. Recording, transcription, and retention behavior must be disclosed and supported by applicable feature controls before those functions are enabled.",
        ],
      },
      {
        id: "ai",
        heading: "12. AI-assisted functionality",
        paragraphs: [
          "AI features may provide drafts, summaries, analysis, recommendations, and proposed actions. Outputs can be inaccurate or incomplete. You are responsible for reviewing outputs before relying on them or sharing them. AI-proposed changes to Nexus data require your explicit approval and backend authorization.",
          "AI feature availability, processing providers, and data retention must be disclosed when those features are enabled.",
        ],
      },
      {
        id: "plans",
        heading: "13. Subscription plans and approved prices",
        paragraphs: [
          "Approved prices are Pro at $10 per month or $50 per year, including 15 seats, and Business at $15 per month or $70 per year, including 25 seats. The workspace owner counts once and uses one included seat.",
          "Paystack checkout and subscription management are implemented in the application but remain disabled until merchant USD capability and credentials are configured and test-environment verification is completed.",
        ],
      },
      {
        id: "additional-members",
        heading: "14. Additional-seat billing",
        paragraphs: [
          "An additional seat is a distinct active workspace member beyond the included allowance for the selected plan. Additional-seat rates per selected subscription billing period are:",
        ],
        bullets: [
          "Pro: $0.50 per additional active seat.",
          "Business: $1 per additional active seat.",
          "Additional-seat charges follow the base subscription cadence: monthly for monthly subscriptions and annual for annual subscriptions.",
          "Only active member accounts with active workspace membership count; pending invitations, suspended, removed, and deactivated members do not count.",
          "The workspace owner counts once and consumes an included seat.",
          "An additional seat takes effect immediately only after provider-confirmed payment and is prorated for the remaining applicable billing period.",
          "A reduction in committed additional-seat quantity takes effect at renewal without automatic credit. Recount active members; do not remove or deactivate members to meet a quantity.",
          "The backend calculates prices and seat counts; client-supplied counts are never authoritative.",
        ],
      },
      {
        id: "billing-cadence",
        heading: "15. Monthly and annual billing",
        paragraphs: [
          "Monthly and annual base subscriptions use the approved prices. Additional-seat fees follow the selected base subscription cadence. Before payment, checkout must disclose the base charge, included-seat allowance, additional-seat rate, and applicable billing dates.",
        ],
      },
      {
        id: "activation",
        heading: "16. Subscription activation and payment confirmation",
        paragraphs: [
          "Paid access begins only after the backend verifies a Paystack transaction against its expected reference, amount, and USD currency. A browser redirect, client message, or client-supplied payment status is not proof of payment. Paystack webhook signatures must be verified and events processed idempotently before subscription state changes.",
        ],
      },
      {
        id: "subscription-changes",
        heading: "17. Upgrades, downgrades, and seat changes",
        paragraphs: [
          "The workspace owner authorises plan and seat changes. A Pro-to-Business upgrade takes effect immediately after provider-confirmed payment with a prorated old/new price difference for the remaining period. A Business-to-Pro downgrade is scheduled for renewal; current benefits remain active until then. The service identifies conflicts with the lower allowance and does not remove members or data.",
          "Additional-seat increases are immediate after provider-confirmed payment and prorated for the remaining applicable billing period. Seat reductions take effect at renewal without automatic credit. The billing interface must show provider-calculated amounts and timing before confirmation.",
        ],
      },
      {
        id: "cancellation",
        heading: "18. Cancellation",
        paragraphs: [
          "The workspace owner may request cancellation through a supported billing flow. Cancellation is scheduled for the end of the current paid period, and paid benefits remain until that effective date. Cancellation does not delete workspaces, members, projects, or files.",
          "Refunds are not automatic. Refund requests are handled manually under the business’s approved refund policy and applicable law. Refund requests and subscription cancellation are separate. Refund and cancellation wording remains subject to legal review and approval.",
        ],
      },
      {
        id: "failed-payments",
        heading: "19. Failed recurring payments and expired subscriptions",
        paragraphs: [
          "Failed-payment policy is deferred. Retry behavior, grace periods, notices, subscription status after repeated failures, paid-feature access, and treatment of additional-seat charges require a later business decision. No timeline or access restriction is assumed. The service must not grant paid access without verified payment or delete customer data because payment failed.",
        ],
      },
      {
        id: "suspension",
        heading: "20. Suspension and termination",
        paragraphs: [
          "Nexus may need to restrict or suspend access to address security risks, legal requirements, non-payment, or material violations. Notice, review, appeal, and restoration procedures are [PENDING LEGAL AND BUSINESS APPROVAL]. Any action remains subject to rights that applicable law provides.",
        ],
      },
      {
        id: "account-deletion",
        heading: "21. Account deletion",
        paragraphs: [
          "An authenticated request verifies the current password and account email, revokes active sessions, and schedules final deletion exactly 30 days after the request. The account enters PENDING_DELETION and the user may recover it before the deadline after identity verification. Finalization and recovery are mutually exclusive; normal recovery is unavailable once finalization starts. The request, recovery, and completion are audited. This product decision is approved; legal review remains outstanding.",
          "Owned workspaces and shared content are retained. Workspaces without an accepted ownership transfer are suspended. A transfer requires current-owner initiation, explicit acceptance by an eligible active member, and separate explicit acceptance of billing responsibility. Financial liability is never transferred automatically. Subscription cancellation is scheduled for the 30-day deadline; recovery cancels it subject to provider-state verification. Outstanding invoices remain payable. Messages, comments, files, projects, and workspace history are retained, with personal author attribution replaced by “Deleted user” after finalization. Applicable financial-record retention periods require legal/accounting review.",
        ],
      },
      {
        id: "personal-workspace-deletion",
        heading: "22. Personal workspace and shared content",
        paragraphs: [
          "Account deletion does not delete personal or shared workspaces. Owned workspaces without accepted transfer remain suspended, and collaboration content remains under existing access controls. Retained content attribution is anonymized at finalization. Personal information inside shared content and applicable retention exceptions require legal review.",
        ],
      },
      {
        id: "shared-organization-content",
        heading: "23. Shared organization content",
        paragraphs: [
          "Account deletion does not delete an organization’s workspace or content belonging to other members. Organization owners are responsible for separately initiating an authorized organization deletion when applicable. Ownership conflicts must be resolved before an account owner can be removed.",
        ],
      },
      {
        id: "third-party-services",
        heading: "24. Third-party services and integrations",
        paragraphs: [
          "Some features may connect to third-party services. Those services are governed by their own terms and privacy policies. Nexus integrations are not available unless shown as connected by the product; personal connections do not automatically become workspace connections. Provider list and transfer details: [PROCESSOR / INTEGRATION LIST — REQUIRED BEFORE FINAL APPROVAL].",
        ],
      },
      {
        id: "availability",
        heading: "25. Availability and service changes",
        paragraphs: [
          "Nexus may change, suspend, or discontinue features as the service evolves. Material changes, notice, and any user options required by applicable law must be handled under an approved change policy. No uptime commitment is made by this draft.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "26. Intellectual property",
        paragraphs: [
          "Nexus and its licensors retain rights in the platform and materials they provide. These Terms grant you a limited right to use available features for their intended purpose while your account and access remain in good standing. No ownership of another party’s content is transferred.",
        ],
      },
      {
        id: "disclaimers-liability",
        heading: "27. Disclaimers and limitation of liability",
        paragraphs: [
          "To the extent permitted by applicable law, the service is provided without warranties not expressly required by law. Any exclusions, caps, and exceptions to liability require jurisdiction-specific legal review and approval. Nothing in this draft limits liability that cannot lawfully be limited.",
        ],
      },
      {
        id: "disputes-law",
        heading: "28. Disputes and governing law",
        paragraphs: [
          "Governing law, courts or other dispute process, venue, and any mandatory pre-dispute steps are unresolved. No jurisdiction or dispute forum is selected in this draft.",
          "Governing law and venue: [JURISDICTION — REQUIRED LEGAL DECISION]. Dispute process: [APPROVED PROCESS — REQUIRED].",
        ],
      },
      {
        id: "changes",
        heading: "29. Changes to these Terms",
        paragraphs: [
          "The provider may propose updates to these Terms. The notice method, effective date, and any consent required for material changes are [PENDING LEGAL APPROVAL]. The current approved version and effective date must be available to users.",
        ],
      },
      {
        id: "contact",
        heading: "30. Provider and contact information",
        paragraphs: [
          "Legal provider name: [LEGAL ENTITY NAME — REQUIRED]. Business address: [REGISTERED / BUSINESS ADDRESS — REQUIRED]. Company registration number: [IF APPLICABLE — REQUIRED]. Terms contact: [CONTACT EMAIL OR FORM — REQUIRED]. No company identity or contact details have been supplied for this draft.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    summary:
      "Draft privacy information based on the current frontend and backend implementation, with planned-feature processing clearly distinguished. This draft is not legally approved and contains placeholders that must be completed before publication as final policy.",
    approvalState: draftState,
    sections: [
      {
        id: "privacy-introduction",
        heading: "1. Introduction",
        paragraphs: [
          "This draft describes information handled by Nexus and processing that may occur when you use available features. It must be reviewed against production deployment, vendors, and applicable law before publication.",
          "Controller / provider legal name: [LEGAL ENTITY NAME — REQUIRED]. Effective date: [EFFECTIVE DATE — REQUIRED].",
        ],
      },
      {
        id: "information-categories",
        heading: "2. Categories of information",
        paragraphs: [
          "Depending on features actually used, Nexus may process account and profile details, authentication/session data, workspace and collaboration records, uploaded-file metadata, and technical or security records. Not every described product feature is currently connected in the frontend or backend.",
        ],
      },
      {
        id: "account-profile",
        heading: "3. Account and profile information",
        paragraphs: [
          "The backend account model stores email address, name, account status, email-verification state, timestamps, a password hash, and optional profile fields. Authentication also uses session records; refresh-token digests are stored by the backend rather than the raw refresh-token value.",
        ],
      },
      {
        id: "workspace-project-data",
        heading: "4. Workspace, project, task, and collaboration data",
        paragraphs: [
          "The backend has workspace, membership, invitation, join-request, project, task, and related data models. Workspace API routes currently expose workspace and membership operations. Data for projects, tasks, departments, and teams is processed only as those product operations are implemented and used.",
        ],
      },
      {
        id: "messages-meetings",
        heading: "5. Messages, meetings, and communication data",
        paragraphs: [
          "Messaging and meeting content, participant details, recordings, transcripts, or attendance are not currently connected through the reviewed frontend API. If those features are introduced, the collected data, recording controls, recipients, and retention must be documented before use.",
        ],
      },
      {
        id: "files",
        heading: "6. Files and uploaded assets",
        paragraphs: [
          "The backend schema includes file-attachment metadata, but the reviewed frontend has no connected upload flow and the backend account-deletion worker reports unresolved storage cleanup when file metadata exists. The actual storage provider, file contents handled, access URLs, retention, and deletion behavior must be confirmed before file upload is offered.",
        ],
      },
      {
        id: "billing-information",
        heading: "7. Subscription and payment information",
        paragraphs: [
          "The backend stores subscription status, interval, seat quantity, period dates, provider references, payment amounts and statuses, and billing history. Paystack hosted checkout collects payment details directly; Nexus does not store raw card details. USD billing remains disabled until the merchant enables USD and configures credentials. Processor terms, deployment locations, and retention require legal review before this draft is approved.",
        ],
      },
      {
        id: "technical-information",
        heading: "8. Technical, device, and log information",
        paragraphs: [
          "The backend session and audit-log models include IP address and user-agent fields. Authentication and API operations may also produce operational logs. Exact production log contents, device signals, retention periods, and monitoring vendors depend on deployment and require verification before final publication.",
        ],
      },
      {
        id: "ai-processing",
        heading: "9. AI-related processing",
        paragraphs: [
          "AI assistant and writing-assistance requests are not connected in the reviewed frontend. If enabled, user prompts, selected text, and authorised contextual material may be sent to the Nexus backend and its configured AI processing service to provide the requested output. The AI provider, retention, model-training use, and user controls must be confirmed and disclosed before activation.",
        ],
      },
      {
        id: "use-information",
        heading: "10. How information is used",
        paragraphs: [
          "Current account and workspace information is used to provide registration, sign-in, session management, email verification, password recovery, workspace membership, invitation, join-request, and security functions. Information for other product capabilities is used only when those features are implemented and enabled.",
        ],
      },
      {
        id: "authentication-security",
        heading: "11. Authentication and security",
        paragraphs: [
          "The reviewed architecture uses short-lived bearer access tokens, a rotating refresh token in an HttpOnly cookie, and a CSRF cookie/header for refresh and logout. Passwords are stored as hashes. No security measure guarantees absolute security, and end-to-end encryption has not been verified or claimed.",
        ],
      },
      {
        id: "cookies",
        heading: "12. Cookies and similar technologies",
        paragraphs: [
          "The authentication backend sets `nexus_rt` as an HttpOnly refresh cookie and uses `nexus_csrf` for CSRF protection. The frontend stores the theme preference under `nexus-theme` in local storage. The reviewed frontend does not configure an analytics cookie or analytics SDK. Production cookie attributes, expiration, and domain must be verified against deployment.",
        ],
      },
      {
        id: "processors",
        heading: "13. Service providers and processors",
        paragraphs: [
          "The backend includes a configurable transactional email transport. Paystack processes payments and recurring authorizations when billing is enabled. Production email provider, processor locations, retention, and transfer mechanism require deployment confirmation.",
          "Processor name, purpose, data location, and applicable transfer mechanism: [PRODUCTION PROCESSOR REGISTER — REQUIRED].",
        ],
      },
      {
        id: "integrations",
        heading: "14. Third-party integrations",
        paragraphs: [
          "No connected third-party calendar, file-storage, messaging, or OAuth integration was found in the reviewed frontend. If integrations become available, information shared with each provider will depend on the account connection and feature action, and the provider’s own terms and privacy policy will apply.",
        ],
      },
      {
        id: "hosting-transfers",
        heading: "15. Hosting, storage, and international transfers",
        paragraphs: [
          "The architecture uses PostgreSQL as its durable source of truth and Redis for supporting ephemeral, coordination, and caching needs. The actual hosting regions, object-storage provider, backups, and international transfer locations depend on deployment and have not been supplied.",
          "Hosting provider, processing locations, and transfer safeguards: [DEPLOYMENT DETAILS — REQUIRED].",
        ],
      },
      {
        id: "retention",
        heading: "16. Data retention",
        paragraphs: [
          "Account and service records are retained as needed to provide the service, protect security, resolve disputes, and meet legal obligations. This draft does not set a retention period for ordinary account, workspace, log, or backup data because none has been approved. Account-deletion processing and unresolved retention choices are described below.",
        ],
      },
      {
        id: "account-deletion",
        heading: "17. Account deletion",
        paragraphs: [
          "An authenticated account-deletion request verifies the current password and account email, revokes sessions immediately, and schedules final deletion exactly 30 days later. The user may recover the account before the deadline after identity verification. Finalization and recovery are mutually exclusive. This approved product behavior remains subject to legal review.",
          "Owned workspaces are retained; those without an accepted transfer are suspended. Ownership transfer requires the current owner’s initiation, an eligible active member’s acceptance, and separate acceptance of billing responsibility. Subscription cancellation is scheduled for the 30-day deadline and reversed on recovery after payment-provider state is checked. Outstanding invoices remain payable. Messages, comments, files, projects, and history remain under existing access controls, with personal attribution replaced by “Deleted user” at finalization. Financial records are retained subject to legal/accounting retention review.",
        ],
      },
      {
        id: "personal-workspace",
        heading: "18. Personal workspace deletion",
        paragraphs: [
          "No workspace or shared content is automatically deleted as a result of account deletion. Workspaces without an accepted ownership transfer remain suspended; shared content is retained under existing access controls and attribution is anonymized at finalization.",
        ],
      },
      {
        id: "shared-content",
        heading: "19. Shared organization data",
        paragraphs: [
          "A user’s account deletion does not delete a shared organization workspace or content belonging to other members. Access to content follows workspace/resource permissions. An organization owner must use a separate authorized organization-deletion process; ownership must be resolved before deleting the only eligible owner.",
        ],
      },
      {
        id: "privacy-rights",
        heading: "20. User rights and privacy requests",
        paragraphs: [
          "Depending on applicable law, you may have rights to access, correct, export, restrict, object to, or request deletion of personal information. The responsible entity, verification method, response process, appeal route, and relevant jurisdiction-specific rights require legal review.",
          "Privacy request contact: [PRIVACY CONTACT — REQUIRED].",
        ],
      },
      {
        id: "security",
        heading: "21. Data security",
        paragraphs: [
          "Nexus applies authentication, access controls, password hashing, session protections, and other safeguards present in the backend implementation. Workspace authorization is enforced by the backend. No claim of end-to-end encryption, certification, or absolute security is made.",
        ],
      },
      {
        id: "children",
        heading: "22. Children’s privacy and eligibility",
        paragraphs: [
          "The minimum age for registration and rules for users who are minors have not been approved. Nexus must not claim a specific age threshold until one is set by product and legal review.",
          "Minimum age and guardian requirements: [CHILDREN’S PRIVACY RULE — REQUIRED].",
        ],
      },
      {
        id: "policy-changes",
        heading: "23. Changes to this Policy",
        paragraphs: [
          "Material changes, notices, effective dates, and any consent required by law must follow a process approved by legal counsel. The current policy version should be made available to users.",
        ],
      },
      {
        id: "privacy-contact",
        heading: "24. Contact information",
        paragraphs: [
          "Legal provider name: [LEGAL ENTITY NAME — REQUIRED]. Privacy contact: [PRIVACY EMAIL OR FORM — REQUIRED]. Business address: [ADDRESS — REQUIRED]. No legal entity, privacy contact, or address has been supplied for this draft.",
        ],
      },
    ],
  },
};
