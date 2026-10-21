# Nexus Frontend — Agent Instructions

## 1. Project Overview

Nexus is a real-time workspace and project management platform designed to help individuals and teams organize projects, manage tasks, communicate, collaborate, and improve productivity using AI.

The frontend is maintained in a repository separate from the backend.

The application must provide a polished, responsive, accessible and reliable experience across desktop, tablet and mobile devices.

## 2. Technology Stack

Use the following technologies:

- Next.js with the App Router.
- TypeScript for all application code.
- React.
- Tailwind CSS.
- REST APIs for backend communication.
- Socket.IO client for real-time events.
- A suitable audio/video calling SDK or WebRTC client.
- A backend AI API for AI-powered features.
- Redis must only be accessed through the backend, never directly from the browser.

Inspect the existing repository and follow its installed versions and established conventions. Do not replace working dependencies unnecessarily.

## 3. Repository Independence

The frontend and backend are separate repositories.

- Do not place backend implementation code in the frontend repository.
- Do not connect the browser directly to PostgreSQL or Redis.
- Use documented backend API contracts.
- Keep API URLs configurable through environment variables.
- Do not hardcode production URLs throughout the application.
- Coordinate API changes through explicit, documented contracts.
- Never assume an endpoint exists without checking the backend documentation or implementation.

Use `NEXT_PUBLIC_API_URL` for the public base URL of the backend HTTP API. Configure the Socket.IO server URL appropriately for the deployed environment.

Only expose public configuration through `NEXT_PUBLIC_` variables. Never expose AI API keys, database credentials, Redis credentials, private tokens or other server secrets.

## 4. Product Features

### A. Authentication and Onboarding

Implement the authentication flows supported by the backend:

- Registration and login.
- Logout and session management.
- Password recovery and reset.
- Email verification where supported.
- Workspace onboarding and invitations.
- Protected routes and authenticated layouts.
- Appropriate loading, error and expired-session states.

Follow the backend's actual authentication design. Do not independently invent token storage or session behavior.

### B. Workspaces, Teams and Projects

Support:

- Workspace creation and management.
- Workspace switching.
- Member invitations and membership management.
- Team creation and organization.
- Project creation, editing and archiving.
- Project privacy and role-based access.
- Project overviews and activity feeds.

Support the defined roles: Owner, Project Manager, Member, Viewer and Collaborator, subject to the final backend permission model.

Hide unavailable actions in the interface, but always rely on backend authorization for security.

### C. Task Management

Build a complete task-management experience:

- Kanban boards and task lists.
- Task details and editing.
- Assignees, priorities and due dates.
- Subtasks, dependencies and attachments.
- Task comments and activity history.
- Search, filtering and sorting.
- Progress indicators and project summaries.
- Responsive drag-and-drop where appropriate.

Preserve the task workflow:

ASSIGNED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED

Support CHANGES_REQUESTED as an appropriate workflow state.

Use backend-defined transitions and permissions. Do not calculate authoritative task progress differently from the backend.

### D. Connected Communication

Build communication features that connect directly to work.

Support, as the backend becomes available:

- Direct messages.
- Group conversations.
- Team and project channels.
- Real-time message delivery.
- Replies, threads, reactions and message editing.
- File attachments.
- Typing indicators and online presence.
- Read receipts and unread counts.
- @mentions and notifications.
- Message search and pinned messages.
- Task-linked discussions.
- Converting messages into tasks.
- Sharing project decisions and files in context.

Allow users to navigate from a message, notification or discussion directly to its associated task or project.

Use Socket.IO for real-time updates. Handle reconnection, duplicate events, optimistic updates and loading states carefully.

Persisted messages must come from the backend; do not treat client-side state as permanent storage.

### E. Audio and Video Calls

Integrate the selected calling provider or WebRTC implementation.

Support the features provided by the chosen infrastructure:

- One-to-one audio calls.
- One-to-one video calls.
- Group meetings.
- Incoming and outgoing call screens.
- Microphone and camera controls.
- Participant lists.
- Screen sharing where supported.
- Call invitations and meeting links.
- Call history and missed-call indicators.
- Meeting scheduling.
- Links between meetings, projects and conversations.

Provide clear permission prompts, connection states, device-selection controls where supported, and recovery from interrupted calls.

Do not attempt to transmit audio or video using ordinary Socket.IO messages. Use the dedicated media transport.

Never assume that a meeting is recorded. Display recording status and obtain appropriate consent when recording features are implemented.

### F. Notifications

Provide a centralized notification experience for:

- Task assignments and changes.
- Comments and mentions.
- Project and team invitations.
- Direct messages and relevant conversation activity.
- Incoming calls and meeting reminders.
- AI-generated summaries and completed background jobs.

Support unread counts, read states, notification preferences and navigation to the relevant resource where supported.

Use persistent backend notifications as the source of truth.

### G. AI-Powered Productivity

Build an AI assistant integrated with Nexus workflows rather than a disconnected chatbot.

Planned capabilities include:

1. AI task and project planning.
2. Task breakdown and suggested dependencies.
3. Project and workspace summaries.
4. Conversation summaries.
5. Meeting summaries and action items.
6. AI writing assistance.
7. Project progress analysis and blocker identification.
8. Suggested next actions.
9. Search and question answering over authorized workspace information.
10. Workflow automation with user approval.

The frontend should:

- Provide an AI assistant interface and relevant contextual entry points.
- Stream responses when supported by the backend.
- Display loading, failure, retry and usage-limit states.
- Render structured task plans and summaries clearly.
- Let users review suggested changes before applying them.
- Show links to supporting tasks or projects when provided.
- Clearly distinguish AI suggestions from confirmed application data.

Never call an AI provider directly from the browser using a secret API key. AI requests must go through the backend.

Do not allow AI suggestions to bypass permissions or silently modify, delete or assign records.

### H. Analytics and Insights

Support dashboards and visualizations for:

- Task completion.
- Project progress.
- Overdue work.
- Team workload.
- Upcoming deadlines.
- Activity trends.
- AI-generated insights.

Use backend data and documented aggregation endpoints. Do not invent metrics or show fabricated production data.

### I. File Management

Support file selection, upload progress, previews where appropriate, download and attachment management.

Use backend upload endpoints and the configured storage provider. Respect access permissions and file-size restrictions.

Do not expose private storage credentials or construct untrusted file URLs.

## 5. Design System

Use a modern, professional, consistent interface.

Core palette:

- Background: #F8FAFC
- Surface: #FFFFFF
- Secondary surface: #F1F5F9
- Primary text: #0F172A
- Secondary text: #64748B
- Borders: #E2E8F0
- Primary blue: #2563EB
- Success: #059669
- Error: #DC2626

Use consistent spacing, typography, buttons, inputs, cards, modals, dropdowns, navigation and notification components.

Provide:

- Responsive desktop and mobile layouts.
- Light and dark modes if included in the approved scope.
- Accessible keyboard navigation and focus indicators.
- Appropriate contrast and semantic HTML.
- Skeleton loaders, empty states and useful error messages.
- Subtle animations that respect reduced-motion preferences.
- Confirmation dialogs for destructive actions instead of browser alert dialogs.

Do not redesign unrelated screens or replace established styles without a clear reason.

## 6. Architecture and Code Quality

- Use TypeScript throughout the frontend.
- Prefer reusable components and clearly separated feature modules.
- Follow Next.js App Router conventions.
- Use Server Components by default when appropriate.
- Use Client Components only when interactivity or browser APIs require them.
- Centralize HTTP requests and error handling.
- Keep UI components separate from API and business-logic utilities.
- Validate forms and handle backend validation errors.
- Avoid duplicated business logic.
- Avoid `any` unless genuinely necessary and justified.
- Do not introduce unnecessary dependencies.

## 7. Security

- Never store server secrets in frontend code.
- Do not trust client-provided roles or permissions.
- Do not expose private workspace information in shared caches or URLs.
- Avoid rendering untrusted HTML without safe sanitization.
- Validate uploaded file types and sizes through the backend.
- Respect workspace boundaries and private conversation access.
- Avoid logging authentication tokens or private message content.
- Treat AI output as untrusted content and render it safely.

## 8. Environment and Configuration

Use environment variables for configurable service URLs and public application settings.

Preserve existing `.env` files. Never print or commit their secret values.

If an environment variable is missing, document the missing configuration without inventing credentials.

## 9. Development Workflow

Before making changes:

1. Inspect the repository structure and existing `agent.md`, `SKILL.md`, `package.json` and application configuration.
2. Identify existing features, components, routes and conventions.
3. Understand the requested change and its dependencies.
4. Inspect the relevant backend API contract.
5. Plan the smallest safe implementation.

During implementation:

- Preserve unrelated features.
- Avoid deleting or replacing existing configuration without approval.
- Keep changes scoped to the requested task.
- Add or update types, validation, loading states and error handling.
- Do not create fake API endpoints or pretend integrations work.

After implementation:

- Run the relevant linting, type checking, tests and production build when available.
- Fix issues introduced by the changes.
- Document required environment variables and backend dependencies.
- Report what changed, what was tested and what remains incomplete.

## 10. Definition of Done

A feature is complete only when:

- The UI is implemented and responsive.
- It integrates with the documented backend contract.
- Authentication and permissions are respected.
- Loading, empty, success and error states are handled.
- Type checking and relevant tests pass.
- No secrets have been exposed.
- Existing unrelated features remain intact.
- Any missing backend functionality or external configuration is documented.

Build Nexus incrementally. Prioritize reliable core workflows before advanced AI automation and complex real-time features.