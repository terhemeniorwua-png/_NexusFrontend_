# Nexus Frontend — Development Conventions

> **Status:** Agreed in Phase 0. All subsequent phases must follow these conventions.
> **Last updated:** Phase 0 (2026-10-23)

---

## 1. Folder Structure

The repository uses `app/` at the **repository root** (not `src/app/`). The `@/*` TypeScript path alias resolves to the **repository root**.

```text
__NextFrontend__/           ← repository root
├── app/                    ← Next.js App Router (all routes live here)
│   ├── (public)/           ← unauthenticated routes (landing, login, register, etc.)
│   │   ├── layout.tsx
│   │   ├── page.tsx                  ← landing page
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (auth)/             ← authenticated routes (require valid session)
│   │   ├── layout.tsx                ← auth shell: mounts AuthProvider guard
│   │   ├── dashboard/page.tsx
│   │   ├── workspace/
│   │   │   └── [workspaceId]/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx          ← workspace overview
│   │   │       ├── projects/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [projectId]/
│   │   │       │       ├── page.tsx  ← project overview
│   │   │       │       ├── tasks/
│   │   │       │       │   ├── page.tsx
│   │   │       │       │   └── [taskId]/page.tsx
│   │   │       │       ├── board/page.tsx
│   │   │       │       ├── documents/
│   │   │       │       │   ├── page.tsx
│   │   │       │       │   └── [documentId]/page.tsx
│   │   │       │       └── settings/page.tsx
│   │   │       ├── messages/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [conversationId]/page.tsx
│   │   │       ├── members/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── search/page.tsx
│   ├── layout.tsx          ← root layout (fonts, global CSS)
│   ├── globals.css         ← Tailwind imports + Nexus design tokens
│   ├── not-found.tsx
│   ├── error.tsx
│   └── loading.tsx
│
├── components/             ← reusable UI components (no business logic)
│   ├── ui/                 ← primitive components: Button, Input, Modal, Badge, etc.
│   ├── layout/             ← shell components: TopNav, Sidebar, MobileNav, PageHeader
│   └── shared/             ← cross-feature shared components (UserPicker, FileUpload)
│
├── features/               ← domain-specific UI and feature logic
│   ├── auth/
│   ├── workspaces/
│   ├── teams/
│   ├── projects/
│   ├── tasks/
│   ├── documents/
│   ├── messaging/
│   ├── notifications/
│   ├── meetings/
│   └── ai-assistant/
│
├── hooks/                  ← reusable React hooks (useAuth, useWorkspace, useSocket, …)
├── lib/                    ← shared utilities and clients
│   ├── api.ts              ← typed fetch wrapper (Phase 3)
│   ├── routes.ts           ← typed route constants (Phase 2)
│   └── socket.ts           ← Socket.IO singleton (Phase 9)
├── providers/              ← application-wide React context providers
│   ├── AuthProvider.tsx    ← Phase 3
│   ├── WorkspaceProvider.tsx ← Phase 4
│   └── SocketProvider.tsx  ← Phase 9
├── services/               ← API call functions, one file per domain
│   ├── auth.ts
│   ├── workspaces.ts
│   ├── teams.ts
│   ├── members.ts
│   ├── projects.ts
│   ├── tasks.ts
│   ├── documents.ts
│   ├── messages.ts
│   ├── notifications.ts
│   ├── meetings.ts
│   ├── ai.ts
│   ├── search.ts
│   ├── activity.ts
│   └── analytics.ts
└── types/                  ← shared TypeScript interfaces and types
    ├── api.ts              ← ApiResponse<T>, PaginatedResponse<T>, ApiError
    ├── ui.ts               ← component prop types, variant enums
    ├── auth.ts
    ├── workspace.ts
    ├── project.ts
    ├── tasks.ts
    ├── documents.ts
    ├── messages.ts
    ├── notifications.ts
    ├── meetings.ts
    └── ai.ts
```

### Rules
- Do **not** create a `src/` directory. All code lives at the repository root level.
- Adapt the structure to the existing repository — do not move existing files to match this layout.
- Use the `@/*` alias (resolves to repo root) for all imports. No relative `../../` paths across directory boundaries.
- Page components in `app/` are Server Components by default. Add `'use client'` only when required.

---

## 2. API Client Approach

**Decision: typed fetch wrapper in `lib/api.ts`** — a thin, centralized function that wraps the native `fetch` API.

### Rationale
- No additional runtime dependency.
- Full TypeScript generics support.
- Single place to configure base URL, credentials, and error normalization.
- Service modules in `services/` call `request<T>()` and return typed results.

### Pattern

```typescript
// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...init,
    credentials: 'include',           // HttpOnly cookie auth
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}
```

### Rules
- **No raw `fetch` calls in UI components.** All HTTP calls go through `services/*` modules.
- Every service function has explicit TypeScript return types.
- `lib/api.ts` owns error normalization — it throws a typed `ApiError` object.
- `401` responses trigger the session expiry handler. `403` surfaces an access-denied state. `422` extracts field-level errors.
- Never log the `Authorization` header value or any token.

---

## 3. Authentication Token Storage

**Decision: HttpOnly cookies, managed by the backend.**

### Rationale
- HttpOnly cookies are not accessible to JavaScript — they do not appear in `localStorage`, `sessionStorage`, or `document.cookie` in a form readable by client-side code.
- This is the most XSS-resistant strategy for session tokens.
- Explicitly preferred by `AGENTS.md` §4.A and the `nexus-frontend/SKILL.md` §10.

### Contract
- The backend sets the session cookie on login and clears it on logout.
- The frontend passes `credentials: 'include'` in every `fetch` call via `lib/api.ts`.
- The frontend does **not** read, store, or transmit the cookie value.
- `lib/api.ts` intercepts `401 Unauthorized` responses from any endpoint and triggers the session-expiry flow: clear `AuthProvider` state → redirect to `/login?redirect=<current-path>`.

### What the frontend does NOT do
- Does not store tokens in `localStorage` or `sessionStorage`.
- Does not store tokens in React state or React context.
- Does not log tokens, session IDs, or any part of the `Set-Cookie` header.

### Confirmation required
The exact cookie name, `SameSite` attribute, `Secure` flag, and domain configuration must be confirmed with the backend team before Phase 3 implementation. If the backend uses a token-based approach (e.g., `Authorization: Bearer <token>`) instead of cookies, this convention must be updated to match.

---

## 4. Form Validation Library

**Decision: [Zod](https://zod.dev/) for schema validation, used standalone without a form-binding library initially.**

### Rationale
- Zod produces TypeScript types from schemas automatically — no duplication.
- Lightweight, zero runtime dependencies.
- Works with any form setup (controlled components, uncontrolled, or a form library).
- Can be used server-side and client-side.
- Widely adopted in the Next.js ecosystem.

### Usage pattern
Define schemas in `types/` or co-located with the feature:
```typescript
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;
```

### Installation (Phase 1)
```bash
npm install zod
```

**Do not install Zod before Phase 1 begins.** This decision is recorded here so Phase 1 can proceed without re-discussing it.

---

## 5. Test Framework

**Decision: [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) + [@testing-library/jest-dom](https://github.com/testing-library/jest-dom)**

### Rationale
- Vitest is designed for Vite-based and modern ESM projects; it works well with Next.js 13+ and TypeScript without complex Babel/Jest configuration.
- `@testing-library/react` provides accessible, behavior-focused component testing.
- `@testing-library/jest-dom` provides readable DOM assertions.
- Faster than Jest for this stack, and the API is largely compatible.

### Installation (Phase 1)
```bash
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Add to `package.json` scripts:
```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Do not install the test framework before Phase 1 begins.** This decision is recorded here so Phase 1 can proceed without re-discussing it.

---

## 6. Drag-and-Drop Library (Phase 6)

**Decision: [@dnd-kit/core](https://dndkit.com/) + `@dnd-kit/sortable`**

### Rationale
- Purpose-built for React; works with Server Components architecture.
- Fully keyboard-accessible out of the box (required by `AGENTS.md` §7 and Phase 6 acceptance criteria).
- No reliance on deprecated HTML5 drag-and-drop API.
- Headless — styling remains entirely in our control.
- Actively maintained.

### Installation (Phase 6, after team confirmation)
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Do not install before Phase 6 begins.** Library choice must be confirmed by the team before installation.

---

## 7. Document Editor Library (Phase 7)

**Decision: deferred — pending backend document content format confirmation.**

`PHASES.md` Phase 7 notes that the editor library selection is **BLOCKED** until the backend confirms whether document content is stored as JSON blocks, Markdown, or HTML. Candidate options (to evaluate when unblocked):

- **[Tiptap](https://tiptap.dev/)** — ProseMirror-based, rich feature set, good React integration.
- **[Plate](https://platejs.org/)** — Slate-based, highly composable.

This decision must be made before Phase 7 begins.

---

## 8. Calling SDK (Phase 10)

**Decision: deferred — pending team selection of audio/video provider.**

`PHASES.md` Phase 10 requires the calling provider to be confirmed before implementation. Candidate options: Daily.co, Agora, LiveKit, or native WebRTC. This decision must be made before Phase 10 begins.

---

## 9. State Management

**Decision: React built-ins only (useState, useContext, useReducer) — no global state library.**

### Rationale
- The codebase is a clean slate with no existing state library.
- React context is sufficient for authentication state (`AuthProvider`) and workspace context (`WorkspaceProvider`).
- Server state (projects, tasks, messages) lives in local component state fetched from the backend, invalidated after mutations.
- No evidence yet that a global store is required.

### Rules
- Do not introduce Zustand, Redux, Jotai, or similar libraries without a demonstrated need.
- If a state library becomes necessary in a later phase, document the justification before installing it.

---

## 10. Commit Message Convention

Format: `type(scope): concise description`

| Type | Use |
|---|---|
| `feat` | New feature or user-visible behavior |
| `fix` | Bug fix |
| `chore` | Tooling, config, dependency, or build changes |
| `docs` | Documentation-only changes |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `style` | Formatting, whitespace (no logic change) |

Scope: use `phase-N` where N is the phase number (e.g., `phase-0`, `phase-3`).

Examples:
```
feat(phase-3): implement login form with validation
fix(phase-5): handle empty project list correctly
chore(phase-0): add .env.example with placeholder values
docs(phase-0): record conventions in CONVENTIONS.md
test(phase-1): add unit tests for Button component
```

---

## 11. TypeScript Rules

- Strict mode is enabled in `tsconfig.json` (`"strict": true`). Keep it enabled.
- No `any` unless genuinely unavoidable; document why when used.
- All component props must have explicit interfaces or types.
- All API request and response shapes must have explicit types in `types/`.
- Use `import type` for type-only imports.
- Model explicit loading/success/error/empty states rather than using a single nullable field.

---

## 12. Code Style Rules

- No `window.alert()` or `window.confirm()` — use `ConfirmDialog` from `components/ui/`.
- No hardcoded URLs — use `NEXT_PUBLIC_API_URL` via `lib/api.ts`.
- No hardcoded route strings — use `lib/routes.ts` constants.
- No inline styles — use Tailwind utilities.
- `'use client'` only where genuinely required (event handlers, effects, browser APIs).
- Server Components by default for all page and layout components.
