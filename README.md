# Nexus Frontend

**Nexus — Real-Time Workspace & Project Management Platform**

Nexus is a modern workspace and project management platform designed to bring project planning, task tracking, team collaboration, document management, and communication into one connected workspace.

The Nexus frontend provides the user interface through which users manage workspaces, collaborate with teammates, track project progress, communicate around tasks, and access productivity features.

The frontend is maintained in a separate repository from the Nexus backend and integrates with backend services through REST APIs and real-time connections where supported.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Vision and Objectives](#vision-and-objectives)
3. [Core Features](#core-features)
4. [Technology Stack](#technology-stack)
5. [System Architecture](#system-architecture)
6. [Application Structure](#application-structure)
7. [User Roles and Permissions](#user-roles-and-permissions)
8. [Task Workflow](#task-workflow)
9. [Design System](#design-system)
10. [Getting Started](#getting-started)
11. [Environment Configuration](#environment-configuration)
12. [Backend Integration](#backend-integration)
13. [Real-Time Communication](#real-time-communication)
14. [State Management](#state-management)
15. [Security Considerations](#security-considerations)
16. [Development Guidelines](#development-guidelines)
17. [Testing and Quality Assurance](#testing-and-quality-assurance)
18. [Deployment](#deployment)
19. [Roadmap](#roadmap)
20. [Troubleshooting](#troubleshooting)
21. [Contributing](#contributing)
22. [License](#license)

---

## 1. Project Overview

Nexus is a collaborative digital workspace that connects projects, tasks, documents, and conversations so teams can manage their work without constantly switching between disconnected tools.

Instead of treating project management, communication, and documentation as separate activities, Nexus aims to connect them through shared context.

For example:

- A team member can open a task and discuss it in the context of that task.
- A project manager can assign work and track its progress.
- A teammate can receive notifications when assigned a task or mentioned in a conversation.
- A message can be converted into a task when the relevant functionality is available.
- Team members can access documents and decisions associated with their projects.
- Meetings and AI-assisted productivity features can support planning and follow-up when the required integrations are available.

### Project identity

| Property | Description |
|---|---|
| Project name | Nexus |
| Product category | Workspace and project management |
| Frontend framework | Next.js |
| Routing | Next.js App Router |
| Language | TypeScript |
| UI library | React |
| Styling | Tailwind CSS |
| Backend | Separate repository |
| API communication | REST |
| Real-time communication | Socket.IO, where supported |
| Primary objective | Connected, collaborative work management |

## 2. Vision and Objectives

### Vision

To provide a unified digital workspace where teams can organize projects, coordinate tasks, communicate effectively, and maintain shared knowledge in one connected environment.

### Objectives

- Simplify project and task management.
- Improve team visibility into work progress.
- Connect conversations directly to tasks and projects.
- Support collaboration across different teams and workspaces.
- Provide real-time updates where supported.
- Establish consistent permission-aware experiences.
- Reduce repetitive administrative work through automation and AI-assisted features.
- Deliver a responsive and accessible interface across devices.

## 3. Core Features

The features below describe the intended platform scope. Their implementation and availability depend on the current codebase, backend contracts, and completed development phases.

### 3.1 Authentication and User Accounts

The frontend should support the authentication flows defined by the backend:

- User registration and login.
- Session restoration.
- Logout.
- Protected application routes.
- Profile management.
- Session expiration and reauthentication.
- Clear validation and authentication error messages.

Authentication mechanisms must match the backend's actual implementation.

### 3.2 Workspaces and Teams

Workspaces provide an organizational boundary for team collaboration.

Expected capabilities include:

- Viewing and switching between accessible workspaces.
- Managing workspace details where permitted.
- Viewing teams and members.
- Inviting members where supported.
- Displaying membership and invitation status.
- Managing roles and permissions according to the backend contract.
- Showing appropriate empty and access-denied states.

### 3.3 Project Management

Projects organize related tasks, people, documents, and conversations.

Expected capabilities include:

- Project listing and overview.
- Creating and editing projects.
- Viewing project details.
- Managing project membership.
- Displaying project privacy and access information.
- Searching, filtering, and sorting projects.
- Displaying project progress using backend-defined calculations.
- Accessing project-specific tasks and conversations.

### 3.4 Task Management

Tasks represent work assigned to individuals or teams.

Expected capabilities include:

- Creating and editing tasks.
- Assigning tasks to team members.
- Setting task priorities and due dates.
- Viewing task descriptions and details.
- Tracking task status.
- Adding comments and viewing activity history where supported.
- Filtering and searching tasks.
- Submitting work for review.
- Approving work or requesting changes.
- Displaying task progress and overdue indicators.

### 3.5 Kanban Boards

Kanban boards provide a visual representation of task progress.

Expected capabilities include:

- Displaying tasks in status-based columns.
- Moving tasks between permitted workflow states.
- Viewing task summaries.
- Filtering boards by assignee, priority, or other supported fields.
- Opening task details without losing the user's context.
- Supporting responsive board navigation.
- Synchronizing board changes with the backend.

Drag-and-drop behavior must respect valid task transitions and user permissions.

### 3.6 Collaborative Documents

Documents provide a place for teams to store and maintain project knowledge.

Potential capabilities include:

- Document listing and navigation.
- Creating and editing documents.
- Organizing documents within permitted workspaces or projects.
- Saving document changes.
- Displaying save and error states.
- Preserving unsaved work.
- Handling concurrent editing when the underlying service supports it.

Real-time collaborative editing must not be assumed unless the necessary implementation exists.

### 3.7 Connected Communication

Communication is a central part of the Nexus experience.

Expected platform capabilities include:

- Team conversations.
- Project discussions.
- Direct messages.
- Task-specific conversations.
- Mentions using `@name`.
- Notifications for relevant communication and work updates.
- Sharing files where supported.
- Converting messages into tasks where supported.
- Connecting conversations to projects, tasks, and decisions.

The objective is to preserve the context of a discussion instead of separating communication from the work it concerns.

### 3.8 Real-Time Updates

Where supported by the backend, Socket.IO can deliver updates such as:

- Task assignments and status changes.
- New messages.
- Project activity.
- Mentions.
- Notifications.
- Other relevant workspace events.

The frontend must use the actual event names, payload structures, authentication rules, and room permissions defined by the backend.

### 3.9 Notifications

The notification experience may include:

- Task assignments.
- Comments and mentions.
- Project updates.
- Task status changes.
- Direct messages.
- Read and unread indicators.
- Navigation to the relevant resource.

Notifications must respect access permissions and avoid duplicate events.

### 3.10 Meetings and AI-Assisted Productivity

Subject to the implemented services and integrations, Nexus may support:

- Starting meetings from relevant workspaces or conversations.
- Meeting status and participation interfaces.
- AI-assisted summaries.
- Meeting action items.
- Productivity assistance.
- Work-related suggestions.

AI output must be clearly distinguished from verified project data, and unavailable integrations must be presented honestly.

## 4. Technology Stack

| Technology | Responsibility |
|---|---|
| Next.js | Application framework, routing, rendering, and layouts |
| React | Component-based user interface |
| TypeScript | Static typing and maintainability |
| Tailwind CSS | Utility-first styling and responsive layouts |
| REST APIs | Communication with the backend |
| Socket.IO client | Real-time updates when supported |
| Existing form library | Form state and validation, if configured |
| Existing state/data-fetching tools | Shared UI state, server state, and caching |
| Existing test framework | Component, unit, and integration testing |

The exact versions and additional dependencies must be taken from the repository's `package.json` and lockfile. This README does not require introducing new libraries.

## 5. System Architecture

Nexus uses a separated frontend and backend architecture.

```text
                    Nexus Frontend
                 Next.js + TypeScript
                           |
             +-------------+-------------+
             |                           |
         REST API                   Socket.IO
             |                           |
             +-------------+-------------+
                           |
                    Nexus Backend
                 Node.js + Express
                           |
             +-------------+-------------+
             |             |             |
         PostgreSQL      Redis      Integrations
          + Prisma                 Email / AI /
                                   Meetings
```

This is a conceptual architecture. Actual connections and integrations must be verified against the backend implementation.

### Frontend responsibilities

- Render pages and reusable components.
- Handle user interactions and client-side state.
- Validate inputs for usability.
- Communicate with backend endpoints.
- Present loading, success, empty, and error states.
- Maintain the real-time connection where required.
- Apply permission-aware UI behavior.
- Provide responsive and accessible experiences.

### Backend responsibilities

- Authenticate users and authorize requests.
- Enforce roles and resource permissions.
- Validate and process business operations.
- Persist data in the database.
- Manage server-side workflows and calculations.
- Publish real-time events where configured.
- Integrate external services.
- Enforce security and data integrity.

**Important:** Frontend route protection and hidden buttons are not security boundaries. The backend must independently authorize protected operations.

## 6. Application Structure

The following is a recommended organization, not a requirement to recreate the existing repository.

```text
nexusfrontend/
├── public/
│   ├── images/
│   ├── icons/
│   └── ...
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── messages/
│   │   ├── documents/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── shared/
│   ├── features/
│   │   ├── auth/
│   │   ├── workspaces/
│   │   ├── teams/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── documents/
│   │   ├── messaging/
│   │   ├── notifications/
│   │   └── meetings/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   ├── services/
│   └── types/
├── agent.md
├── PHASES.md
├── package.json
├── .env.example
├── .gitignore
├── next.config.ts
├── tsconfig.json
└── README.md
```

Adapt this structure to the actual repository. Do not move existing files simply to match this example.

### Main directory responsibilities

- `app/`: routes, layouts, page entry points, loading states, and error boundaries.
- `components/ui/`: reusable buttons, inputs, dialogs, badges, and other UI primitives.
- `components/layout/`: shared navigation and application layout components.
- `features/`: domain-specific UI and functionality.
- `hooks/`: reusable React hooks.
- `lib/`: shared utilities and configuration.
- `providers/`: application-wide context and provider components.
- `services/`: API communication and service clients.
- `types/`: reusable TypeScript types.

## 7. User Roles and Permissions

Nexus includes the following intended roles:

| Role | General responsibility |
|---|---|
| Owner | Workspace or project ownership and administration according to configured permissions |
| PM | Project planning and management |
| Member | Participation in permitted team and project activities |
| Viewer | Read-only access where configured |
| Collaborator | Access to specifically granted resources |

The exact permissions must be confirmed from the backend's authorization rules.

The frontend should:

- Display actions appropriate to the user's permissions.
- Hide or disable actions the user cannot perform.
- Handle `401 Unauthorized` and `403 Forbidden` responses.
- Avoid exposing restricted information in cached or rendered data.
- Never rely on client-side checks as a replacement for backend authorization.

## 8. Task Workflow

The established task workflow is:

```text
ASSIGNED
    |
    v
IN_PROGRESS
    |
    v
SUBMITTED
    |
    v
UNDER_REVIEW
    |
    v
APPROVED
```

`CHANGES_REQUESTED` is an additional state relevant to the review process.

The frontend should represent these states consistently across task cards, task details, project summaries, and activity views.

The backend determines which transitions are valid and which users can perform them. The frontend must use the actual workflow rules rather than allowing every transition indiscriminately.

## 9. Design System

Nexus uses a clean, modern interface with a light background, clear typography, subtle borders, and a blue primary action color.

### Color palette

| Token | Hex value | Purpose |
|---|---|---|
| Background | `#F8FAFC` | Main page background |
| Surface | `#FFFFFF` | Cards, panels, dialogs |
| Secondary surface | `#F1F5F9` | Secondary sections and subtle backgrounds |
| Primary text | `#0F172A` | Headings and important content |
| Secondary text | `#64748B` | Supporting text and metadata |
| Border | `#E2E8F0` | Dividers and component boundaries |
| Primary action | `#2563EB` | Primary buttons and active states |
| Success | `#059669` | Success indicators |
| Error | `#DC2626` | Errors and destructive states |

### Design principles

- Maintain consistent spacing and typography.
- Use reusable UI components.
- Provide clear visual hierarchy.
- Keep primary actions obvious.
- Make task states distinguishable without relying on color alone.
- Use consistent icons, borders, and corner radii.
- Provide keyboard focus indicators.
- Support reduced-motion preferences.
- Ensure layouts work across mobile, tablet, and desktop.

Avoid redesigning unrelated features when making focused changes.

## 10. Getting Started

### Prerequisites

Install the following on your development machine:

- Node.js version compatible with the repository.
- npm, pnpm, Yarn, or the package manager indicated by the lockfile.
- Git.
- Access to the Nexus frontend repository.
- Access to a running Nexus backend for real API integration.

### Clone the repository

Replace the placeholder with your actual frontend repository URL.

```bash
git clone <NEXUS_FRONTEND_REPOSITORY_URL>
cd nexusfrontend
```

### Install dependencies

Use the package manager corresponding to the existing lockfile.

For npm:

```bash
npm install
```

If the project uses pnpm, Yarn, or another package manager, use its corresponding install command instead. Avoid mixing package managers or generating competing lockfiles.

### Configure environment variables

Create `.env.local` using the variables required by the existing application. See [Environment Configuration](#11-environment-configuration).

Do not overwrite an existing environment file.

### Start the development server

For a project using the standard Next.js scripts:

```bash
npm run dev
```

Open the local URL printed by the development server, commonly `http://localhost:3000`.

### Build for production

```bash
npm run build
```

### Start the production server locally

```bash
npm run start
```

The production start command normally requires a successful build first.

Confirm the actual commands in `package.json` before using or documenting them as project-specific scripts.

## 11. Environment Configuration

Next.js loads environment variables from supported `.env*` files. Variables prefixed with `NEXT_PUBLIC_` can be exposed to browser code, so never place secrets in them. <Cite refs={["turn838485search0","turn838485search1"]}/>

### Example `.env.example`

```dotenv
# Nexus backend REST API base URL
NEXT_PUBLIC_API_URL=http://localhost:5100/api

# Nexus Socket.IO server URL
NEXT_PUBLIC_SOCKET_URL=http://localhost:5100
```

These are example names and local development values. Verify that they match the actual frontend service configuration and backend deployment.

Copy the example to `.env.local` and adjust the values for your environment.

```bash
cp .env.example .env.local
```

Run this command only if `.env.example` exists and you have confirmed that copying it will not overwrite an existing `.env.local`.

### Environment variable guidelines

- Keep `.env.local` out of version control.
- Commit `.env.example` with placeholders and non-sensitive defaults.
- Never place database credentials, private API keys, JWT secrets, or service credentials in `NEXT_PUBLIC_` variables.
- Configure production environment variables through the hosting platform.
- Verify whether public variables are evaluated at build time for your deployment setup.
- Avoid hardcoding backend URLs in application components.

## 12. Backend Integration

The frontend communicates with the separate Nexus backend through REST APIs and, where supported, Socket.IO.

### API integration principles

- Use a shared API client or the repository's existing request utilities.
- Keep API calls out of presentation components when separation improves maintainability.
- Define TypeScript types for request payloads and response data.
- Match endpoint paths and response shapes to the actual backend implementation.
- Handle loading, empty, success, validation, authorization, and server-error states.
- Apply the existing authentication strategy consistently.
- Refresh or invalidate relevant data after successful mutations.
- Avoid duplicate requests and stale state.
- Never fabricate successful responses when an API call fails.

### Backend dependency checklist

Before connecting a feature, verify:

- API endpoint and HTTP method.
- Request body and query parameters.
- Authentication requirements.
- Authorization rules.
- Response structure.
- Pagination and filtering behavior.
- Validation and error response formats.
- Real-time event contracts, if applicable.

If an endpoint or event is not implemented, record it as a backend dependency instead of assuming it exists.

## 13. Real-Time Communication

Socket.IO may support real-time messaging, task updates, notifications, and other workspace events.

The frontend should:

1. Use the configured Socket.IO endpoint.
2. Authenticate according to the backend's actual requirements.
3. Subscribe only to documented events and permitted channels.
4. Clean up event listeners when components unmount.
5. Prevent duplicate event subscriptions.
6. Handle connection failures and reconnection.
7. Reconcile events with the application's data-fetching and caching strategy.
8. Respect workspace, project, and conversation permissions.

Do not invent event names, payloads, room names, or authentication formats. These must match the backend contract.

## 14. State Management

Choose the state management strategy already established in the repository.

Use local React state for isolated UI interactions and shared state where multiple parts of the application genuinely need it.

Distinguish between:

- UI state: dialogs, tabs, selected views, and open menus.
- Server state: projects, tasks, messages, documents, and notifications retrieved from the backend.
- Authentication state: the current user and session status.
- Real-time state: events and updates received from connected services.

Avoid storing the same server data in multiple competing locations. Ensure mutations and incoming events update or invalidate the relevant data consistently.

## 15. Security Considerations

Security responsibilities include:

- Following the backend's authentication contract.
- Protecting authenticated user experiences.
- Handling expired sessions and unauthorized requests.
- Avoiding sensitive credentials in browser storage and logs.
- Preventing secrets from entering browser bundles.
- Treating API responses and user-generated content as untrusted.
- Rendering user content safely.
- Respecting workspace and project permissions.
- Avoiding exposure of private information in URLs or shared client-side state.
- Ensuring destructive actions have appropriate safeguards.

Frontend checks improve the user experience but do not replace backend authorization.

## 16. Development Guidelines

### General rules

- Use TypeScript consistently.
- Follow the Next.js App Router conventions.
- Prefer Server Components when client-side interactivity is unnecessary.
- Use `"use client"` only where required.
- Reuse existing components and utilities.
- Keep components focused and maintainable.
- Avoid unnecessary dependencies.
- Preserve existing working functionality.
- Do not modify unrelated features without justification.
- Avoid browser `alert()` for ordinary application feedback.
- Use appropriate dialogs, inline errors, and notification components.
- Follow the existing formatting, linting, and naming conventions.

### Project documentation

The repository may contain:

- `agent.md`: general project-specific development instructions.
- `nexus-frontend/SKILL.md`: frontend-specific engineering standards.
- `PHASES.md`: implementation roadmap and progress.

Read these files before implementing significant changes. Keep the roadmap accurate and mark phases complete only after verifying their acceptance criteria.

## 17. Testing and Quality Assurance

Testing must use the tools configured in the repository.

### Recommended validation areas

| Area | Validation |
|---|---|
| Type safety | Run the configured TypeScript check |
| Code quality | Run the configured lint command |
| UI components | Test important component behavior |
| Authentication | Test login, logout, and protected routes |
| Permissions | Verify role-sensitive actions |
| API integration | Verify success, loading, and failure states |
| Task workflows | Test valid transitions and error handling |
| Messaging | Test sending, receiving, and connection failure states |
| Notifications | Verify read/unread behavior and duplicate prevention |
| Accessibility | Check keyboard use, labels, focus, and contrast |
| Responsive design | Test supported viewport sizes |
| Production readiness | Run the configured production build |

### Example commands

The following commands are common in Next.js projects, but use them only if the corresponding scripts exist in `package.json`.

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Run tests using the actual test script configured in the repository.

A successful build alone does not prove that all user journeys or backend integrations work correctly.

## 18. Deployment

Deploy the frontend independently of the backend.

### Deployment checklist

- Confirm the production build succeeds.
- Configure the correct backend REST API URL.
- Configure the correct Socket.IO URL if real-time features are enabled.
- Configure production environment variables in the hosting platform.
- Verify authentication and session behavior in production.
- Confirm required cross-origin settings are compatible with the backend.
- Verify navigation, protected routes, and error handling.
- Test critical user journeys.
- Confirm that no secrets are exposed in browser assets.
- Document known issues and any missing backend dependencies.

The exact deployment steps depend on the hosting platform and repository configuration. Do not assume that local environment variables automatically configure the production deployment.

## 19. Roadmap

The frontend implementation roadmap is maintained in `PHASES.md`.

The intended development sequence is:

1. Repository audit and foundation.
2. Design system and reusable components.
3. Routing and application shell.
4. Authentication and user profiles.
5. Workspaces, teams, members, and roles.
6. Projects and project management.
7. Tasks and Kanban boards.
8. Documents and collaborative content.
9. Messaging and contextual communication.
10. Real-time updates and notifications.
11. Meetings and AI-assisted productivity.
12. Cross-feature integration.
13. Accessibility and responsive validation.
14. Testing, security, and reliability.
15. Production configuration and deployment.
16. Final acceptance and handover.

This sequence is a planning outline. Check `PHASES.md` for the authoritative phase definitions, dependencies, and completion status.

## 20. Troubleshooting

### Frontend cannot reach the backend

- Confirm the backend is running.
- Verify the configured API URL.
- Check network errors in the browser developer tools.
- Confirm backend CORS settings.
- Verify the requested endpoint exists.
- Check whether the endpoint requires authentication.

### Authentication does not persist

- Verify the backend authentication contract.
- Inspect cookie and session configuration.
- Check browser cookie restrictions and secure-cookie settings.
- Confirm that protected routes handle session restoration correctly.
- Avoid logging tokens or session secrets while debugging.

### Real-time events are not received

- Confirm the Socket.IO server is running and reachable.
- Verify the configured connection URL.
- Check the required authentication handshake.
- Confirm event names and payloads against the backend contract.
- Inspect connection errors and server logs.
- Verify that the user has access to the relevant room or channel.

### TypeScript or build failures

- Read the complete error output.
- Inspect the affected types and imports.
- Verify dependency compatibility.
- Check whether the failure existed before the latest change.
- Fix the underlying issue rather than suppressing errors indiscriminately.

### Environment variables are not applied

- Confirm the variable name is correct.
- Verify that the variable is defined in the appropriate environment.
- Restart the development server after changing local environment files.
- Rebuild where required for public variables.
- Confirm production environment variables are configured in the hosting platform.

## 21. Contributing

When contributing to Nexus frontend development:

1. Read the project instructions and relevant roadmap phase.
2. Inspect the existing implementation before editing.
3. Keep changes focused on the requested feature.
4. Follow established UI and TypeScript conventions.
5. Preserve existing functionality and local configuration.
6. Test relevant behavior.
7. Document any backend dependencies or incomplete integrations.
8. Update project documentation when architecture or workflows change.
9. Report the files changed, checks performed, and remaining issues.

Do not mark work complete without verifying the relevant acceptance criteria.

## 22. License

Add the project's actual license information here once it has been selected and documented in the repository.

Until then, do not assume that Nexus is distributed under a particular open-source license.

---

**Nexus — One connected workspace for projects, people, and progress.**
