# Nexus Frontend — Architecture Reference

## Repository Structure

```text
__NextFrontend__/
├── app/                      # Next.js App Router routes (repo root, NOT src/)
│   ├── (public)/             # Unauthenticated routes
│   │   ├── page.tsx          # Landing page
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (auth)/               # Authenticated routes
│   │   ├── layout.tsx        # Auth shell: SocketProvider, AuthProvider guard
│   │   ├── dashboard/page.tsx
│   │   ├── workspace/
│   │   │   └── [workspaceId]/
│   │   │       ├── page.tsx          # Workspace overview
│   │   │       ├── projects/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [projectId]/
│   │   │       │       ├── page.tsx       # Project overview
│   │   │       │       ├── tasks/page.tsx
│   │   │       │       ├── board/page.tsx
│   │   │       │       ├── documents/page.tsx
│   │   │       │       └── settings/page.tsx
│   │   │       ├── messages/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [conversationId]/page.tsx
│   │   │       ├── members/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── search/page.tsx     # Global search (Phase 11)
│   ├── layout.tsx            # Root layout
│   ├── globals.css
│   ├── not-found.tsx
│   ├── error.tsx
│   └── loading.tsx
├── components/
│   ├── ui/                   # Reusable primitives (Phase 1)
│   ├── layout/               # TopNav, Sidebar, MobileNav, PageHeader (Phase 2)
│   └── shared/               # Cross-feature shared components
├── features/               # Domain-specific UI and logic
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
├── hooks/                  # Reusable React hooks
├── lib/                    # Shared utilities and configuration
│   ├── api.ts                # Typed fetch wrapper (Phase 3)
│   ├── routes.ts             # Typed route constants (Phase 2)
│   └── socket.ts             # Socket.IO singleton (Phase 9)
├── providers/              # React context providers
│   ├── AuthProvider.tsx      # Phase 3
│   ├── WorkspaceProvider.tsx # Phase 4
│   └── SocketProvider.tsx    # Phase 9
├── services/               # API communication
├── types/                  # Shared TypeScript types
│   ├── api.ts                # ApiResponse, PaginatedResponse, ApiError
│   ├── ui.ts                 # Component prop types, variants
│   ├── auth.ts               # User, SessionState
│   ├── workspace.ts          # Workspace, Team, Member, Role, Invitation
│   ├── project.ts            # Project, ProjectMember, ProjectStatus
│   ├── tasks.ts              # Task, TaskStatus, Comment, Attachment, ActivityEntry
│   ├── documents.ts          # Document, SaveState
│   ├── messages.ts           # Conversation, Message, Reaction
│   ├── notifications.ts      # Notification, NotificationType
│   ├── meetings.ts           # Meeting, MeetingParticipant
│   └── ai.ts                 # AIRequest, AIResponse, AITaskPlan
├── AGENTS.md               # Primary instruction file
├── PHASES.md               # Implementation roadmap
├── README.md
├── nexus-frontend/SKILL.md # Legacy skill reference
├── .env.example
├── package.json
├── next.config.ts
├── tsconfig.json
└── eslint.config.mjs
```

## Path Alias

`@/*` resolves to the **repository root**, not `src/`. Defined in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

Use `@/components/ui/Button` not `../../components/ui/Button`.

## Module Responsibilities

| Directory | Responsibility |
|---|---|
| `app/` | Routes, layouts, loading states, error boundaries, page entry points |
| `components/ui/` | Reusable primitives: Button, Input, Modal, Badge, Avatar, etc. |
| `components/layout/` | TopNav, Sidebar, WorkspaceSwitcher, MobileNav, PageHeader |
| `components/shared/` | Cross-feature components (e.g., UserPicker, FileUpload) |
| `features/` | Domain-specific UI, forms, and feature logic |
| `hooks/` | Reusable React hooks (useAuth, useWorkspace, usePermissions, useSocket) |
| `lib/` | API client, route constants, socket client, shared utilities |
| `providers/` | Application-wide React context providers |
| `services/` | API call functions, organized by domain |
| `types/` | Shared TypeScript interfaces and types |

## App Router Conventions

- Route groups `(public)` and `(auth)` organize routes without affecting URL paths.
- `layout.tsx` at the `(auth)` level wraps all authenticated pages with `AuthProvider`, `WorkspaceProvider`, and `SocketProvider`.
- `loading.tsx`, `error.tsx`, and `not-found.tsx` at appropriate levels.
- Server Components by default; `'use client'` only where required.
- `lib/routes.ts` provides typed constants for all paths — no hardcoded strings in navigation.

## System Architecture

```text
Nexus Frontend (Next.js + TypeScript)
         |
  +------+------+
  |             |
REST API    Socket.IO
  |             |
  +------+------+
         |
Nexus Backend (Node.js + Express)
         |
  +------+------+------+
  |             |      |
PostgreSQL   Redis  Integrations
                    (Email / AI / Meetings)
```

The frontend never connects directly to PostgreSQL or Redis. All data access uses the backend REST API or Socket.IO gateway.
