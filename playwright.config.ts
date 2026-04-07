import { defineConfig, devices } from '@playwright/test';

/** Dedicated port so Playwright does not attach to an unrelated app on :3000 when reuseExistingServer is true. */
const defaultPort = process.env.PLAYWRIGHT_PORT ?? '3333';
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${defaultPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: ['**/mobile.spec.ts'] },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  // When PLAYWRIGHT_BASE_URL is set, the app is assumed running; otherwise start dev on PLAYWRIGHT_PORT (default 3333).
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        /** Production server avoids `.next/dev/lock` clashes when a separate `next dev` is already running. */
        command: `sh -c 'npm run build && npx next start -H 127.0.0.1 -p ${defaultPort}'`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 300_000,
      },
});
