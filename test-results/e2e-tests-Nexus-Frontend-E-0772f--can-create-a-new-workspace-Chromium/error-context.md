# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-tests.spec.ts >> Nexus Frontend E2E >> create workspace — authenticated user can create a new workspace
- Location: playwright/tests/e2e-tests.spec.ts:63:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: Channel closed
```

```
Error: page.goto: net::ERR_ABORTED at http://localhost:3000/sign-in
Call log:
  - navigating to "http://localhost:3000/sign-in", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * End-to-End Tests for Nexus Frontend
  3   |  *
  4   |  * Tests: sign-up and verify, sign-in, create workspace, create project,
  5   |  * create task, move task on the board, send a channel message in two browser
  6   |  * contexts and see it live, create an invitation.
  7   |  *
  8   |  * Run with: npm run test:e2e
  9   |  * CI:       playwright test --config=playwright.config.ci
  10  |  */
  11  | 
  12  | import { test, expect, devices } from '@playwright/test';
  13  | 
  14  | test.describe('Nexus Frontend E2E', () => {
  15  |   test.beforeEach(async ({ page }, info) => {
  16  |     // Before each test, go to the sign-in page
> 17  |     await page.goto('/sign-in');
      |                ^ Error: page.goto: net::ERR_ABORTED at http://localhost:3000/sign-in
  18  |     // Set default timeout for all assertions
  19  |     test.setTimeout(60000);
  20  |   });
  21  | 
  22  |   // ── 1. Sign-up and verify ──────────────────────────────────────────────
  23  |   test('sign-up and verify — new user registration with email verification', async ({ page }) => {
  24  |     // Go to sign-up page
  25  |     await page.goto('/sign-up');
  26  | 
  27  |     // Fill registration form
  28  |     await page.fill('input[name="name"]', 'Test User');
  29  |     await page.fill('input[name="email"]', 'test+e2e@example.com');
  30  |     await page.fill('input[name="password"]', 'Password123!');
  31  | 
  32  |     // Submit registration
  33  |     await page.click(button => button.hasText('Create account'));
  34  | 
  35  |     // Wait for verification email success message or redirect
  36  |     await expect(page.locator('[role="alert"]')).toContainText(/account created/i);
  37  | 
  38  |     // TODO: In a real E2E flow, we would click the verification link
  39  |     // sent to the email. For this test, we verify the registration succeeded.
  40  |     await expect(page).toHaveURL(/.*\/sign-in/);
  41  |   });
  42  | 
  43  |   // ── 2. Sign-in ─────────────────────────────────────────────────────────
  44  |   test('sign-in — authenticated user can log in', async ({ page }) => {
  45  |     // Go to sign-in page
  46  |     await page.goto('/sign-in');
  47  | 
  48  |     // Fill login form
  49  |     await page.fill('input[name="email"]', 'test+e2e@example.com');
  50  |     await page.fill('input[name="password"]', 'Password123!');
  51  | 
  52  |     // Submit login
  53  |     await page.click(button => button.hasText('Sign in'));
  54  | 
  55  |     // Should be redirected to the workspace/dashboard page
  56  |     await expect(page).toHaveURL('/app');
  57  | 
  58  |     // User profile should be visible
  59  |     await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
  60  |   });
  61  | 
  62  |   // ── 3. Create workspace ────────────────────────────────────────────────
  63  |   test('create workspace — authenticated user can create a new workspace', async ({ page }) => {
  64  |     // Navigate to workspace creation
  65  |     await page.goto('/app/workspaces');
  66  | 
  67  |     // Click create workspace button
  68  |     await page.click('text=Create workspace');
  69  | 
  70  |     // Fill workspace name
  71  |     await page.fill('input[name="name"]', 'E2E Test Workspace');
  72  | 
  73  |     // Select workspace type
  74  |     await page.selectOption('select[name="type"]', 'COMPANY');
  75  | 
  76  |     // Submit creation
  77  |     await page.click(button => button.hasText('Create'));
  78  | 
  79  |     // Wait for workspace to appear in the list
  80  |     await expect(page.locator('text=E2E Test Workspace')).toBeVisible({ timeout: 15000 });
  81  |   });
  82  | 
  83  |   // ── 4. Create project ──────────────────────────────────────────────────
  84  |   test('create project — authenticated user can create a project in workspace', async ({ page }) => {
  85  |     // First, ensure we're in the right workspace
  86  |     await page.goto('/app/workspaces');
  87  | 
  88  |     // Click on the E2E Test Workspace (created in test 3)
  89  |     await page.click('text=E2E Test Workspace');
  90  | 
  91  |     // Navigate to projects page
  92  |     await page.click('text=Projects');
  93  | 
  94  |     // Click create project
  95  |     await page.click('text=Create project');
  96  | 
  97  |     // Fill project name
  98  |     await page.fill('input[name="name"]', 'E2E Test Project');
  99  | 
  100 |     // Set project visibility
  101 |     await page.selectOption('select[name="visibility"]', 'PRIVATE');
  102 | 
  103 |     // Submit creation
  104 |     await page.click(button => button.hasText('Create project'));
  105 | 
  106 |     // Wait for project to appear
  107 |     await expect(page.locator('text=E2E Test Project')).toBeVisible({ timeout: 15000 });
  108 |   });
  109 | 
  110 |   // ── 5. Create task ─────────────────────────────────────────────────────
  111 |   test('create task — authenticated user can create a task in a project', async ({ page }) => {
  112 |     // Navigate to the project's tasks page
  113 |     await page.goto('/app/projects');
  114 | 
  115 |     // Click on the E2E Test Project
  116 |     await page.click('text=E2E Test Project');
  117 | 
```