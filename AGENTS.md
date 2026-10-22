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

## Git Workflow and Phase Delivery Rules

These rules are mandatory whenever implementing a phase, feature, bug fix, or other substantial task in this repository.

### 1. Create a Dedicated Branch for Every Phase

Before implementing a phase:

1. Inspect the current Git branch, working tree, configured remotes, and existing changes.
2. Read `PHASES.md` and identify the phase being implemented.
3. Create a dedicated feature branch for that phase from the appropriate base branch.
4. Use the repository's established branch naming convention. If none exists, use:

   `feature/phase-<number>-<short-description>`

   Example: `feature/phase-5-workspace-membership`

5. Keep all commits for that phase on its dedicated branch.
6. Do not implement phase work directly on `main`, `master`, or another protected base branch.

Use one branch per phase, not one branch per implementation chunk.

If the current branch already contains phase work, inspect it before creating another branch. Reuse the appropriate existing phase branch when continuing the same phase.

### 2. Protect Existing User Changes

Before switching branches or modifying files:

- Run `git status` and inspect existing changes.
- Never discard, overwrite, reset, or commit unrelated user changes without authorization.
- Do not use destructive commands such as `git reset --hard`, `git clean -fd`, or forced branch replacement to make the working tree clean.
- Preserve existing application functionality, configuration, and documentation.
- Never commit `.env`, `.env.local`, credentials, API keys, private certificates, or other secrets.
- If uncommitted changes make branch creation unsafe, stop and explain the issue before proceeding.

### 3. Implement the Phase in Logical Chunks

Read `PHASES.md`, the relevant `SKILL.md` files, and the applicable project instructions before implementation.

Break the current phase into small, meaningful, independently verifiable chunks based on its actual requirements.

For each chunk:

1. Identify the requirement and expected outcome.
2. Inspect the existing implementation and its dependencies.
3. Implement the smallest coherent unit of work.
4. Run the relevant tests or validation checks.
5. Inspect the Git diff for errors, accidental changes, secrets, and unrelated modifications.
6. Stage only the files belonging to that chunk.
7. Create a descriptive commit.
8. Push the commit to the phase's remote branch.
9. Verify that the push succeeded.
10. Record the result before moving to the next chunk.

**Do not wait until the entire phase is complete before committing and pushing.** Push completed and verified chunks incrementally throughout the phase.

Combine very small related changes when appropriate, but keep each commit focused and easy to review.

### 4. Commit Message Convention

Use meaningful commit messages that describe the actual work completed.

Follow this format:

`type(scope): concise description`

Examples:

- `feat(phase-5): implement workspace membership`
- `feat(phase-5): add role-based authorization`
- `fix(phase-5): handle invalid membership requests`
- `test(phase-5): cover workspace permission rules`
- `docs(phase-5): document membership endpoints`
- `chore(phase-5): update phase progress tracker`

Choose the commit type according to the actual changes, including `feat`, `fix`, `test`, `refactor`, `docs`, or `chore`.

Do not use vague messages such as `update`, `changes`, `done`, or `phase completed`.

Never create a commit claiming functionality or verification that has not actually been completed.

### 5. Push Every Completed Chunk

After each successful chunk commit, push it to the dedicated phase branch.

For the first push, use the appropriate remote and branch:

`git push -u origin <phase-branch-name>`

For subsequent pushes, use:

`git push`

Adapt these commands to the repository's configured remote and branch names.

After each push:

- Confirm the command succeeded.
- Record the commit hash and commit message.
- Record whether the commit is available on the remote branch.
- Continue to the next chunk only after recording the push result.

If a push fails, investigate the cause and retry safely when possible. Never use `git push --force` to resolve a failure.

If authentication, network access, or remote configuration prevents pushing, retain the local commit when safe, report the blocker, and clearly identify all commits that remain unpushed.

Never claim that work has been pushed when it exists only locally.

### 6. Testing and Verification

Run the relevant checks for each chunk before committing it.

At the end of the phase, run the broader checks applicable to the changes, including tests, linting, type checking, builds, integration tests, and migration validation where relevant.

Use the existing package manager, scripts, and project conventions.

- Do not claim that a test passed unless it was actually executed successfully.
- Do not hide failed or skipped checks.
- Do not remove tests, disable validation, or weaken security controls just to obtain a passing result.
- If a check cannot run because of a missing service or environmental limitation, explain why.

### 7. Maintain the Phase Progress Tracker

Use the existing progress tracker specified in `PHASES.md` or the repository instructions. Do not create a duplicate tracker without a clear reason.

Update it as meaningful work is completed.

Record:

- Current phase and status.
- Completed implementation chunks.
- Remaining requirements and acceptance criteria.
- Tests and verification results.
- Commit hashes and commit messages.
- Push status for each relevant commit.
- Outstanding issues, blockers, and dependencies.

Keep progress information accurate. Do not mark a phase complete while required acceptance criteria remain unmet.

Commit and push tracker changes as a focused chunk when appropriate. Never mark work complete merely to make the tracker appear finished.

### 8. Strict Scope Control

Implement only the phase or task explicitly requested.

- Follow the order and acceptance criteria in `PHASES.md`.
- Preserve existing completed phases and integrate with them instead of rebuilding them.
- Do not begin the next phase without explicit authorization.
- Do not introduce unrelated refactors, dependency upgrades, or features from future phases.
- If a required dependency is incomplete, implement only the minimum safe integration permitted by the roadmap. Otherwise, document the blocker.
- If project instructions conflict, follow the most specific applicable instruction and report unresolved conflicts.

### 9. Final Delivery Report

At the end of each phase, report:

1. **Phase summary:** what was implemented and which acceptance criteria were satisfied.
2. **Branch:** base branch, phase branch name, and remote push status.
3. **Commits:** every phase commit, in chronological order, with its message, hash, and push status.
4. **Verification:** tests, linting, type checking, builds, and their actual results.
5. **Progress tracker:** file updated and current phase status.
6. **Outstanding issues:** failures, blockers, unpushed commits, and required manual steps.
7. **Next recommended phase:** identify it from `PHASES.md` without implementing it.

Report whether the working tree is clean. If unrelated pre-existing changes remain, distinguish them from the phase work.

### Mandatory Execution Sequence

For every phase:

**Inspect → create or identify the phase branch → implement a logical chunk → test → review the diff → commit → push → update progress → repeat.**

Before declaring the task complete, verify the final changes and report the actual Git and test status.

These rules apply to every coding agent working in this repository, including OpenCode and Kiro CLI. Each repository must manage its own branches, commits, remotes, and pushes independently.