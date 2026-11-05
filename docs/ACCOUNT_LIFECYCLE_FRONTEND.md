# Account Lifecycle Frontend Integration

**Status:** Phase 7 frontend work in progress. The UI uses the backend API documented in `../__NexusBackend__/docs/API.md` and `docs/openapi.yaml`; it does not mark Phase 7 complete.

## Connected contracts

- `POST /api/v1/auth/delete` with `{ currentPassword, confirmation }`; response `{ status: "PENDING_DELETION", scheduledDeletionAt }`. UI confirmation explains the 30-day recovery period, immediately ended sessions, retained collaboration content and no automatic refund. The scheduled timestamp is shown on sign-in.
- `POST /api/v1/auth/reactivate` with `{ email, password }`; existing sign-in UI detects the backend `ACCOUNT_PENDING_DELETION` response and exposes recovery. Successful recovery does not create a session; user must sign in again.
- `PATCH /api/v1/workspaces/{workspaceId}/owner/{userId}` with optional `{ newOwnerRole }`, returning `{ transferId, status: "PENDING" }` per backend service implementation.
- `POST /api/v1/workspaces/{workspaceId}/owner-transfers/{transferId}/accept`; response includes `billingAcceptanceRequired`.
- `POST /api/v1/workspaces/{workspaceId}/owner-transfers/{transferId}/billing-acceptance`, invoked separately after explicit user action.
- Existing `GET /api/v1/billing/workspaces/{workspaceId}` and `/payments` display subscription cancellation state, effective dates and payment statuses. This is payment history, not an invoice feed.

## Backend contracts available and remaining dependencies

- The backend exposes `GET /api/v1/workspaces/owner-transfers/incoming` and `POST /api/v1/workspaces/{workspaceId}/owner-transfers/{transferId}/reject`, alongside accept and separate billing-acceptance routes. `components/workspaces/OwnershipLifecyclePanel.tsx` consumes the incoming list, accept, reject, and billing-acceptance contracts; starting a transfer still uses the documented recipient-id form. Each incoming-transfer item now includes `initiatedBy: { id, name }`; the inbox displays "<name> is offering you ownership of <workspace>" with a null-safe fallback to "Someone".
- The current `docs/openapi.yaml` documents the ownership-initiation result as `OwnershipTransferInitiationResponse`, matching the `{ transferId, status }` contract. The previously recorded response-schema mismatch is resolved.
- Privacy request submission and own-request list/detail routes are available under `/api/v1/privacy-requests`. `services/privacy-requests.ts` and `app/app/privacy-requests/page.tsx` submit requests and show the caller's list/details. Reviewer, decision, completion, and task-comment redaction management remain outside this self-service view.
- No invoice list/detail/pay API exists. The UI distinguishes persisted payment history from invoices and explains the approved payment/cancellation policy.
- The backend currently has no Message, Conversation, or Channel message model/API. Privacy redaction therefore applies to supported task comments only; message retention/redaction and message attachments cannot yet be integrated.

## Retained collaboration content

The UI explains that shared collaboration content remains, author attribution becomes “Deleted user,” and this does not mean personal details in the content have been erased. It does not delete or redact content client-side. Any approved redactions must arrive from a future authorized backend contract.

## Verification

Record commands and actual results in the task completion report. Account deletion, ownership transfer, recovery, and privacy requests must also be verified against the backend integration; mocked UI tests alone do not establish backend integration.
