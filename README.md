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




<!-- 



# NEXUS FRONTEND — CONTINUED DEVELOPMENT, PHASE IMPLEMENTATION AND VERIFICATION

You are working on the existing **Nexus frontend project**.

Your responsibility is to continue frontend development from the next incomplete phase in the existing `phases.md` roadmap.

This is an existing application with an established architecture, design system, backend integration, and previously implemented functionality.

You must thoroughly study the project before making changes, understand what has already been implemented, verify completed phases, and continue development without breaking existing functionality.

**Your objective is to implement the remaining frontend phases in their correct order, ensuring that every phase is properly integrated, tested, and consistent with the actual project architecture.**

---

# 1. MANDATORY DOCUMENTATION REVIEW

Before making any code changes, locate and read all relevant project documentation.

At minimum, read:

1. `agent.md`
2. `README.md`
3. `phases.md`
4. `branding.md`
5. `skill.md`

Also locate and read relevant supporting documentation, including:

- Frontend architecture documentation.
- Backend API documentation.
- Database and data-model documentation where relevant.
- Authentication and authorisation documentation.
- API integration guidelines.
- Design system documentation.
- Component and UI guidelines.
- Animation guidelines.
- Testing documentation.
- Deployment documentation.
- Feature-specific implementation instructions.
- Any phase-specific requirements or acceptance criteria.

Do not assume all documentation is located in the frontend root directory.

Search the repository for relevant files and inspect the actual documentation structure.

### Documentation rules

- Do not skip documentation because you have previously worked on the project.
- Do not rely on summaries when the original documentation is available.
- Do not invent requirements for missing documentation.
- Identify contradictory or outdated documentation.
- Use `phases.md` as the authoritative development roadmap.
- Use `branding.md` as the authoritative visual identity reference.
- Use `skill.md` as the frontend implementation and design standard.
- Follow `agent.md` for all agent-specific restrictions.

If a necessary document is missing, report it and determine whether implementation can safely proceed.

---

# 2. INSPECT THE CURRENT FRONTEND PROJECT

Before implementation, study the entire existing frontend structure.

Inspect the following areas.

### A. Project foundation

- `package.json`
- Lockfile and package manager.
- Next.js configuration.
- TypeScript configuration.
- Tailwind CSS configuration.
- PostCSS configuration.
- ESLint configuration.
- Environment variable handling.
- Existing scripts.
- Build configuration.

### B. Application architecture

- App Router or Pages Router.
- Application layouts.
- Route groups.
- Pages.
- Loading states.
- Error boundaries.
- Providers.
- Authentication flow.
- Protected routes.
- Workspace selection.
- Workspace switching.
- Navigation structure.

### C. Components

Inspect:

- Shared components.
- Feature-specific components.
- UI primitives.
- Forms.
- Tables.
- Cards.
- Dropdowns.
- Modals.
- Dialogs.
- Drawers.
- Notifications.
- Toasts.
- Context providers.
- Custom hooks.
- Reusable utilities.

### D. Existing integrations

Inspect:

- Backend API client.
- Authentication integration.
- Token and session handling.
- Workspace context.
- Real-time communication.
- WebSocket integration.
- File uploads and downloads.
- Notifications.
- Email-related UI.
- AI service integration.
- External integrations.

### E. Existing styling

Understand:

- Design tokens.
- Colour palette.
- Typography.
- Spacing.
- Component variants.
- Responsive breakpoints.
- Dark and light themes, if implemented.
- Animation libraries.
- Existing animation patterns.

**Important:** Understand the actual architecture before deciding where new functionality belongs.

Do not create alternative implementations when suitable components, services, hooks, or utilities already exist.

---

# 3. AUDIT THE EXISTING PHASE IMPLEMENTATIONS

Read the entire `phases.md` file.

Identify:

- Previously completed phases.
- The phase currently being implemented.
- The next incomplete phase.
- Remaining phases.
- Dependencies between phases.
- Acceptance criteria for each phase.
- Any recorded implementation notes or blockers.

Do not assume that a phase is correctly implemented simply because it is marked complete.

For previously completed phases, inspect the actual implementation and verify that the essential requirements are satisfied.

Pay particular attention to:

1. Whether the functionality actually exists.
2. Whether the UI is connected to the correct backend APIs.
3. Whether data is persisted correctly.
4. Whether authentication and workspace context are handled correctly.
5. Whether loading, empty, success, and error states exist.
6. Whether the implementation follows the approved design system.
7. Whether the functionality works across related modules.
8. Whether there are broken integrations or incomplete workflows.
9. Whether relevant tests exist and pass.

### Phase verification classifications

Use these classifications:

- VERIFIED COMPLETE
- PARTIALLY COMPLETE
- INCORRECT IMPLEMENTATION
- NOT IMPLEMENTED
- BLOCKED

Do not mark functionality complete based on the existence of components or pages alone.

A feature is complete only when its required user workflow works correctly.

### Decision rules

If an existing phase is correctly implemented:

- Preserve its implementation.
- Avoid unnecessary refactoring.
- Do not recreate existing functionality.
- Record its verified status.

If an existing phase is incomplete:

- Identify the missing requirements.
- Correct the implementation where necessary.
- Preserve working functionality.
- Add appropriate tests.

If a phase is blocked:

- Document the exact blocker.
- Do not pretend it is complete.
- Do not bypass dependencies.

---

# 4. DETERMINE THE NEXT PHASE

After reviewing the documentation and existing implementation, determine the correct next phase.

Do not arbitrarily select a phase.

Use the following priority:

1. Verify previously completed phases.
2. Resolve incomplete requirements that block subsequent phases.
3. Identify the earliest incomplete phase in the roadmap.
4. Verify that its dependencies have been satisfied.
5. Begin implementation of that phase.

If the first phase is already complete, continue with the next incomplete phase.

If the phase currently recorded in `phases.md` is inaccurate, investigate the actual implementation before correcting the tracker.

**Never skip phases simply because their functionality appears straightforward.**

---

# 5. IMPLEMENT THE REMAINING PHASES SEQUENTIALLY

Work through the remaining phases in their documented order.

For each phase, follow this process.

### STEP 1 — Study the phase requirements

Read the complete phase description.

Understand:

- Its objectives.
- Required features.
- User workflows.
- UI requirements.
- Backend dependencies.
- Data requirements.
- Component dependencies.
- Acceptance criteria.

Read any supporting documentation referenced by that phase.

### STEP 2 — Inspect existing implementations

Before creating anything:

- Search for existing pages.
- Search for reusable components.
- Inspect existing hooks.
- Inspect API services.
- Inspect shared types.
- Inspect existing integrations.
- Identify reusable UI patterns.

Do not duplicate functionality that already exists.

### STEP 3 — Prepare an implementation plan

Determine:

- Files that need modification.
- Components that need creation.
- Existing services that can be reused.
- API integrations required.
- State-management requirements.
- Dependencies on other phases.
- Tests required.

Keep the implementation consistent with the existing architecture.

### STEP 4 — Implement the phase

Implement all requirements specified in the phase.

Do not implement only the visual interface while leaving the underlying functionality incomplete.

Where applicable, ensure:

- Forms submit correctly.
- Backend data is retrieved and displayed.
- Data mutations work correctly.
- Authentication is respected.
- Workspace context is maintained.
- Permissions are reflected accurately.
- Real-time updates work where required.
- Loading states are implemented.
- Empty states are implemented.
- Error handling is implemented.
- Success feedback is provided.
- Responsive behaviour is maintained.

### STEP 5 — Integrate with existing modules

Ensure new functionality works with related Nexus features.

Avoid creating isolated features that cannot communicate with the rest of the application.

Check:

- Navigation integration.
- Workspace integration.
- User identity integration.
- Permissions.
- Notifications.
- Messaging.
- Projects and tasks.
- Files.
- Meetings.
- Search.
- Other relevant modules.

Only integrate features where required by the documented architecture and phase requirements.

### STEP 6 — Test the implementation

Run relevant tests and checks.

Verify the entire user workflow, not just whether the page renders.

### STEP 7 — Update documentation

Update `phases.md` only after the phase has passed its acceptance criteria and verification.

Record:

- What was implemented.
- Important files modified.
- Tests executed.
- Remaining limitations.
- Any genuine blockers.

### STEP 8 — Proceed to the next phase

Once a phase is verified complete, continue with the next incomplete phase.

Do not skip ahead.

Do not repeatedly revisit already verified phases unless a new defect or dependency requires it.

---

# 6. NEXUS FRONTEND ARCHITECTURE REQUIREMENTS

Nexus is a real-time workspace and project management platform combining capabilities inspired by Trello, Notion, and Slack.

It supports individual, company, and institution workspaces.

The frontend must maintain consistency with this architecture.

### A. Workspace architecture

Support the documented workspace types:

- Individual workspaces.
- Company workspaces.
- Institution workspaces.

Users may belong to multiple workspaces.

Ensure workspace switching, workspace context, and workspace-specific data remain consistent.

Do not assume organisation membership grants access to every project or resource.

### B. Authentication and identity

Maintain one Nexus identity per user.

Ensure:

- Authentication state is handled consistently.
- Session expiration is handled.
- Protected routes work.
- Logout works.
- Account and profile information are consistent.
- Workspace membership is represented accurately.

Do not implement a separate authentication system.

### C. Roles and permissions

Respect the backend permission model.

The frontend should:

- Display available actions based on permissions.
- Restrict inappropriate UI actions.
- Handle permission-denied responses.
- Avoid exposing administrative actions to unauthorised users.

Remember that frontend restrictions are not security boundaries. The backend remains authoritative.

### D. Projects and tasks

Maintain the documented project visibility levels:

- Organisation-wide.
- Department/team-only.
- Private/invitation-only.

Ensure associated tasks, discussions, files, and other project resources follow their parent project's access rules.

### E. Messaging and notifications

Keep the Messages experience separate from general notifications.

Support the documented messaging architecture:

- Direct messages.
- Group messages.
- Channels.
- Message @mentions.
- Message unread indicators.
- Real-time message updates.

General notifications should not incorrectly display message unread counts.

### F. Meetings and collaboration

Where included in the phase requirements, ensure meetings integrate with:

- Calendar.
- Workspace context.
- Projects.
- Teams.
- Participants.
- Notifications.
- Meeting communication.

### G. AI functionality

Nexus AI and Nexus Write must follow the documented AI architecture.

The frontend must communicate through the approved backend integration.

Do not expose AI service credentials.

For AI-proposed actions:

- Present the proposed action.
- Require explicit user approval.
- Communicate approval through the backend.
- Display the execution result.

Do not execute sensitive AI-proposed actions automatically.

### H. File management

Ensure file interfaces follow the backend's storage and authorisation model.

Support relevant functionality such as:

- Uploading.
- Downloading.
- Previewing.
- File metadata.
- Access restrictions.
- Upload progress.
- Error handling.

Do not expose private storage credentials or bypass backend authorisation.

---

# 7. DESIGN AND USER EXPERIENCE REQUIREMENTS

Follow `branding.md` and `skill.md` throughout implementation.

Do not invent a new visual identity.

Maintain consistency across all Nexus pages.

### Design consistency

Ensure consistency in:

- Colours.
- Typography.
- Spacing.
- Buttons.
- Cards.
- Inputs.
- Navigation.
- Sidebar.
- Modals.
- Dropdowns.
- Tables.
- Icons.
- Borders.
- Shadows.
- Animations.

### User experience

Every relevant feature must provide appropriate:

- Loading states.
- Empty states.
- Error states.
- Success states.
- Confirmation dialogs.
- Form validation.
- Accessible labels.
- Keyboard interactions.
- Responsive layouts.

Use the existing modal and confirmation components.

Avoid browser `alert()` and `confirm()` when application-level alternatives exist.

### Animation

Use the existing animation libraries and patterns.

Animations should be:

- Smooth.
- Purposeful.
- Consistent.
- Performance-conscious.
- Appropriate for the interface.

Avoid excessive animations and unnecessary visual effects.

### Responsive design

Test the interface across:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

Do not implement desktop-only interfaces for functionality intended to be accessible across devices.

---

# 8. FRONTEND AND BACKEND INTEGRATION

Study the current Nexus backend before implementing frontend functionality that depends on it.

Read the relevant backend documentation and inspect available API contracts.

The backend is TypeScript-based, using Express.

The frontend is Next.js with TypeScript.

The separate AI service uses Python/FastAPI.

**Do not convert any TypeScript implementation to JavaScript.**

Verify:

- API endpoint paths.
- Request payloads.
- Response structures.
- Authentication requirements.
- Error response formats.
- Pagination.
- Filtering.
- Workspace context.
- Permission requirements.
- Real-time events.
- File upload requirements.

### Important restrictions

- Do not invent endpoints.
- Do not invent request or response fields.
- Do not modify backend source code.
- Do not modify database schemas.
- Do not create mock integrations to replace existing backend functionality.
- Do not hardcode API URLs.
- Do not expose private environment variables.
- Reuse the existing API client.

If a required backend endpoint is missing, document it as a backend dependency instead of silently implementing a fake frontend workflow.

---

# 9. PROJECT STRUCTURE AND CODE QUALITY

Maintain the existing project structure.

Do not reorganise the entire application unnecessarily.

### TypeScript

- Use TypeScript throughout.
- Maintain strict typing.
- Avoid unnecessary `any`.
- Reuse existing types.
- Avoid duplicate interfaces.
- Maintain consistent API response types.

### React and Next.js

- Follow existing routing conventions.
- Respect server/client component boundaries.
- Avoid unnecessary client components.
- Avoid unnecessary state.
- Avoid unnecessary effects.
- Keep components maintainable.
- Reuse existing hooks and providers.

### Code organisation

- Keep feature-specific functionality organised.
- Reuse shared UI components.
- Avoid oversized components.
- Avoid duplicated business logic.
- Maintain consistent naming conventions.
- Keep API communication separate from presentation where appropriate.

Do not introduce unnecessary dependencies or replace existing libraries without a genuine technical reason.

---

# 10. TESTING AND QUALITY ASSURANCE

Testing is mandatory for every implemented phase.

Use the actual scripts and tools configured in the repository.

Run applicable:

1. TypeScript type checking.
2. ESLint.
3. Unit tests.
4. Component tests.
5. Integration tests.
6. End-to-end tests.
7. Production build.

Also verify:

- Existing routes still work.
- Navigation remains functional.
- Authentication remains functional.
- Workspace switching works.
- API integrations work.
- Forms submit correctly.
- Modals and dialogs behave correctly.
- Real-time updates work where applicable.
- Responsive layouts remain intact.
- No broken imports exist.
- No console errors are introduced.
- No existing features regress.

Do not claim a test passed unless you actually executed it.

If a test requires unavailable credentials, services, or infrastructure, identify it as blocked.

Do not hide failures to make a phase appear complete.

---

# 11. GIT AND CHANGE MANAGEMENT

Before making changes:

1. Inspect the current Git branch.
2. Run `git status`.
3. Inspect recent commits.
4. Identify existing uncommitted changes.
5. Read the Git instructions in `agent.md`.

Mandatory rules:

- Never commit directly to `main`.
- Use an appropriate feature branch.
- Preserve existing user modifications.
- Never overwrite uncommitted work.
- Never use destructive Git operations.
- Never force-push.
- Never rewrite Git history.
- Never commit environment files or secrets.
- Never merge into `main` without explicit approval.

Commit logically separated and verified work.

Use descriptive commit messages.

Push the feature branch when remote access and repository permissions allow it.

If Git operations fail, report the actual failure.

---

# 12. PHASE TRACKER MANAGEMENT

Keep `phases.md` accurate throughout development.

For every phase, record:

- Phase number.
- Phase name.
- Implementation status.
- Features implemented.
- Important files modified.
- Tests performed.
- Verification results.
- Remaining requirements.
- Blockers.

Only mark a phase complete when all its acceptance criteria have been satisfied.

Never mark a phase complete simply because its UI has been created.

Do not change phase numbering.

Do not delete phase requirements.

Do not rewrite the roadmap to make unfinished work appear complete.

---

# 13. EXECUTION RULES FOR REMAINING PHASES

Follow these rules strictly:

1. Read all relevant documentation before implementation.
2. Study the existing frontend structure.
3. Verify previously completed phases.
4. Identify the next incomplete phase.
5. Check phase dependencies.
6. Implement phases in their documented order.
7. Preserve existing functionality.
8. Reuse existing components and services.
9. Follow the approved branding.
10. Integrate with the actual backend APIs.
11. Test every implemented phase.
12. Update `phases.md` after verification.
13. Continue to the next incomplete phase only after the previous phase is verified.
14. Do not skip phases.
15. Do not introduce unrelated features.
16. Do not rebuild existing functionality.
17. Do not modify backend code.
18. Do not modify environment files.
19. Maintain TypeScript throughout.
20. Never commit directly to `main`.

If a phase is blocked, resolve what can safely be resolved, document the remaining dependency, and do not mark the phase complete.

---

# 14. FINAL REPORT

When you finish the assigned implementation work, provide a comprehensive report.

### A. Project Assessment

- Current frontend structure.
- Actual technology stack.
- Architecture discovered.
- Important conventions.
- Documentation reviewed.

### B. Previous Phase Verification

Provide a table:

| Phase | Previous Status | Verified Status | Findings |
|---|---|---|---|

Include all previously completed phases inspected.

### C. Implementation Summary

For every phase worked on, report:

- Phase number and name.
- Requirements implemented.
- Components created.
- Components modified.
- API integrations.
- Important functionality.
- Files changed.

### D. Testing Results

Provide actual results:

| Test | Result | Details |
|---|---|---|
| TypeScript | | |
| ESLint | | |
| Unit Tests | | |
| Integration Tests | | |
| End-to-End Tests | | |
| Production Build | | |

Do not report unexecuted tests as passed.

### E. Phase Tracker

Report:

- Phases verified complete.
- Phases implemented.
- Phases partially complete.
- Phases blocked.
- Next incomplete phase.

### F. Git Summary

Report:

- Branch used.
- Commits created.
- Whether changes were pushed.
- Git blockers, if any.

### G. Remaining Work

List:

NEXUS2003
nexus01090

- Outstanding requirements.
- Backend dependencies.
- External service dependencies.
- Known bugs.
- Testing limitations.
- Outstanding phase requirements.

### H. Files Changed

List important created, modified, or deleted files and explain why.

---

# FINAL INSTRUCTION

Your job is to continue building the actual Nexus frontend, not to create a new application or merely produce an implementation plan.

Read the necessary files, understand the existing project, verify previous work, and continue with the next incomplete phase.

Implement each phase completely, integrate it with the existing application, test it, and update the phase tracker before proceeding.

**Do not sacrifice existing functionality for new features. Do not duplicate working implementations. Do not invent backend capabilities. Do not compromise the existing architecture or design system.**

The expected outcome is a progressively completed, fully integrated, properly tested Nexus frontend that remains consistent with its documentation, backend architecture, and approved branding.



-->