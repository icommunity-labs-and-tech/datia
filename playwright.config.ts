import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'certification-flow',
      testMatch: '**/complete-state-certification.spec.ts',
      timeout: 120000, // 2 minutos para tests de certificación
      retries: 1, // Retry una vez para manejar fallos de red
      use: { 
        ...devices['Desktop Chrome'],
        // Configuración específica para tests de certificación
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
  ],
  webServer: {
    command: 'E2E_SQLITE=1 DATABASE_URL=file:./playwright-e2e.db E2E_SQLITE_URL=file:./playwright-e2e.db npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
