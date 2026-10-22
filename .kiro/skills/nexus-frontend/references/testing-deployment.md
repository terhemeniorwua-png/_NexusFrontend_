# Nexus Frontend — Testing and Deployment Reference

## Available Scripts (Phase 0 Baseline)

```bash
npm run dev     # Development server
npm run build   # Production build (also runs TypeScript check)
npm run start   # Start production server (requires build first)
npm run lint    # ESLint 9.x
```

No `test` script exists yet. It will be added in Phase 1 when the test framework is selected and configured.

## Test Framework Setup (Phase 1)

Install after team confirmation:

```bash
# Recommended: Vitest + Testing Library
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## Test File Conventions

- Co-locate test files with components: `Button.test.tsx` next to `Button.tsx`.
- Or use `__tests__/` directories within feature folders.
- Use `.test.tsx` for component tests and `.test.ts` for utility/hook tests.

## Critical Tests by Priority

### Must have before Phase 3
- Core UI component tests (Phase 1 deliverable).

### Must have before Phase 4
- `useAuth` hook tests.
- Login form tests.
- Route protection redirect tests.

### Must have before Phase 6
- `usePermissions` with all role values.
- Project CRUD component tests.

### Must have before Phase 9
- Task creation and status change tests.
- Kanban drag-and-drop optimistic update and rollback tests.

### Must have before Phase 14
- All service function unit tests.
- All custom hook unit tests.
- API error state tests for each status code.
- Socket event handler tests.
- Critical user journey integration tests.
- Security checklist verified.

## Environment Files

| File | Committed? | Purpose |
|---|---|---|
| `.env.example` | Yes (placeholders only) | Documents required variables |
| `.env.local` | No (in .gitignore) | Local development values |
| `.env.production` | No | Production values (use hosting platform) |

Never commit real values. Never expose secrets in `NEXT_PUBLIC_` variables.

## Required Environment Variables

```dotenv
# .env.example — commit this with placeholder values
NEXT_PUBLIC_API_URL=http://localhost:5100/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5100
```

Add new variables to `.env.example` as they are discovered during implementation.

## Production Deployment Command Sequence

```bash
# 1. Verify
npm run lint
npx tsc --noEmit
npm test
npm run build

# 2. Configure production environment variables in hosting platform
# 3. Deploy using hosting platform CLI
# 4. Perform smoke test against staging
```

**Do not deploy to production without explicit authorization from the project owner.**
