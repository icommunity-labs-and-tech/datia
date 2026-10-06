import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Report captures run on demand against the demo dataset, not as part of the
  // suite; see playwright.capture.config.ts.
  testIgnore: '**/_capture.spec.ts',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: 'html',
  timeout: 60000, // Increase test timeout to 60 seconds
  expect: {
    timeout: 10000, // Increase assertion timeout to 10 seconds
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000, // Increase navigation timeout to 30 seconds
    actionTimeout: 10000, // Increase action timeout to 10 seconds
  },
  projects: [
    // Signs in once and saves the session; browser projects depend on it so
    // specs don't re-login per test and trip the login rate limiter.
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: ['**/_capture.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      // iBS double: the KYC and certification flows call it instead of the real API.
      command: 'node tests/e2e/support/ibs-stub.mjs',
      url: 'http://127.0.0.1:4010/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      // Inherited from the shell when set, so a run can point at its own database.
      env: {
        E2E_SQLITE: process.env.E2E_SQLITE ?? '1',
        DATABASE_URL: process.env.DATABASE_URL ?? 'file:./playwright-e2e.db',
        E2E_SQLITE_URL: process.env.E2E_SQLITE_URL ?? 'file:./playwright-e2e.db',
        IBS_BASE_URL: 'http://127.0.0.1:4010/v2',
        IBS_TOKEN: 'e2e-ibs-token-do-not-use-in-prod',
      },
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
