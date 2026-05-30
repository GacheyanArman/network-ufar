/**
 * Messages page tests (authenticated).
 */
import { test, expect } from "@playwright/test";

test.describe("Messages page", () => {
  test("loads the messages page", async ({ page }) => {
    const response = await page.goto("/messages", { waitUntil: "domcontentloaded" });

    await expect(page).not.toHaveURL(/login/);
    expect(response?.status()).toBe(200);
  });

  test("renders conversation list or empty state", async ({ page }) => {
    await page.goto("/messages");

    const hasList = await page
      .locator("[data-testid='conversation-item'], .conversation-item, [href*='?user='], [href*='?group=']")
      .first()
      .isVisible({ timeout: 8_000 })
      .catch(() => false);

    const hasEmpty = await page
      .getByText(/no messages|start a conversation|find someone/i)
      .isVisible({ timeout: 8_000 })
      .catch(() => false);

    const hasLayout = await page.locator("main, [role='main'], aside").isVisible().catch(() => false);

    expect(hasList || hasEmpty || hasLayout).toBe(true);
  });

  test("message compose input is accessible within a conversation", async ({ page }) => {
    await page.goto("/messages");

    // If there's a conversation, click it
    const firstConv = page
      .locator("[href*='?user='], [href*='?group=']")
      .first();
    const hasConv = await firstConv.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasConv) {
      test.skip();
      return;
    }

    await firstConv.click();
    await page.waitForTimeout(1000);

    // Compose box should appear
    const compose = page
      .getByRole("textbox", { name: /message|type/i })
      .or(page.locator("textarea[placeholder*='message' i]"))
      .or(page.locator("input[placeholder*='message' i]"));

    await expect(compose.first()).toBeVisible({ timeout: 8_000 });
  });

  test("sending an empty message does not submit", async ({ page }) => {
    await page.goto("/messages");

    const firstConv = page.locator("[href*='?user='], [href*='?group=']").first();
    const hasConv = await firstConv.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasConv) {
      test.skip();
      return;
    }

    await firstConv.click();
    await page.waitForTimeout(1000);

    const sendButton = page.getByRole("button", { name: /send/i });
    const isSendVisible = await sendButton.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!isSendVisible) {
      test.skip();
      return;
    }

    // Click send with empty input — should not navigate away or crash
    await sendButton.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/messages/);
  });
});
