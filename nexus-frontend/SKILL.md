---
name: nexus-frontend
description: Specialized instructions for building, integrating, testing, and maintaining the Nexus frontend using Next.js, TypeScript, React, Tailwind CSS, accessible UI components, API integration, authentication, real-time communication, and responsive design.
---

# Nexus Frontend Development Skill

## 1. Purpose

This skill defines the frontend development standards for Nexus, a real-time workspace and project management platform combining project boards, task management, collaborative documents, team communication, notifications, and AI-assisted productivity features.

The frontend must provide a consistent, responsive, accessible, secure, and maintainable user experience.

The frontend repository is separate from the Nexus backend repository. Integrate with the backend through documented API contracts rather than importing or modifying backend implementation files.

## 2. Technology Stack

Use the following technologies where they are already configured or explicitly approved for the project:

- Next.js with the App Router.
- TypeScript for application code.
- React for reusable UI components.
- Tailwind CSS for styling.
- REST APIs for backend communication.
- Socket.IO client for real-time events when supported by the backend.
- JWT-based or cookie-based authentication according to the existing backend authentication contract.
- A suitable form validation library if already installed or approved.
- A suitable testing framework based on the existing project configuration.

Before installing dependencies or selecting additional libraries, inspect `package.json`, the lockfile, and the existing source code.

Do not replace the current stack or introduce duplicate libraries without a clear reason.

## 3. Inspect Before Making Changes

Before implementing a feature:

1. Read the root `agent.md`.
2. Read `PHASES.md` and identify the active implementation phase.
3. Read this skill file.
4. Inspect the existing `src/app` structure, components, layouts, hooks, services, types, and configuration.
5. Inspect existing authentication, API utilities, error handling, and design conventions.
6. Check the backend API contract and existing environment variables.
7. Identify reusable components and existing functionality that must be preserved.

Do not assume a file, route, API endpoint, package, or feature exists without verifying it.

Prefer extending existing implementations over creating competing alternatives.

## 4. Architecture and Code Organization

Follow the repository's existing structure. Where appropriate, organize frontend code by feature and responsibility.

Suggested responsibilities:

- `app/`: routes, layouts, loading states, error boundaries, and page entry points.
- `components/`: reusable UI components.
- `features/`: feature-specific components and logic for projects, tasks, documents, messaging, meetings, and notifications.
- `hooks/`: reusable React hooks.
- `lib/`: shared utilities, configuration, and client initialization.
- `services/`: API requests and external service integration.
- `types/`: shared TypeScript interfaces and types.
- `providers/`: application-wide React providers, where needed.

These are recommendations, not mandatory folders. Adapt to the existing repository.

Keep components focused and reusable. Separate presentation, API communication, validation, and complex business logic where that improves maintainability.

Avoid giant page components, duplicated request logic, unnecessary abstractions, and excessive prop drilling.

## 5. TypeScript Standards

- Use TypeScript consistently.
- Define explicit types for API responses, request payloads, component props, and important domain entities.
- Reuse shared types when appropriate.
- Avoid `any`; use proper types, generics, `unknown`, or runtime validation when necessary.
- Represent nullable and optional fields accurately.
- Model API loading, success, empty, and error states explicitly.
- Do not use TypeScript type assertions as a substitute for validating untrusted API data.
- Do not duplicate backend data models blindly; represent the actual frontend-facing API contract.

For changes involving API responses, verify that the frontend types match the backend's real response shape.

## 6. Nexus Design System

Maintain a coherent, modern workspace interface.

Use the existing Nexus design tokens where available. The established palette is:

- Primary background: `#F8FAFC`
- Surface: `#FFFFFF`
- Secondary surface: `#F1F5F9`
- Primary text: `#0F172A`
- Secondary text: `#64748B`
- Borders: `#E2E8F0`
- Primary action: `#2563EB`
- Success: `#059669`
- Error: `#DC2626`

Use these colors consistently unless the existing implementation establishes updated design tokens.

Design principles:

- Clear visual hierarchy.
- Consistent spacing, typography, borders, and corner radii.
- Well-defined primary and secondary actions.
- Reusable buttons, inputs, dialogs, dropdowns, cards, badges, and tooltips.
- Restrained use of shadows, gradients, and animation.
- Consistent icon sizing and alignment.
- Appropriate contrast and visible focus states.
- Responsive layouts across mobile, tablet, laptop, and desktop.

Do not redesign unrelated pages when implementing a focused feature.

Avoid unnecessary visual changes to existing, approved designs.

## 7. Responsive Design and Accessibility

Every new or modified feature must work on supported screen sizes.

- Use responsive layouts and appropriate breakpoints.
- Prevent horizontal overflow except where intentionally required, such as a scrollable Kanban board.
- Ensure navigation, dialogs, dropdowns, forms, and tables remain usable on smaller screens.
- Use semantic HTML.
- Associate labels with form controls.
- Support keyboard navigation.
- Provide visible focus indicators.
- Use appropriate accessible names for icon-only buttons.
- Announce important status updates when appropriate.
- Respect reduced-motion preferences.
- Do not rely on color alone to communicate task states or errors.

Use accessible dialog and menu behavior instead of building incomplete custom interactions.

## 8. Next.js App Router Rules

- Follow the existing App Router conventions.
- Prefer Server Components when browser APIs and client-side interactivity are unnecessary.
- Add `"use client"` only where client-side state, event handlers, effects, or browser APIs are required.
- Keep client boundaries as small as practical.
- Do not access `window`, `document`, or browser storage during server rendering.
- Use the project's established approach for metadata, loading states, error boundaries, and route protection.
- Use appropriate navigation utilities rather than manually manipulating browser history.
- Avoid exposing server-only environment variables to client bundles.
- Use `NEXT_PUBLIC_` variables only for values intentionally exposed to the browser.

Do not convert entire route trees to Client Components without a genuine requirement.

## 9. API Integration with Nexus Backend

The frontend and backend are maintained in separate repositories.

Before integrating a feature:

1. Inspect the documented backend endpoint, HTTP method, request body, query parameters, and response shape.
2. Confirm authentication requirements and authorization behavior.
3. Confirm validation errors, status codes, pagination, and error response formats.
4. Reuse the existing API client or service layer.
5. Define or update the relevant TypeScript types.
6. Handle loading, success, empty, and error states.
7. Verify the integration against the available backend or appropriate test fixtures.

Use the existing backend base URL configuration. Do not hardcode deployment URLs throughout the application.

Use environment variables for API and Socket.IO endpoints when appropriate.

Do not invent API endpoints or assume a backend feature is implemented merely because the UI requires it.

If the backend contract is missing, document the missing requirement and implement only what can be completed safely without pretending the integration works.

## 10. Authentication and Authorization

Implement authentication according to the actual backend contract.

- Support the established login, registration, logout, and session restoration flows.
- Handle expired sessions and unauthorized responses consistently.
- Prevent protected pages from displaying private information while authentication is unresolved.
- Provide clear loading and failure states.
- Redirect users according to the existing authentication and navigation requirements.
- Avoid redirect loops.
- Do not place passwords, access tokens, refresh tokens, or other secrets in logs.
- Do not store sensitive credentials in localStorage as a convenient workaround.
- Prefer secure, HttpOnly cookies when supported by the backend architecture.
- If browser-accessible tokens are explicitly required by the existing design, follow the documented security model and minimize exposure.

Frontend route guards improve the user experience but do not replace backend authorization.

## 11. Nexus Roles and Permissions

Nexus supports the roles Owner, PM, Member, Viewer, and Collaborator.

Implement role-sensitive interfaces based on the actual permissions contract.

Examples:

- Owners may have workspace and project administration controls.
- PMs may have project and task management controls.
- Members may access permitted project tasks and collaboration tools.
- Viewers may have read-only access where defined.
- Collaborators may access only the resources explicitly granted to them.

These examples are not a substitute for the project's actual permission matrix.

Do not invent role permissions. Confirm the expected permissions from the backend contract and product requirements.

Hide or disable unauthorized actions where appropriate, but never treat frontend visibility checks as security enforcement.

Handle backend `403 Forbidden` responses correctly.

## 12. Project and Task Management

Nexus task workflows include:

`ASSIGNED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED`

`CHANGES_REQUESTED` is another relevant state.

Before implementing task features, confirm the backend's accepted status transitions and permissions.

The interface should support applicable features such as:

- Creating and editing projects and tasks.
- Assigning tasks to team members.
- Displaying task status, priority, due date, and assignee.
- Filtering, searching, and sorting.
- Kanban board interactions.
- Task details, comments, and activity history.
- Submission, review, approval, and change-request workflows.
- Progress indicators based on the backend's progress calculation.

Do not calculate authoritative project progress differently from the backend. Reuse its defined weighting and aggregation rules.

Validate forms and display actionable errors. Prevent duplicate submissions and provide appropriate feedback for failed mutations.

## 13. Collaborative Documents and Workspace Content

Support collaborative document and workspace experiences according to the existing product requirements.

- Preserve document content when editing or navigating.
- Handle unsaved changes appropriately.
- Provide clear save, saving, saved, and failure states.
- Use the backend's actual document and collaboration contracts.
- Handle concurrent edits and conflict responses explicitly when supported.
- Avoid claiming that collaboration is real-time if changes are only saved through ordinary HTTP requests.
- Preserve access restrictions for private projects and documents.

Use an existing editor library if the project has one. Do not add a large editor dependency without assessing its suitability.

## 14. Real-Time Communication

Nexus connects communication directly to project work.

Relevant features may include:

- Project and team conversations.
- Direct messages.
- Task-specific discussions.
- Mentions such as `@name`.
- Notifications for assignments, comments, and updates.
- Converting messages into tasks.
- Sharing relevant files and decisions.
- Starting meetings from projects, teams, or conversations.

Use Socket.IO client only when the backend exposes a compatible real-time gateway.

For real-time features:

1. Reuse a shared socket connection where appropriate.
2. Authenticate according to the server's actual socket authentication contract.
3. Subscribe to the correct rooms or channels through documented events.
4. Clean up event listeners when components unmount.
5. Prevent duplicate listeners and duplicate messages.
6. Handle reconnection and connection errors.
7. Reconcile real-time events with existing API data.
8. Respect project membership and access boundaries.
9. Avoid logging sensitive message content or credentials.

Do not invent socket event names, room names, or payload structures. Confirm them with the backend contract.

Use REST APIs for initial data loading or recovery where appropriate and real-time events for updates when supported.

## 15. Notifications

Provide a consistent notification experience for supported events.

Potential notification types include task assignments, comments, mentions, status changes, project updates, and direct messages.

- Use the backend's actual notification schema.
- Support read/unread states where available.
- Avoid duplicate notifications from HTTP responses and socket events.
- Update notification counts consistently.
- Handle loading, empty, and error states.
- Provide navigation to the relevant task, project, or conversation when the destination is available and accessible.
- Do not expose notifications for resources the user cannot access.

## 16. AI and Meeting Features

AI-assisted features and meeting experiences must follow the actual backend integrations.

- Display clear loading and processing states.
- Handle provider failures and timeouts.
- Validate user inputs.
- Avoid presenting fabricated AI output as verified project data.
- Show meeting summaries and action items only when returned by the relevant service.
- Respect permissions for transcripts, recordings, summaries, and meeting resources.
- Prevent accidental duplicate requests for expensive operations.
- Display a clear explanation when a feature is unavailable or not configured.

Do not expose AI provider keys or meeting-service credentials in frontend code.

Do not create mock AI or meeting results that appear to be real production data.

## 17. Forms and Validation

- Use the existing form library and validation approach where possible.
- Validate user input before submission.
- Match frontend validation to the backend's documented rules.
- Treat backend validation as authoritative.
- Show field-specific errors when the API provides enough information.
- Preserve user input when a request fails.
- Disable or otherwise protect submission while a request is in progress.
- Prevent accidental duplicate actions.
- Provide clear success and failure feedback.
- Ensure forms are accessible and usable with a keyboard.

Use confirmation dialogs for consequential actions, such as deleting a project or removing a member, where appropriate.

Do not use browser `alert()` for normal application feedback.

## 18. State Management and Data Fetching

Use the simplest approach that fits the feature and the existing codebase.

- Use local component state for isolated UI interactions.
- Use shared React context or an existing state library for appropriate cross-application state.
- Use the project's established data-fetching and caching strategy.
- Avoid duplicating server state unnecessarily.
- Keep loading, empty, error, and success states explicit.
- Prevent stale responses from overwriting newer user selections.
- Invalidate or update cached data after successful mutations as required.
- Avoid unnecessary re-renders and overly broad global state.

Do not introduce a new state management or data-fetching library without a clear need.

## 19. Security and Privacy

- Treat API responses and user-generated content as untrusted input.
- Render user content safely; do not use unsafe HTML injection without a thoroughly justified and sanitized implementation.
- Never embed API secrets or private service credentials in frontend bundles.
- Do not expose private workspace data through client-side caches or URLs unnecessarily.
- Avoid logging tokens, private messages, transcripts, or other sensitive information.
- Handle unauthorized and forbidden responses without exposing restricted content.
- Use secure authentication patterns supported by the backend.
- Follow the application's file upload restrictions and validation requirements.
- Do not rely on client-side role checks for access control.

## 20. Performance

- Use appropriate Server Components and client boundaries.
- Avoid unnecessary client-side JavaScript and large dependencies.
- Optimize images using the project's supported image handling.
- Use pagination or incremental loading for large lists where supported.
- Debounce search requests when appropriate.
- Avoid repeated API calls caused by unstable effects or duplicate event subscriptions.
- Use dynamic imports for genuinely expensive client-side features when beneficial.
- Avoid rendering large message histories or boards without considering performance.

Do not introduce premature memoization or complex caching without evidence of a problem.

## 21. Error Handling and User Feedback

Every important asynchronous interaction should have a predictable outcome.

Handle:

- Network failures.
- Invalid form submissions.
- Expired authentication.
- Unauthorized access.
- Missing or deleted resources.
- Conflicting updates.
- Socket disconnections.
- API validation errors.
- Server errors.
- Empty datasets.

Use consistent error messages and feedback components.

Do not silently swallow errors. Do not display raw stack traces, internal server errors, secrets, or unnecessary technical details to end users.

Provide retry options where appropriate.

## 22. Testing and Quality Checks

Use the testing tools already configured in the repository.

Depending on the feature, test:

- Component rendering and interactions.
- Form validation.
- Authentication and protected routes.
- Role-sensitive UI behavior.
- API loading and error states.
- Task state transitions.
- Notification behavior.
- Socket event subscriptions and cleanup.
- Responsive layouts and accessibility.
- Critical user journeys.

Before considering a change complete, run the applicable checks supported by the repository, such as:

- Linting.
- TypeScript type checking.
- Unit and component tests.
- Production build.

Inspect `package.json` to determine the real commands. Do not invent scripts or claim a check passed if it was not run.

If a check fails, report the failure and distinguish pre-existing problems from regressions introduced by the change when evidence permits.

## 23. Environment Configuration and Deployment

- Inspect existing environment variables before modifying configuration.
- Preserve `.env` and other local configuration files.
- Never commit credentials or private keys.
- Update `.env.example` when a new required variable is introduced, using placeholders rather than real secrets.
- Keep development and production URLs configurable.
- Confirm the production build works with the expected configuration.
- Verify deployment settings against the actual hosting platform.
- Do not claim that a deployment succeeded without confirmation.

The frontend must integrate with the deployed backend using the configured API and real-time endpoints.

## 24. Working with PHASES.md

Use `PHASES.md` as the source of truth for the frontend implementation roadmap.

Before starting a phase:

1. Read its objectives and acceptance criteria.
2. Inspect the existing implementation.
3. Identify dependencies on other phases and the backend.
4. Implement only the work required for the phase and necessary supporting changes.
5. Test the implementation.
6. Update progress only after verifying what was completed.
7. Document blockers and unresolved backend dependencies.

Do not mark a phase complete simply because its UI has been created. Verify the required interactions, integration, and acceptance criteria.

## 25. Definition of Done

A frontend feature is complete when:

- It meets the requirements for its active phase.
- It follows the existing Nexus design system.
- It is responsive and accessible.
- It uses the correct TypeScript types.
- It integrates with verified backend contracts where applicable.
- It handles loading, empty, success, and error states.
- It respects authentication and authorization requirements.
- It does not break existing functionality.
- Relevant lint, type-check, test, and build commands have been run as applicable.
- Any remaining limitations or backend dependencies are documented.

## 26. Agent Behavior

When working on Nexus frontend tasks:

- Inspect before editing.
- Explain the intended changes briefly before large or risky modifications.
- Preserve existing features, styles, and uncommitted work.
- Avoid deleting or replacing files unnecessarily.
- Do not overwrite `.env` or secrets.
- Do not install unnecessary dependencies.
- Do not fabricate API contracts or successful integrations.
- Keep changes focused and consistent with the current phase.
- Prefer production-quality implementations over decorative mockups.
- Report files changed, behavior implemented, checks performed, and outstanding issues.

When a requirement is unclear, inspect the existing code and documentation first. Ask for clarification only when the ambiguity materially affects the implementation.
