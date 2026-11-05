# Account Lifecycle Frontend Integration

**Status:** Phase 7 frontend work in progress. The UI uses the backend API documented in `../__NexusBackend__/docs/API.md` and `docs/openapi.yaml`; it does not mark Phase 7 complete.

## Connected contracts

- `POST /api/v1/auth/delete` with `{ currentPassword, confirmation }`; response `{ status: "PENDING_DELETION", scheduledDeletionAt }`. UI confirmation explains the 30-day recovery period, immediately ended sessions, retained collaboration content and no automatic refund. The scheduled timestamp is shown on sign-in.
- `POST /api/v1/auth/reactivate` with `{ email, password }`; existing sign-in UI detects the backend `ACCOUNT_PENDING_DELETION` response and exposes recovery. Successful recovery does not create a session; user must sign in again.
- `PATCH /api/v1/workspaces/{workspaceId}/owner/{userId}` with optional `{ newOwnerRole }`, returning `{ transferId, status: "PENDING" }` per backend service implementation.
- `POST /api/v1/workspaces/{workspaceId}/owner-transfers/{transferId}/accept`; response includes `billingAcceptanceRequired`.
- `POST /api/v1/workspaces/{workspaceId}/owner-transfers/{transferId}/billing-acceptance`, invoked separately after explicit user action.
- Existing `GET /api/v1/billing/workspaces/{workspaceId}` and `/payments` display subscription cancellation state, effective dates and payment statuses. This is payment history, not an invoice feed.

## Backend dependencies not available

- No endpoint lists incoming/pending ownership transfers, so a recipient must receive the transfer reference out of band to use the current acceptance form. No transfer-rejection endpoint exists. Do not imply these capabilities are supported until backend contracts are added.
- Backend OpenAPI currently documents the ownership-initiation response as a workspace response, while the route service returns a transfer reference and pending status. Reconcile this documentation/schema mismatch before generating a frontend client.
- No invoice list/detail/pay endpoint exists; the UI explicitly distinguishes payment history from invoices and displays the approved payable-invoice/no-automatic-refund policy.
- No privacy request submission, status, decision, access, correction, erasure or redaction endpoint exists. The UI presents a non-submitting dependency notice and does not fake persistence.
- The backend schema currently has no message/channel entities, so message retention or message attachment screens cannot be connected.

## Retained collaboration content

The UI explains that shared collaboration content remains, author attribution becomes “Deleted user,” and this does not mean personal details in the content have been erased. It does not delete or redact content client-side. Any approved redactions must arrive from a future authorized backend contract.

## Verification

Record commands and actual results in the task completion report. Account deletion, ownership transfer, recovery, and privacy requests must also be verified against the backend integration; mocked UI tests alone do not establish backend integration.
