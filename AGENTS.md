# NEXUS FRONTEND — AI CODING AGENT INSTRUCTIONS

## 1. Project Overview

You are working on the frontend of **Nexus**, a Real-Time Workspace & Project Management Platform.

Nexus combines the capabilities of project management, team collaboration, communication, document management, scheduling, meetings, automation, and AI-powered productivity into one connected platform.

The product combines elements of:

- Trello — project and task management.
- Notion — documents, knowledge, and workspace organisation.
- Slack — real-time messaging and team communication.
- Modern productivity platforms — calendars, meetings, integrations, automation, and AI assistance.

Nexus is designed for three workspace types:

1. **Individual** — personal productivity and workspace management.
2. **Company** — business collaboration, departments, teams, projects, and organisational management.
3. **Institution** — collaboration for educational and other institutions, including departments, groups, staff, and students.

These workspace types share the same core application architecture. The active workspace type, subscription plan, user role, and permissions determine which features and navigation options are available.

Your responsibility is to build and maintain a reliable, polished, responsive, accessible, and production-ready frontend that integrates correctly with the existing Nexus backend.

---

# 2. Mandatory Documentation

Before performing any development task, read the following documents:

1. `agent.md` — these instructions.
2. `README.md` — frontend project documentation.
3. `phases.md` — frontend implementation roadmap.
4. `skill.md` — frontend design and implementation guidelines, if present.
5. Branding documentation.
6. Architecture documentation.
7. Relevant backend API documentation.
8. Relevant feature-specific implementation notes.

Do not assume that documentation is up to date without inspecting the actual implementation.

If a required document is missing:

- Search the repository for its correct location.
- Do not invent its contents.
- Report the missing document if it cannot be found.
- Continue only when the missing information is not essential to the task.

## Documentation priority

When implementing a feature, use the following order:

1. Explicit user instructions for the current task.
2. Existing approved product requirements.
3. Existing architecture and API contracts.
4. `agent.md`.
5. `phases.md`.
6. Existing implementation patterns.

If two documents conflict, do not silently choose an interpretation that could change product behaviour. Identify the conflict and request clarification when necessary.

---

# 3. Technology Stack and Architecture

## 3.1 Frontend technology

The frontend uses:

- Next.js
- TypeScript
- React
- The existing styling framework and component system.
- The existing state-management solution, where configured.
- The existing API client and service layer.
- The existing authentication implementation.
- The existing WebSocket or real-time client.
- The existing testing infrastructure.

### Mandatory rules

- TypeScript is mandatory.
- Do not convert TypeScript files to JavaScript.
- Do not replace Next.js with another framework.
- Do not introduce a new architecture without approval.
- Do not replace existing libraries simply because you prefer alternatives.
- Inspect the current package configuration before installing dependencies.
- Follow the existing project conventions.
- Prefer existing utilities and reusable components.
- Avoid unnecessary dependencies and duplicated functionality.

## 3.2 Backend architecture

Nexus uses a separate Express.js and TypeScript backend.

The backend is responsible for:

- Authentication.
- Authorisation.
- User and workspace management.
- Business logic.
- Database operations.
- Resource access control.
- Messaging and notifications.
- Background jobs.
- File access authorisation.
- Integrations.
- Billing.
- AI request orchestration.
- AI action approval and execution.

PostgreSQL is the durable source of truth.

Redis supports caching, rate limiting, real-time coordination, ephemeral state, and background processing.

The Python/FastAPI service is a separate AI service. It must not be treated as the primary application backend.

### Backend integration rules

- Communicate with the backend through the existing API architecture.
- Do not connect directly to PostgreSQL from the frontend.
- Do not connect directly to Redis from the frontend.
- Do not independently implement backend business rules in React components.
- Do not invent API routes, request structures, or response structures.
- Inspect existing API services, types, and backend documentation before integration.
- Reuse the established API client.
- Keep API communication outside presentation components where appropriate.
- Handle API failures gracefully.
- Respect the backend's response and error conventions.
- Do not use hardcoded mock responses as substitutes for real production functionality.

If the required backend endpoint does not exist:

1. Confirm that it is genuinely missing.
2. Document the missing endpoint and expected functionality.
3. Identify the frontend dependency.
4. Do not silently create a fake implementation.
5. Do not modify the backend unless explicitly instructed.

---

# 4. Core Product Architecture

## 4.1 One Nexus identity

A user has one Nexus identity and can belong to multiple workspaces.

Users may have:

- A personal workspace.
- Company workspaces.
- Institution workspaces.
- Multiple teams or departments.
- Different roles in different workspaces.

The frontend must not assume that a user belongs to only one workspace.

## 4.2 Workspace types

The three workspace types are:

### Individual

Provides personal productivity and collaboration features.

### Company

Provides organisational collaboration, departments, teams, projects, task management, communication, and administration.

### Institution

Provides institution-focused collaboration, departments, groups, projects, task management, and administration.

An institution is not intended to be a full learning management system in the initial product.

Do not independently introduce features such as:

- Course enrolment.
- Examination management.
- Student grading.
- Attendance registers.
- Student result management.

These require separate product approval.

## 4.3 Shared application architecture

Build reusable components and feature modules wherever possible.

Do not create three entirely separate frontend applications for the three workspace types.

Workspace type should determine:

- Navigation.
- Feature availability.
- Terminology where appropriate.
- Administrative interfaces.
- Workspace-specific settings.
- Relevant dashboards.

The shared functionality should remain consistent.

---

# 5. Development Workflow

Every task must follow this process.

## Step 1 — Understand the task

- Read the relevant documentation.
- Identify the assigned phase.
- Understand the expected outcome.
- Identify dependencies.
- Inspect the current implementation.
- Determine what already works.
- Identify the smallest safe implementation.

Do not start coding immediately without understanding the existing structure.

## Step 2 — Inspect the codebase

Inspect relevant:

- Pages and routes.
- Components.
- Layouts.
- Hooks.
- Context providers.
- State-management modules.
- API services.
- Types and interfaces.
- Validation schemas.
- Utilities.
- Styles.
- Tests.
- Configuration.

Do not assume that a feature is missing simply because it is not visible in the first file inspected.

## Step 3 — Plan the implementation

Before making changes:

- Identify files that need modification.
- Identify files that genuinely need to be created.
- Identify reusable components.
- Identify required API integrations.
- Identify permission requirements.
- Identify loading and error states.
- Identify potential regressions.

Keep the implementation within the assigned phase.

## Step 4 — Implement

- Follow existing conventions.
- Reuse existing components.
- Keep components maintainable.
- Keep business logic out of presentation components where appropriate.
- Maintain strict TypeScript types.
- Use the existing API client.
- Handle all relevant UI states.
- Preserve unrelated functionality.

## Step 5 — Validate

Run the relevant checks:

- TypeScript checks.
- Linting.
- Unit tests.
- Component tests.
- Integration tests.
- End-to-end tests where configured.
- Production build.

Test the affected functionality manually where necessary.

## Step 6 — Update documentation

Update the relevant documentation and `phases.md` tracker.

Only mark work complete when it has actually been implemented and validated.

## Step 7 — Commit and push

Follow the mandatory Git workflow described in Section 17.

## Step 8 — Report completion

Provide a concise but complete report of the work performed.

---

# 6. Phase Management Rules

`phases.md` is the authoritative frontend implementation roadmap.

You must:

- Work on the currently assigned phase only.
- Respect phase dependencies.
- Inspect previously completed phases before implementing anything.
- Avoid rebuilding existing functionality.
- Avoid implementing future phases without approval.
- Identify incomplete dependencies.
- Update the phase tracker based on actual implementation and test evidence.

### Phase status

Use clear statuses:

- Not Started.
- In Progress.
- Blocked.
- Completed.

Do not mark a phase completed because its UI exists.

A phase must satisfy its functional requirements, relevant integrations, and validation requirements before being marked completed.

If a task reveals an issue belonging to another phase:

- Document it.
- Do not expand the current task unnecessarily.
- Address it only if it blocks the current phase or the user explicitly approves the additional work.

---

# 7. Frontend Design and UI Standards

The frontend must maintain a consistent Nexus design language.

Before designing or modifying an interface, inspect:

- Existing branding documentation.
- Existing `skill.md`.
- Design tokens.
- Component library.
- Existing page layouts.
- Existing interaction patterns.

## 7.1 General design principles

- Clean and modern.
- Professional and trustworthy.
- Intuitive navigation.
- Consistent spacing.
- Clear typography.
- Appropriate visual hierarchy.
- Responsive layouts.
- Accessible interactions.
- Consistent component behaviour.

Avoid unnecessary visual complexity.

## 7.2 Reusable components

Build and reuse shared components for:

- Buttons.
- Inputs.
- Textareas.
- Selects.
- Dropdowns.
- Dialogs.
- Confirmation modals.
- Cards.
- Tables.
- Tabs.
- Tooltips.
- Badges.
- Avatars.
- Menus.
- Toast notifications.
- Skeleton loaders.
- Empty states.
- Error states.
- Pagination.
- Search interfaces.

Do not create multiple slightly different versions of the same component without a valid reason.

## 7.3 Animations

Use animations to improve the experience, not distract from it.

- Use smooth transitions.
- Use subtle hover and focus effects.
- Use appropriate page transitions.
- Use skeleton loading where useful.
- Avoid excessive movement.
- Respect reduced-motion preferences.
- Preserve performance.

Follow the project's existing animation guidelines.

## 7.4 Feedback and confirmations

Use appropriate feedback for user actions.

Examples:

- Successful saves.
- Failed requests.
- Upload progress.
- Permission errors.
- Empty results.
- Loading states.
- Destructive action confirmations.

Do not use browser `alert()` or `confirm()` for normal application interactions.

Use the existing modal, dialog, and notification components.

## 7.5 Responsive design

Every feature must be considered across:

- Desktop.
- Tablet.
- Mobile.

Do not assume the desktop layout will work automatically on smaller screens.

Check:

- Sidebar behaviour.
- Navigation.
- Tables.
- Dialogs.
- Forms.
- Search.
- Conversation layouts.
- File previews.
- Calendar views.
- Dashboard charts.

---

# 8. TypeScript and Code Quality Standards

TypeScript must be used consistently.

### Mandatory rules

- Avoid `any`.
- Prefer explicit interfaces and types.
- Reuse shared types.
- Type API requests and responses.
- Type component props.
- Type event handlers.
- Type hooks and state appropriately.
- Avoid unsafe type assertions.
- Avoid suppressing TypeScript errors without justification.
- Avoid duplicated type definitions.
- Use existing validation schemas where available.

Do not use `@ts-ignore` to hide implementation problems.

If an exception is genuinely necessary, explain why and keep it narrowly scoped.

## Component standards

- Keep components focused.
- Avoid unnecessarily large components.
- Separate reusable UI from feature-specific UI.
- Extract repeated logic into hooks or utilities where appropriate.
- Avoid unnecessary prop drilling.
- Avoid unnecessary global state.
- Use server and client components appropriately for the existing Next.js architecture.
- Do not add `"use client"` to every component by default.

## Error handling

Every API-dependent feature must handle:

- Loading.
- Success.
- Empty results.
- Validation errors.
- Authentication errors.
- Permission errors.
- Network failures.
- Unexpected server errors.

Do not silently swallow errors.

---

# 9. Authentication and User Sessions

The backend is responsible for authentication.

The frontend must use the existing approved authentication architecture.

### Requirements

- Implement protected application routes.
- Handle unauthenticated access.
- Handle expired sessions.
- Handle logout.
- Handle login redirects.
- Handle authentication loading states.
- Handle email verification.
- Handle password recovery.
- Handle password reset.
- Support existing OAuth providers where implemented.
- Avoid exposing credentials and sensitive tokens.

### Security rules

- Do not trust client-side authentication state as proof of authorisation.
- Do not hardcode administrator access.
- Do not store sensitive credentials in insecure browser storage.
- Follow the backend's cookie, session, and token strategy.
- Handle logout and session expiry consistently.
- Clear sensitive cached data when a user logs out.

---

# 10. Workspace and Organisation Management

The frontend must support multiple workspaces per user.

### Requirements

- Workspace creation.
- Workspace switching.
- Workspace settings.
- Workspace profile.
- Workspace members.
- Workspace invitations.
- Join requests.
- Membership management.
- Departments.
- Teams.
- Institution groups.
- Workspace-specific navigation.

### Important rules

- Switching workspaces must update the active application context.
- Data from the previous workspace must not leak into the next workspace.
- Do not assume a user has the same role in every workspace.
- Personal workspace data must remain independent of organisation membership.
- Pending join request applicants must not access private workspace content.
- Removing organisation membership must not delete the user's Nexus identity or personal workspace.

---

# 11. Roles and Permissions

The frontend must reflect permissions supplied by the backend.

### Company roles

- Owner.
- Admin.
- Team Lead.
- Member.
- Guest.

### Institution roles

- Owner.
- Institution Admin.
- Department Admin.
- Team/Group Lead.
- Member.
- Guest.

### Mandatory permission rules

- Only the Owner can remove or demote another administrator.
- Admins cannot remove the Owner.
- Admins may remove ordinary members and guests.
- Team Leads cannot remove organisation members unless explicitly authorised.
- Guests only access explicitly shared resources.
- Organisation membership and team membership are separate.
- Organisation Admin does not automatically grant access to every private project.

### Implementation rules

- Use backend-provided roles and permissions.
- Build reusable permission-checking utilities.
- Hide or disable actions that the user cannot perform.
- Display appropriate restricted-access states.
- Refresh affected interfaces after permission changes.
- Do not invent permissions.
- Do not use frontend checks as a replacement for backend authorisation.

---

# 12. Project and Task Management

Nexus supports shared project and task management.

### Project visibility

The frontend must support:

1. Organisation-wide.
2. Department/team-only.
3. Private/invitation-only.

### Project features

- Project creation and editing.
- Project overview.
- Project members.
- Project discussions.
- Project files.
- Project milestones.
- Project activity.
- Project settings.
- Project visibility.

### Task features

- Task creation and editing.
- Task details.
- Assignees.
- Priority.
- Status.
- Start and due dates.
- Subtasks.
- Checklists.
- Comments.
- @mentions.
- Attachments.
- Labels.
- Dependencies.
- Activity history.

### Task views

- Board.
- List.
- Timeline.
- Calendar.

All views must use the same underlying task data.

### Important rules

- Respect project visibility.
- Do not expose private project information.
- Do not assume every organisation member can access every project.
- Respect task-level and project-level permissions.
- Refresh affected task views after successful mutations.

---

# 13. Messaging and Conversations

Messaging is a core Nexus feature.

Supported conversation types:

- Direct messages.
- Group conversations.
- Team channels.
- Project conversations.
- Announcements.

### Required functionality

- Real-time message updates.
- Replies and threads.
- Reactions.
- @mentions.
- Attachments.
- Message editing.
- Message deletion.
- Pinned messages.
- Saved messages.
- Read indicators.
- Typing indicators.
- Online presence.
- Conversation search.
- Conversation settings.

### Channel management

- Owners have full control.
- Admins manage channels according to their permissions.
- Team Leads may manage channels within assigned teams if authorised.
- Members cannot create channels by default.
- Guests only access explicitly shared channels.

### Critical unread-count separation

Message unread counts and general notification unread counts must remain independent.

Direct messages, group messages, channel messages, and message @mentions belong in the Messages area.

They must not be added to the general notification bell.

Do not combine these counters in the frontend.

---

# 14. Notifications and Activity Feed

The notification centre handles general application notifications.

Examples include:

- Task assignments.
- Task-comment mentions.
- Meeting invitations.
- Meeting changes.
- Join request decisions.
- Directly shared files.
- Security and access changes.

### Requirements

- Notification list.
- Unread count.
- Mark as read.
- Mark all as read.
- Real-time updates.
- Notification preferences.
- Activity feed.
- Activity grouping.
- Relevant navigation to affected resources.

### Important rule

Messages and message @mentions must remain in the Messages area, not the general notification bell.

Use separate state and backend data sources for general notifications and message unread counts, following the existing API contracts.

---

# 15. File Management and Document Collaboration

Nexus includes file management and document collaboration.

### File management

- File browsing.
- Folder browsing.
- Upload.
- Upload progress.
- Preview.
- Download.
- Sharing.
- File details.
- File permissions.
- File search.
- File deletion.
- Version history where supported.

### Document collaboration

- Document listing.
- Document creation.
- Editing.
- Preview.
- Comments.
- Sharing.
- Access control.
- Version history where supported.

### Security rules

- Files must be accessed through authorised backend mechanisms.
- Use backend-provided signed URLs or streaming endpoints.
- Do not expose private storage credentials.
- Do not assume that knowing a file URL grants permission.
- Respect workspace, project, and document permissions.
- Do not cache private file content beyond approved application behaviour.

---

# 16. Calendar and Meetings

### Calendar functionality

- Day, week, and month views.
- Event creation and editing.
- Event details.
- Invitations.
- Participant management.
- Calendar filters.
- Personal and workspace calendars.
- Google Calendar integration.
- Microsoft Outlook Calendar integration.
- Sync status.
- Conflict feedback.

Calendar synchronisation is two-way.

Prevent duplicate events and display relevant sync errors.

Private event details must not be exposed to unauthorised users.

### Meeting functionality

- Meeting scheduling.
- Instant meetings.
- Meeting invitations.
- Pre-join device settings.
- Audio and video controls.
- Participant management.
- Screen sharing.
- Meeting chat.
- Meeting history.
- Project-linked meetings.

Use the existing managed calling SDK.

Do not replace the approved calling provider without approval.

---

# 17. Forms, Surveys, and Billing

## Forms and surveys

Support the backend's available functionality for:

- Form creation.
- Form editing.
- Field configuration.
- Validation settings.
- Publishing.
- Response collection.
- Response management.
- Survey results.

## Subscription and billing

Support:

- Individual plans.
- Company plans.
- Institution plans.
- Free and paid plans.
- 14-day Premium trial.
- Upgrade and downgrade.
- Payment method management.
- Billing history.
- Invoices.
- Renewal information.
- Cancellation.
- Usage limits.

### Billing rules

- The 14-day Premium trial does not require a payment card.
- Trial expiration must not silently convert the user to a paid subscription.
- The user must actively subscribe.
- Organisation billing is controlled by the Owner.
- Personal subscriptions and organisation subscriptions are independent.
- Downgrading must not imply automatic deletion of existing data.

Do not invent pricing, plan limits, or billing rules. Use approved backend and product information.

---

# 18. Global Search

Build the global search experience using the existing backend search APIs.

Supported search categories:

- People.
- Workspaces.
- Teams.
- Projects.
- Tasks.
- Messages and conversations.
- Files and documents.
- Meetings.
- Announcements.

### Requirements

- Global search entry point.
- Ctrl+K/Cmd+K shortcut.
- Suggestions.
- Recent searches.
- Filters.
- Workspace context.
- Search result previews.
- Loading and empty states.
- Error handling.

Full document search is part of the product requirements.

### Important rules

- Search results must respect backend permissions.
- Do not display inaccessible private resources.
- Do not independently index private documents in the browser.
- Do not invent search APIs.

---

# 19. Integrations

Nexus supports integrations at individual and organisational workspace levels.

Planned integrations include:

- Google Drive.
- Microsoft OneDrive.
- Dropbox.
- Gmail.
- Microsoft Outlook.
- Slack.
- Microsoft Teams.
- Google Calendar.
- Microsoft Outlook Calendar.
- GitHub.
- GitLab.
- Webhooks and automation providers.

### Requirements

- Integration directory.
- Connection workflows.
- OAuth redirects.
- Connected account management.
- Sync status.
- Reconnection.
- Disconnection.
- Permission information.
- Integration settings.

### Security rules

- Personal integrations and workspace integrations must remain separate.
- Do not expose OAuth client secrets.
- Do not expose private provider tokens.
- Do not assume a personal integration is available to a workspace.
- Disconnecting an integration must not imply deletion of provider data.

---

# 20. Automation and Workflow Builder

Support the existing backend automation architecture.

### Requirements

- Automation listing.
- Workflow creation.
- Trigger selection.
- Condition configuration.
- Action selection.
- Workflow editing.
- Activation and deactivation.
- Execution history.
- Execution status.
- Error details.

Do not invent automation capabilities that the backend does not support.

---

# 21. AI Assistant and Python Service Integration

Nexus includes a separate Python/FastAPI AI service.

The frontend must integrate through the approved application backend.

### AI capabilities

- AI conversations.
- Contextual assistance.
- Document analysis.
- Summarisation.
- Meeting intelligence.
- Recommendations.
- Writing assistance.
- AI-proposed actions.

### Architecture rules

- Express remains the authoritative application backend.
- Express authenticates users and prepares authorised context.
- Python performs AI processing.
- The frontend must not connect directly to the main PostgreSQL database.
- The frontend must not bypass Express authorisation.
- Core Nexus functionality must continue when the AI service is unavailable.

### AI interface requirements

- Conversation interface.
- Conversation history.
- Contextual interactions.
- Source references.
- Document analysis.
- Summaries.
- Recommendations.
- Loading states.
- Error states.
- Service unavailable states.

Do not fabricate AI responses in production workflows.

---

# 22. Nexus Write

Nexus Write provides Grammarly-like writing assistance.

### Supported capabilities

- Spelling.
- Grammar.
- Punctuation.
- Clarity.
- Vocabulary.
- Tone.
- Rewriting.
- Summarisation.
- Translation.
- Explanation.

### Frontend requirements

- Writing assistance interface.
- Selected-text assistance.
- Suggestion presentation.
- Accept and dismiss controls.
- Debounced analysis.
- Loading states.
- Error handling.
- Integration with the approved AI backend.

### Critical rules

- Never silently replace user writing.
- Every suggestion must remain under user control.
- Users must explicitly accept changes.
- Minimise the amount of private text sent for analysis.
- Respect the backend's privacy and retention rules.

---

# 23. AI Action Approval and Execution

AI may propose actions that change Nexus data.

Examples include:

- Creating a task.
- Updating a task.
- Creating a project.
- Assigning a task.
- Creating an event.
- Updating other supported resources.

### Mandatory rules

- AI must never silently perform mutations.
- Every mutation requires explicit user approval.
- Display the proposed action before execution.
- Display the affected resources and relevant changes.
- Provide approve, reject, and cancel controls.
- Show execution progress.
- Display the actual backend result.
- Refresh affected frontend data after successful execution.

The backend must independently revalidate permissions and execute the action.

The frontend must never treat an approval click as proof that the action succeeded.

---

# 24. Real-Time Architecture and State Management

Nexus uses real-time application functionality.

The frontend must integrate with the existing real-time architecture.

### Requirements

- Shared connection management.
- Reconnection handling.
- Presence updates.
- Typing indicators.
- Message updates.
- Task updates.
- Notification updates.
- Workspace membership changes.
- Permission changes.
- Appropriate cache invalidation.
- Duplicate event prevention.
- Listener cleanup.

### Important rules

- Do not create unnecessary duplicate socket connections.
- Do not leave event listeners active after component unmount.
- Do not treat real-time events as permanent storage.
- Reconcile optimistic updates with backend responses.
- Handle stale state.
- Respect resource permissions.
- Keep message and general notification counters separate.

PostgreSQL-backed backend state remains authoritative.

---

# 25. State Management and Data Fetching

Follow the existing project state-management architecture.

### Rules

- Do not introduce another global state library without approval.
- Avoid unnecessary global state.
- Keep server state separate from local UI state where appropriate.
- Reuse existing query and caching mechanisms.
- Implement appropriate cache invalidation.
- Avoid duplicate API requests.
- Handle stale data.
- Reset workspace-specific data when switching workspaces.
- Clear sensitive data on logout.
- Keep API data and UI-only state appropriately separated.

Do not build custom state-management infrastructure if an existing solution already handles the requirement.

---

# 26. Performance Requirements

Build for real-world usage and growing workspaces.

### Requirements

- Avoid unnecessary component re-renders.
- Avoid unnecessary API requests.
- Use appropriate pagination.
- Use lazy loading where useful.
- Optimise large lists.
- Optimise images.
- Avoid unnecessarily large client bundles.
- Load heavy components only when needed.
- Avoid unnecessary dependencies.
- Clean up subscriptions and event listeners.
- Use appropriate caching and revalidation.
- Maintain responsive interaction performance.

Do not introduce premature optimisation that makes the architecture unnecessarily complex.

---

# 27. Accessibility Requirements

All major interfaces must support:

- Keyboard navigation.
- Visible focus indicators.
- Semantic HTML.
- Appropriate ARIA attributes.
- Accessible labels.
- Appropriate colour contrast.
- Screen reader-friendly feedback.
- Dialog focus management.
- Accessible form validation.
- Reduced-motion preferences.

Do not make functionality available only through hover interactions.

---

# 28. Security and Privacy Requirements

Frontend security is mandatory.

### Authentication

- Follow the approved session architecture.
- Protect authenticated routes.
- Handle session expiration.
- Clear sensitive data on logout.

### Authorisation

- Never trust client-provided roles.
- Never assume frontend route protection is sufficient.
- Use backend-provided permissions.
- Do not expose inaccessible resources.
- Clear or refresh cached data after membership or permission changes.

### Data protection

- Never expose secrets in frontend code.
- Do not expose private environment variables.
- Do not log access tokens, passwords, or sensitive user content.
- Do not render untrusted HTML unsafely.
- Validate user input.
- Handle uploads safely.
- Respect private file access.
- Avoid exposing private workspace information through error messages.

### Workspace isolation

- Every workspace-specific view must use the correct active workspace context.
- Switching workspaces must not expose stale data from another workspace.
- Resource links must not bypass backend permission checks.
- Private project and conversation data must remain restricted.

---

# 29. Testing Standards

Use the testing tools already configured in the repository.

### Required validation

- TypeScript checks.
- Linting.
- Unit tests.
- Component tests where applicable.
- Integration tests where applicable.
- End-to-end tests where configured.
- Production build.

### Important workflows to test

- Authentication.
- User onboarding.
- Workspace creation.
- Workspace switching.
- Invitations.
- Join requests.
- Role-based UI.
- Project visibility.
- Task management.
- Messaging.
- Notification separation.
- File uploads.
- Calendar workflows.
- Meeting workflows.
- Billing.
- Global search.
- Integrations.
- AI assistant.
- Nexus Write.
- AI action approvals.
- Real-time reconnection.
- Responsive layouts.

Do not remove tests simply because they fail after implementation.

Investigate and fix failures introduced by your changes.

Do not claim tests passed unless they were executed successfully.

---

# 30. Environment Variables and Configuration

Inspect the existing environment configuration before making changes.

### Mandatory rules

- Never delete `.env` files.
- Never overwrite existing environment values.
- Never replace the entire environment configuration with an example.
- Never commit secrets.
- Never expose private variables through `NEXT_PUBLIC_` variables.
- Preserve existing deployment configuration.
- Add only genuinely required variables.
- Update `.env.example` carefully without including real secrets.
- Document new configuration requirements.

Do not assume environment variable names. Inspect the current project and backend documentation.

---

# 31. Git and Branch Management

This project must use a controlled Git workflow.

### Mandatory rules

1. Never develop directly on `main`.
2. Never commit directly to `main`.
3. Create or use a dedicated feature branch for the assigned task or phase.
4. Inspect the current Git status before making changes.
5. Preserve unrelated uncommitted user changes.
6. Never discard user changes without explicit approval.
7. Never force-push.
8. Never rewrite Git history.
9. Never delete branches without explicit approval.
10. Never merge into `main` without explicit approval.

### Branch naming

Use descriptive branch names, for example:

`feature/frontend-authentication`

`feature/frontend-workspace-management`

`feature/frontend-messaging`

`feature/frontend-dashboard`

`fix/frontend-navigation`

`docs/frontend-documentation`

### Commit messages

Use clear, descriptive commit messages.

Examples:

- `feat(frontend): implement workspace switcher`
- `feat(frontend): add task management interface`
- `fix(frontend): resolve workspace navigation issue`
- `refactor(frontend): improve shared form components`
- `docs(frontend): update implementation documentation`

### Phase completion workflow

When the assigned phase is complete:

1. Run the required checks.
2. Review the Git diff.
3. Confirm no unrelated files were modified.
4. Confirm no secrets were added.
5. Update `phases.md`.
6. Commit the changes.
7. Push the feature branch when required.
8. Report the branch and commit hash.

Do not automatically merge the branch.

---

# 32. Prohibited Development Practices

Never:

- Convert TypeScript to JavaScript.
- Replace the framework without approval.
- Rebuild existing features unnecessarily.
- Delete existing working functionality.
- Delete or overwrite `.env`.
- Hardcode production data.
- Invent backend endpoints.
- Invent product requirements.
- Bypass backend permissions.
- Store secrets in client-side code.
- Expose private workspace data.
- Combine message unread counts with notification unread counts.
- Silently modify user writing with AI.
- Allow AI to execute mutations without approval.
- Introduce unnecessary libraries.
- Suppress errors instead of fixing them.
- Remove tests to make checks pass.
- Mark incomplete phases as completed.
- Commit directly to `main`.
- Force-push or rewrite Git history.
- Merge without explicit approval.

---

# 33. Handling Uncertainty and Blockers

If you encounter an unclear requirement:

1. Inspect the relevant documentation.
2. Inspect existing code.
3. Check backend API contracts.
4. Search for established implementation patterns.
5. Determine whether the issue can be resolved without changing approved product behaviour.

If uncertainty remains and could affect architecture, security, data handling, or user experience, ask the user before making a consequential decision.

If a backend dependency is missing:

- Identify the required endpoint or backend capability.
- Explain why the frontend depends on it.
- Document the expected contract only as a proposal.
- Do not pretend the integration is complete.
- Do not create fake production behaviour.

If a test or build fails:

- Identify whether the failure existed before your changes.
- Fix failures introduced by your work.
- Document unrelated existing failures.
- Do not hide or suppress failures.

---

# 34. Phase Completion Report

At the end of every assigned phase, provide a report containing:

## Phase Information

- Phase number.
- Phase title.
- Completion status.

## Implementation Summary

- Features implemented.
- User workflows completed.
- Components created.
- Existing components updated.

## Files Changed

- Files created.
- Files modified.
- Important architectural changes.

## Backend Integration

- API endpoints integrated.
- Real-time events integrated.
- Missing backend dependencies.
- Any mock or placeholder functionality that remains.

## Validation

- TypeScript check results.
- Lint results.
- Test results.
- Production build results.
- Manual verification performed.

## Outstanding Issues

- Known bugs.
- Incomplete requirements.
- Blockers.
- Security considerations.

## Git Information

- Branch name.
- Commit hash.
- Push status.

Do not report an item as completed unless it has actually been implemented and verified.

---

# 35. Final Operating Instructions

Your responsibility is to maintain and develop the Nexus frontend according to the approved product requirements and existing architecture.

Always:

- Read the documentation first.
- Inspect existing code before modifying it.
- Follow `phases.md`.
- Work only on the assigned phase.
- Use TypeScript.
- Preserve existing features.
- Reuse existing architecture.
- Integrate with the real backend.
- Respect workspace isolation and permissions.
- Maintain the distinction between messages and general notifications.
- Follow the Nexus design system.
- Test your work.
- Update documentation.
- Commit and push through a dedicated feature branch when required.
- Report honestly.

The goal is not simply to produce attractive screens.

The goal is to build a complete, reliable, secure, responsive, maintainable, and production-ready frontend for Nexus that works correctly with its backend and supports Individual, Company, and Institution workspaces.