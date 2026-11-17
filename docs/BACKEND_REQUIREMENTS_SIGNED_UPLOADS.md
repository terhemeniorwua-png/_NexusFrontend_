# Backend Requirements: Signed Upload URLs

## Problem
The frontend currently uploads files through the same-origin `/api/backend` proxy using
`multipart/form-data`. This approach has two limitations:

1. **Vercel/serverless function limit**: File uploads are restricted to ~4.5 MB, which is
   insufficient for many Nexus use cases (large documents, media, design files).

2. **Direct PostgreSQL access from frontend**: The proxy forwards the upload to the backend,
   which writes to storage. This couples the frontend to the backend's storage configuration.

## Solution: Signed Upload URLs

### Flow
1. **GET /api/v1/files/upload-url** — The backend generates a signed, time-limited URL
   (e.g., S3 pre-signed URL or cloud storage signed URL) for the given workspace, project,
   task, and file name. The response includes:
   - `uploadUrl`: The direct storage URL to PUT the file to
   - `storagePath`: The logical path where the file will be stored (for backend reference)
   - `expiresAt`: ISO timestamp when the URL expires
   - `maxSizeBytes`: Maximum allowed file size for this upload

2. **PUT <uploadUrl>** — The browser uploads the file directly to the storage provider
   using the signed URL. This bypasses the Vercel/serverless function limit.

3. **POST /api/v1/files/confirm-upload** — The frontend confirms the upload to the backend
   with metadata (file name, size, storage path, workspace/project/task context). The backend
   stores the file reference in the database and makes it available through Nexus APIs.

### Error Handling
- If the file size exceeds `maxSizeBytes`, the backend returns `400` with
  `{ error: { code: 'FILE_TOO_LARGE', message: 'File exceeds maximum size' } }`.
- If the signed URL expires before the upload completes, the browser should retry
  by calling `GET /api/v1/files/upload-url` again.
- If the confirm-upload fails (e.g., file already exists, permissions denied), the
  backend returns an appropriate error and the UI should surface it to the user.

### Backend Endpoints Required

| Method | Path | Auth | Request Body | Response |
|--------|------|--------|--------------|----------|
| GET | `/api/v1/files/upload-url` | authenticated | `{ workspaceId, projectId?, taskId?, fileName, maxSizeBytes? }` | `{ uploadUrl, storagePath, expiresAt, maxSizeBytes }` |
| POST | `/api/v1/files/confirm-upload` | authenticated | `{ workspaceId, projectId?, taskId?, storagePath, fileName, sizeBytes, etag? }` | `{ ok: true, file: FileSummary }` |

### Mimetype Validation
The backend must validate the uploaded file's MIME type against an allowlist (e.g.,
images, documents, audio, video) and return a `403` for disallowed types.

### Storage Backend
The signed URLs should target the configured storage provider (e.g., AWS S3,
Google Cloud Storage, Azure Blob Storage). The frontend must not have direct
credentials; all URLs are generated and validated by the backend.

### Migration Path
If signed upload URLs are not yet implemented, the frontend must gracefully
degrade:

1. Keep the current `multipart/form-data` upload via the `/api/backend` proxy
2. Add a size limit check: if `file.size > 4_500_000` (4.5 MB), show a clear
   error message in the UI rather than attempting the upload
3. Once signed upload URLs are available, switch the upload flow to the new path

### UI Requirements
- When a user attempts to upload a file > 4.5 MB (or the backend-defined limit),
  display a clear inline error: `"File too large. Maximum size: X MB. Use signed upload."`
- If signed upload URLs are available, show a progress indicator for the direct
  PUT upload and a separate progress indicator for the confirm-upload step.
- If the upload fails at any step, surface the backend error message to the user.

## Migration Checklist
- [ ] Implement `GET /api/v1/files/upload-url` endpoint in the backend
- [ ] Implement `POST /api/v1/files/confirm-upload` endpoint in the backend
- [ ] Add MIME type validation on the backend
- [ ] Update `services/files.ts` to use the new upload flow
- [ ] Add UI feedback for size limits and upload progress
- [ ] Remove the 4.5 MB proxy limit once signed uploads are in production
- [ ] Update documentation and user guides
