import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for UFARnet.
 * Tests assume the dev server is running at http://localhost:3000.
 * Run with: npx playwright test
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Re-use an auth state file so login only runs once
    storageState: "tests/e2e/.auth/user.json",
  },

  projects: [
    // Setup project: logs in and saves cookies
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
      use: { storageState: undefined },
    },
    // All real tests depend on the setup
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],

  webServer: process.env.CI
    ? {
        command: "npm run build && npm start",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
