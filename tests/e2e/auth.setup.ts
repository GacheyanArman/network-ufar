/**
 * Auth setup — runs once before all other tests.
 * Logs in with test credentials and saves the session cookies to
 * tests/e2e/.auth/user.json so other tests can skip the login step.
 *
 * Set these env vars before running tests:
 *   TEST_USER_EMAIL=student@ufar.am
 *   TEST_USER_PASSWORD=yourpassword
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || "test@ufar.am";
  const password = process.env.TEST_USER_PASSWORD || "testpassword";

  await page.goto("/login");

  // Fill login form
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for redirect to dashboard or home
  await page.waitForURL((url) =>
    !url.pathname.includes("/login") && !url.pathname.includes("/onboarding"),
    { timeout: 15_000 }
  );

  // Verify we are authenticated
  await expect(page).not.toHaveURL(/login/);

  // Save auth state (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});
