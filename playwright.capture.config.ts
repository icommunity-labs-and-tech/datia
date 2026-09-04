import { defineConfig, devices } from '@playwright/test';

/**
 * Config for the report figures. Separate from the suite config because it runs
 * against an already-running server pointed at the demo dataset, signs in with
 * real credentials, and must not inherit the SQLite harness or its setup
 * project.
 *
 * Start the server first, then:
 *   npx playwright test --config=playwright.capture.config.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/_capture.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 180000,
  expect: { timeout: 20000 },
  use: {
    baseURL: 'http://localhost:3000',
    // The report is written in Spanish; without this the UI renders in English.
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    navigationTimeout: 60000,
    actionTimeout: 20000,
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
  projects: [{ name: 'capture', use: { ...devices['Desktop Chrome'] } }],
});
