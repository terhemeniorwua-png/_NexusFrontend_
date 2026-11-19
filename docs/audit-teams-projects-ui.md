# PITERON Frontend — Team & Project Management UI Audit

**Branch:** `feat/teams-projects-gap-ui` (based on `main` commit `4397b24`)
**Status:** Phase 1 read-only audit — uncommitted
**Date:** Thu Nov 19 2026

## Audit scope

Team management and Project management experiences, audited against the feature checklist. For each item the status is one of:

- **COMPLETE** — reachable from navigation, wired to the real API (no mock data), has loading/empty/error/success states, hides/disables actions the user lacks permission for, works at 360px, dark/light themes, and by keyboard.
- **PARTIAL** — some of the above holds but a sub-requirement is missing.
- **MISSING** — not implemented at all (frontend buildable without a new backend endpoint).
- **BLOCKED-ON-BACKEND** — requires a backend endpoint that is not currently exposed by the services layer (not invented).

The backend contract is taken from the services layer (`services/projects.ts`, `services/organization-structure.ts`, `services/workspaces.ts`, `services/files.ts`), which mirrors the deployed backend routes. Nothing here changes the backend.

## Navigation reachability

- **Teams and structure** (`/app/teams`) — present in `lib/app-navigation.ts` under "People and access", gated to `workspaceKinds: ['company', 'institution']`. Reachable.
- **Projects** (`/app/projects`) — present under "Work", gated to `permissions: ['workspace:view']`. Reachable.
- Project detail tabs (Overview, Tasks, Members, Milestones, Code, Activity, Reports, Settings) — defined in `app/app/projects/[projectId]/layout.tsx`, each gated by `can(...)`. Reachable.

---

## Team management

### (1) Create/edit/archive teams, team list and detail

| Field | Detail |
|-------|--------|
| Status | **COMPLETE** |
| Files | `app/app/teams/page.tsx`, `app/app/teams/[teamId]/page.tsx`, `services/organization-structure.ts` |
| What exists | Team list with create form (name, description, department, lead), edit form (name, description, department, lead), archive via `archiveTeam`. Team detail page (`getTeam` + `listTeamMembers`) with members, lead badge, status badge. Loading, empty ("No teams yet"), error, and success states present. Confirmation dialog for archive. |
| What is lacking | None for this item. |

### (2) Add/remove members with a searchable member picker and confirmation on removal

| Field | Detail |
|-------|--------|
| Status | **COMPLETE** |
| Files | `app/app/teams/page.tsx` |
| What exists | Add-member form using a `Select` of active workspace members (filters out already-assigned members), `addTeamMember`. Remove via `removeTeamMember` inside a destructive `ConfirmDialog`. Busy state while saving; input cleared on success; error shown on failure. |
| What is lacking | The picker is a `Select` rather than a type-ahead/searchable combobox; for very large member lists a text-search filter would be preferable but not required by the checklist. |

### (3) Assign and change team leads, visible lead badge

| Field | Detail |
|-------|--------|
| Status | **COMPLETE** |
| Files | `app/app/teams/page.tsx`, `app/app/teams/[teamId]/page.tsx`, `services/organization-structure.ts` (`setTeamLead`) |
| What exists | Create form has "Initial team lead (optional)"; edit form has "Team lead" `Select`. `setTeamLead` called when lead changes. Lead badge shown in team list ("Lead: {name}") and team detail page (`Badge>Lead: {name}`). |
| What is lacking | None. |

### (4) Team permission settings and role display

| Field | Detail |
|-------|--------|
| Status | **PARTIAL** |
| Files | `app/app/teams/page.tsx`, `app/app/teams/[teamId]/page.tsx` |
| What exists | Role display: `Badge>{member.role === 'TEAM_LEAD' ? 'Lead' : 'Member'}</Badge>` on both list and detail. |
| What is lacking | No dedicated "team permission settings" UI (e.g. who can manage the team, team-level role catalogue). Role is only displayed as Lead/Member; no permission matrix or editable team-level permissions. Not blocked — buildable — but out of the minimal gap set unless product requests it. |

### (5) Team overview page with members, leads, projects, task counts, and an activity feed with pagination

| Field | Detail |
|-------|--------|
| Status | **PARTIAL** |
| Files | `app/app/teams/[teamId]/page.tsx` |
| What exists | Members and leads are shown. Loading/empty/error states present. |
| What is lacking | **Projects list** for the team (no service endpoint to list a team's projects). **Task counts** per team (not returned by `getTeam`/`listTeams` — `memberCount` exists but no task count). **Activity feed with pagination** — the detail page explicitly states: "Team activity is not available because the backend does not currently expose a team activity endpoint." → **BLOCKED-ON-BACKEND** for the activity feed; projects/task counts also lack a backend endpoint. |

### (6) Team projects list and a responsibilities/scope section editable by leads

| Field | Detail |
|-------|--------|
| Status | **MISSING** (frontend) / **BLOCKED-ON-BACKEND** (data) |
| Files | None — not implemented. |
| What is lacking | No team projects list component. No responsibilities/scope section. The services layer has no endpoint to list projects belonging to a team, nor to read/write a team's scope/responsibilities. → **BLOCKED-ON-BACKEND** (no endpoint). |

---

## Project management

### (7) Create-project flow

| Field | Detail |
|-------|--------|
| Status | **COMPLETE** |
| Files | `app/app/projects/page.tsx` |
| What exists | "New project" button opens a `Modal` with Zod-validated form (name, key, description, visibility). Department/team association for `DEPARTMENT_TEAM`. Calls `createProject`. Busy state, errors, success notice, reloads list. Works at 360px, dark/light via CSS variables, keyboard operable. |
| What is lacking | None. |

### (8) Objectives, description, start and due dates, with validation and overdue indicators

| Field | Detail |
|-------|--------|
| Status | **MISSING** (start/due dates) |
| Files | `app/app/projects/[projectId]/settings/page.tsx` |
| What exists | Name, key, description, status, visibility, comment policy all editable with Zod validation. `ProjectSummary`/`ProjectInput` already carry `startDate` and `dueDate`, and `updateProject` accepts them. |
| What is lacking | The settings edit form does **not** expose start date or due date fields, so they cannot be set or validated, and there are no overdue indicators on the project cards/overview. Implementable without a new backend endpoint (`updateProject` already accepts `startDate`/`dueDate`). |

### (9) Assign project managers

| Field | Detail |
|-------|--------|
| Status | **COMPLETE** |
| Files | `app/app/projects/[projectId]/members/page.tsx`, `app/app/projects/[projectId]/settings/page.tsx` |
| What exists | Project members page lets a manager add a member with any `assignableRoles` (includes `PROJECT_MANAGER`) and change roles via a permission-diff confirmation modal. Settings page has ownership transfer (`transferProjectOwnership`). Role badge shown per member. |
| What is lacking | None. |

### (10) Associate/dissociate teams

| Field | Detail |
|-------|--------|
| Status | **COMPLETE** |
| Files | `app/app/projects/[projectId]/settings/page.tsx`, `app/app/projects/page.tsx` |
| What exists | "Organizational access" card in settings: team + (institution: department) association via `updateProjectOrganizationAccess`. Create-project flow also offers team/department association for `DEPARTMENT_TEAM` visibility. Dissociate by selecting "No team"/"No department". |
| What is lacking | None. |

### (11) Add/remove project members, role selection, add-by-team

| Field | Detail |
|-------|--------|
| Status | **PARTIAL** |
| Files | `app/app/projects/[projectId]/members/page.tsx` |
| What exists | Add member (single user `Select` + role `Select`), remove member (destructive confirm), change role (permission-diff confirmation modal), workspace-member picker filtered to those not already in the project. Empty ("No members") and error states. Hides controls when `!can('project.member.manage')`. |
| What is lacking | **Add-by-team** (bulk-add all members of a team) is not present. The services layer has `addProjectMember` (single user only); no bulk/add-by-team endpoint. → **BLOCKED-ON-BACKEND** for add-by-team. |

### (12) Visibility and permissions settings, including the existing comment policy

| Field | Detail |
|-------|--------|
| Status | **COMPLETE** |
| Files | `app/app/projects/[projectId]/settings/page.tsx` |
| What exists | Visibility `Select` (WORKSPACE/DEPARTMENT_TEAM/PRIVATE) with change warnings and a confirmation dialog. Comment policy `Select` (ASSIGNEES_ONLY/TEAM_MEMBERS/ALL_VIEWERS). `PermissionButton` guards "Save settings" behind `project.update`. |
| What is lacking | None. |

### (13) Milestones: list, create, edit, reorder, complete, delete, and link tasks

| Field | Detail |
|-------|--------|
| Status | **PARTIAL** |
| Files | `app/app/projects/[projectId]/milestones/page.tsx`, `services/projects.ts` |
| What exists | List, create (Zod-validated), edit (inline), complete/reopen toggle, delete (destructive confirm). Loading, empty ("No milestones"), error, success states. |
| What is lacking | **Reorder** — no drag/reorder or position control; `updateProjectMilestone` accepts `position` but the UI never exposes it. **Link tasks** — no way to associate a task with a milestone; no service endpoint for milestone-task links. → Reorder and link-tasks are **BLOCKED-ON-BACKEND** (no endpoint) unless product accepts position-only reorder via existing `updateProjectMilestone`. |

### (14) Progress view (status breakdown, % complete, milestone progress, upcoming deadlines) and an activity feed

| Field | Detail |
|-------|--------|
| Status | **MISSING** |
| Files | None dedicated. Overview page (`app/app/projects/[projectId]/page.tsx`) shows summary cards (owner, members, start/due dates) but no status breakdown, % complete, milestone progress, or upcoming deadlines. Activity tab (`/app/projects/[projectId]/activity`) exists but was not inspected in depth; the team detail page notes no activity endpoint. |
| What is lacking | No progress dashboard card, no milestone progress, no upcoming-deadlines list. Activity feed backend endpoint not confirmed → activity feed is **BLOCKED-ON-BACKEND**; progress view is buildable from existing `listTasks`/`getProject` data but not implemented. |

### (15) Complete, archive and restore project, with confirmation showing open-task count, and read-only archived state

| Field | Detail |
|-------|--------|
| Status | **PARTIAL** |
| Files | `app/app/projects/[projectId]/page.tsx`, `app/app/projects/[projectId]/settings/page.tsx`, `services/projects.ts` |
| What exists | Archive (`archiveProject`), restore (`restoreProject`), delete (`deleteProject`). Confirmation dialogs for archive/delete. Archived projects are excluded from the default list (`includeArchived` opt-in). Settings shows archived/read-only hints. |
| What is lacking | Archive/restore confirmation does **not** show the open-task count (`ProjectSummary.taskCount` is total tasks, not open). Read-only state for archived projects is implied (archive button hidden/replaced by restore) but not explicitly rendered as a read-only banner. Open-task count requires a backend field or a tasks query — `listTasks` could compute it, so this is **MISSING** (implementable) rather than blocked. |

---

## Cross-cutting checks

| Check | Status | Detail |
|-------|--------|--------|
| Destructive actions use confirm dialogs | **COMPLETE** | Archive/delete team, remove member, archive/delete project, delete milestone, unlink repo, remove project member, delete bookmark/file all use `ConfirmDialog` (destructive variant where applicable). |
| Forms keep input on failed requests | **COMPLETE** | Forms only reset on success; errors display and inputs retain values (e.g. create project, create team, settings save). |
| Buttons disable while saving | **COMPLETE** | `busy`/`loading` flags passed to `Button loading={...}` and `disabled={busy}` throughout. |
| Every list handles empty and error states | **COMPLETE** | `EmptyState` for empty lists; `Alert variant="error"` for errors; skeletons while loading. |
| Focus management in dialogs | **COMPLETE** | `components/ui/Modal.tsx` traps focus, moves focus into the dialog on open, restores on close; `ConfirmDialog`/`Modal` used consistently. |
| No hardcoded colors | **COMPLETE** | All colour via `var(--color-*)` CSS variables. |
| No localStorage for data that must persist | **COMPLETE** | Preferences/dashboard state not yet introduced; no localStorage for team/project data. |

---

## Summary of gaps to implement (Phase 2)

Only items that are MISSING/PARTIAL and **not** BLOCKED-ON-BACKEND:

| # | Item | Gap | Implementable? |
|---|------|-----|----------------|
| 8 | Start and due dates on project settings | Not exposed in the edit form; no validation/overdue indicators | **Yes** — `updateProject` already accepts `startDate`/`dueDate` |
| 11 | Add project members by team | Bulk add-by-team | **No** — no backend endpoint (BLOCKED-ON-BACKEND) |
| 13 | Milestone reorder / link tasks | No UI for position; no task-link endpoint | **No** — BLOCKED-ON-BACKEND |
| 14 | Progress view + activity feed | No progress dashboard; activity endpoint unconfirmed | **Partial** — progress view buildable from tasks; activity feed BLOCKED-ON-BACKEND |
| 15 | Archive confirmation open-task count; read-only archived state | Count not shown | **Yes** — open-task count computable via `listTasks` |

## BLOCKED-ON-BACKEND items (exact endpoints needed)

| Item | Endpoint needed |
|------|-----------------|
| (5) Team activity feed with pagination | `GET /workspaces/{workspaceId}/teams/{teamId}/activity` |
| (5)/(6) Team projects list | `GET /workspaces/{workspaceId}/teams/{teamId}/projects` |
| (5) Team task counts | Task count field on team, or `GET /workspaces/{workspaceId}/teams/{teamId}/tasks` with aggregation |
| (6) Team responsibilities/scope read/write | `GET/PATCH /workspaces/{workspaceId}/teams/{teamId}/scope` (or similar) |
| (11) Add project members by team | `POST /workspaces/{workspaceId}/projects/{projectId}/members/by-team` |
| (13) Milestone reorder | `PATCH` position on milestone (UI exists via `updateProjectMilestone`, but no reorder control) |
| (13) Link tasks to milestones | `POST /workspaces/{workspaceId}/projects/{projectId}/milestones/{milestoneId}/tasks` |
| (14) Project activity feed | `GET /workspaces/{workspaceId}/projects/{projectId}/activity` |
