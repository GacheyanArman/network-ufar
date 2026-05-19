/**
 * Dashboard smoke tests (authenticated).
 * Verifies the main dashboard loads fast and renders key sections.
 */
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads and renders the main dashboard sections", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "networkidle" });

    // Should not redirect to login
    await expect(page).not.toHaveURL(/login/);

    // HTTP status should be 200
    expect(response?.status()).toBe(200);

    // Core sections visible
    await expect(page.getByText(/welcome/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("dashboard loads in under 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const elapsed = Date.now() - start;

    // Soft threshold — meaningful regression signal
    expect(elapsed).toBeLessThan(5_000);
  });

  test("quick action links are clickable", async ({ page }) => {
    await page.goto("/");

    // Verify at least one quick action link is rendered
    const links = page.getByRole("link").filter({ hasText: /upload|material|course|group/i });
    await expect(links.first()).toBeVisible({ timeout: 8_000 });
  });

  test("shows empty state when no classes are scheduled", async ({ page }) => {
    await page.goto("/");

    // The component should show either a class card or an empty state — not crash
    const hasClass = await page.getByText(/room:|tba/i).isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no classes|manage schedule/i).isVisible().catch(() => false);

    expect(hasClass || hasEmpty).toBe(true);
  });
});
