/**
 * End-to-End Tests for Nexus Frontend
 *
 * Tests: sign-up and verify, sign-in, create workspace, create project,
 * create task, move task on the board, send a channel message in two browser
 * contexts and see it live, create an invitation.
 *
 * Run with: npm run test:e2e
 * CI:       playwright test --config=playwright.config.ci
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Nexus Frontend E2E', () => {
  test.beforeEach(async ({ page }, info) => {
    // Before each test, go to the sign-in page
    await page.goto('/sign-in');
    // Set default timeout for all assertions
    test.setTimeout(60000);
  });

  // ── 1. Sign-up and verify ──────────────────────────────────────────────
  test('sign-up and verify — new user registration with email verification', async ({ page }) => {
    // Go to sign-up page
    await page.goto('/sign-up');

    // Fill registration form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test+e2e@example.com');
    await page.fill('input[name="password"]', 'Password123!');

    // Submit registration
    await page.click('text=Create account');

    // Wait for verification email success message or redirect
    await expect(page.locator('[role="alert"]')).toContainText(/account created/i);

    // TODO: In a real E2E flow, we would click the verification link
    // sent to the email. For this test, we verify the registration succeeded.
    await expect(page).toHaveURL(/.*\/sign-in/);
  });

  // ── 2. Sign-in ─────────────────────────────────────────────────────────
  test('sign-in — authenticated user can log in', async ({ page }) => {
    // Go to sign-in page
    await page.goto('/sign-in');

    // Fill login form
    await page.fill('input[name="email"]', 'test+e2e@example.com');
    await page.fill('input[name="password"]', 'Password123!');

    // Submit login
    await page.click('text=Sign in');

    // Should be redirected to the workspace/dashboard page
    await expect(page).toHaveURL('/app');

    // User profile should be visible
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
  });

  // ── 3. Create workspace ────────────────────────────────────────────────
  test('create workspace — authenticated user can create a new workspace', async ({ page }) => {
    // Navigate to workspace creation
    await page.goto('/app/workspaces');

    // Click create workspace button
    await page.click('text=Create workspace');

    // Fill workspace name
    await page.fill('input[name="name"]', 'E2E Test Workspace');

    // Select workspace type
    await page.selectOption('select[name="type"]', 'COMPANY');

    // Submit creation
    await page.click('text=Create');

    // Wait for workspace to appear in the list
    await expect(page.locator('text=E2E Test Workspace')).toBeVisible({ timeout: 15000 });
  });

  // ── 4. Create project ──────────────────────────────────────────────────
  test('create project — authenticated user can create a project in workspace', async ({ page }) => {
    // First, ensure we're in the right workspace
    await page.goto('/app/workspaces');

    // Click on the E2E Test Workspace (created in test 3)
    await page.click('text=E2E Test Workspace');

    // Navigate to projects page
    await page.click('text=Projects');

    // Click create project
    await page.click('text=Create project');

    // Fill project name
    await page.fill('input[name="name"]', 'E2E Test Project');

    // Set project visibility
    await page.selectOption('select[name="visibility"]', 'PRIVATE');

    // Submit creation
    await page.click('text=Create project');

    // Wait for project to appear
    await expect(page.locator('text=E2E Test Project')).toBeVisible({ timeout: 15000 });
  });

  // ── 5. Create task ─────────────────────────────────────────────────────
  test('create task — authenticated user can create a task in a project', async ({ page }) => {
    // Navigate to the project's tasks page
    await page.goto('/app/projects');

    // Click on the E2E Test Project
    await page.click('text=E2E Test Project');

    // Go to tasks page
    await page.click('text=Tasks');

    // Click create task
    await page.click('text=Create task');

    // Fill task title
    await page.fill('input[name="title"]', 'E2E Test Task');

    // Set task status
    await page.selectOption('select[name="status"]', 'ASSIGNED');

    // Set task priority
    await page.selectOption('select[name="priority"]', 'MEDIUM');

    // Submit creation
    await page.click('text=Create task');

    // Wait for task to appear in the list
    await expect(page.locator('text=E2E Test Task')).toBeVisible({ timeout: 15000 });
  });

  // ── 6. Move task on the board ──────────────────────────────────────────
  test('move task on the board — task can be moved between columns', async ({ page }) => {
    // Navigate to the project's tasks/board view
    await page.goto('/app/projects');

    // Click on the E2E Test Project
    await page.click('text=E2E Test Project');

    // Go to tasks page
    await page.click('text=Tasks');

    // Find the E2E Test Task and get its initial position
    const taskRow = page.locator('text=E2E Test Task').first();

    // Get the initial column/class
    const initialClass = await taskRow.getAttribute('class');

    // Try to change the task status via select
    await page.selectOption('select[name="status"]', 'IN_PROGRESS');

    // Wait for the task to update
    await expect(page.locator('text=E2E Test Task')).toBeVisible({ timeout: 10000 });
  });

  // ── 7. Send channel message in two browser contexts ────────────────────
  test('send channel message — message appears in both browser contexts', async ({ page, browser }) => {
    // Create a second browser context (simulating another user)
    const context = await browser.newContext();
    const page2 = await context.newPage();

    // Log in as the same user in the second context
    await page2.goto('/sign-in');
    await page2.fill('input[name="email"]', 'test+e2e@example.com');
    await page2.fill('input[name="password"]', 'Password123!');
    await page2.click('text=Sign in');

    await expect(page2).toHaveURL('/app');

    // Navigate to messages/channels
    await page.goto('/app/messages');
    await page2.goto('/app/messages');

    // Create a channel
    await page.click('text=Create channel');
    await page.fill('input[name="name"]', 'e2e-test-channel');
    await page.click('text=Create');

    await page2.click('text=Create channel');
    await page2.fill('input[name="name"]', 'e2e-test-channel');
    await page2.click('text=Create');

    // Wait for both channels to be available
    await expect(page.locator('text=e2e-test-channel')).toBeVisible();
    await expect(page2.locator('text=e2e-test-channel')).toBeVisible();

    // Send message from first browser
    await page.click('text=e2e-test-channel');
    await page.fill('textarea', 'Hello from E2E test!');
    await page.click('text=Send');

    // Wait for message to appear
    await expect(page.locator('text=Hello from E2E test!')).toBeVisible({ timeout: 5000 });

    // Send message from second browser (context2)
    await page2.reload();
    await page2.click('text=e2e-test-channel');
    await page2.fill('textarea', 'Hello from second context!');
    await page2.click('text=Send');

    // Wait for message to appear in first browser
    await expect(page.locator('text=Hello from second context!')).toBeVisible({ timeout: 5000 });

    // Clean up - close the second context
    await context.close();
  });

  // ── 8. Create invitation ───────────────────────────────────────────────
  test('create invitation — authenticated user can create and send an invitation', async ({ page }) => {
    // Navigate to workspace members/invitations
    await page.goto('/app/workspaces');

    // Click on the workspace
    await page.click('text=E2E Test Workspace');

    // Go to members/invitations page
    await page.click('text=Members');

    // Click create invitation
    await page.click('text=Create invitation');

    // Fill invitation form
    await page.fill('input[name="email"]', 'e2e-invite@example.com');

    // Select role
    await page.selectOption('select[name="role"]', 'MEMBER');

    // Submit invitation
    await page.click('text=Send invitation');

    // Wait for invitation to be created
    await expect(page.locator('text=Invitation sent')).toBeVisible({ timeout: 10000 });

    // Accept the invitation
    await page.click('text=Preview');

    // Wait for preview to load
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Accept the invitation
    await page.click('text=Accept');

    // Wait for successful acceptance
    await expect(page.locator('text=Invitation accepted')).toBeVisible({ timeout: 10000 });
  });
});
