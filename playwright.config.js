/**
 * Playwright Configuration
 *
 * Configuration for end-to-end tests of the Nexus frontend.
 *
 * Tests run against the local frontend development server
 * connected to the local backend via docker-compose.
 *
 * Run with: npm run test:e2e
 * CI:       playwright test --config=playwright.config.ci
 */

import { defineConfig, devices } from '@playwright/test';

module.exports = defineConfig({
  testDir: './playwright/tests',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  // Run tests in parallel so they complete faster
  fullyParallel: true,

  // Project for Chromium (primary browser for E2E)
  projects: [
    {
      name: 'Chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },
  ],

  // Reporter config
  reporter: [['list'], ['dot']],

  // Workers for CI
  workers: process.env.CI ? 1 : undefined,
});
