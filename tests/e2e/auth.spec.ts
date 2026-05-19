/**
 * Auth flow tests (unauthenticated paths).
 * These run WITHOUT the shared auth state so they test the public login/signup flows.
 */
import { test, expect } from "@playwright/test";

// Override storageState for this file — these tests run as a guest
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login page", () => {
  test("renders login form with email and password fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle(/login|sign in/i);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
  });

  test("shows validation error for empty submission", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // Either HTML5 required validation or a rendered error message
    const emailInput = page.getByLabel(/email/i);
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) =>
      el.validity?.valueMissing ?? false
    );
    const hasError = await page.getByText(/required|invalid|error/i).isVisible().catch(() => false);

    expect(isInvalid || hasError).toBe(true);
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill("nobody@ufar.am");
    await page.getByLabel(/password/i).fill("wrongpassword123");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // Should NOT redirect away
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/login/);
  });

  test("redirects unauthenticated user to login from protected route", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Registration page", () => {
  test("renders registration form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });
});
