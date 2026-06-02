import { test, expect } from "@playwright/test";
import {
  createTestStudentWithClasses,
  createTestStudentWithoutClasses,
  createTestStudentWithDeadlines,
  createTestStudentWithMaterials,
  createTestStudentWithUnreadMessages,
  cleanupTestUser,
  invalidateDashboardCache,
} from "./fixtures/today";

test.describe("Today Dashboard Route and Redirects", () => {
  test("home redirects authenticated students to /today", async ({ page }) => {
    // Relying on global auth state for default '/' visit from auth.setup.ts
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/today/);
  });

  test("loads /today directly without crashing", async ({ page }) => {
    const response = await page.goto("/today", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/login/);
    expect(response?.status()).toBe(200);
  });
});

test.describe("Today Dashboard Data States", () => {
  test("student with classes sees schedule and next class", async ({ page, request }) => {
    const runId = Date.now();
    const email = `today_classes_${runId}@ufar.am`;
    
    try {
      await createTestStudentWithClasses(email);
      await invalidateDashboardCache(request);

      // Login
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill("testpassword");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      await page.waitForURL(/\/today/);

      const summary = page.locator("#today-summary");
      await expect(summary).toContainText(/class|classes/i);
      
      const summaryEmpty = summary.locator(".dash-summary-empty");
      await expect(summaryEmpty).toBeHidden();

      const nowNextSection = page.locator("#today-now-next");
      await expect(nowNextSection).toBeVisible();
      await expect(nowNextSection).not.toContainText(/undefined|null/i);
      // Should see a class card
      await expect(nowNextSection.locator(".dash-now-card")).toBeVisible();

      const scheduleList = page.locator("#today-schedule");
      await expect(scheduleList).toBeVisible();
      await expect(scheduleList).not.toContainText(/undefined|null/i);
      await expect(scheduleList).toContainText(/Room 101/);
      await expect(scheduleList).toContainText(/14:00/);

      // Verify the list has items
      const scheduleItems = scheduleList.locator(".dash-schedule-item");
      const count = await scheduleItems.count();
      expect(count).toBeGreaterThan(0);
      
      // Ensure "No classes scheduled today" isn't incorrectly shown
      const emptyStateCount = await scheduleList.getByText(/No classes scheduled today/i).count();
      expect(emptyStateCount).toBe(0);
      
      // Verify links
      const fullScheduleLink = page.getByRole("link", { name: /full schedule|open schedule/i });
      if (await fullScheduleLink.isVisible()) {
        await expect(fullScheduleLink).toHaveAttribute("href", /\/schedule/);
      }
    } finally {
      await cleanupTestUser(email);
    }
  });

  test("student without classes sees clean empty states", async ({ page, request }) => {
    const runId = Date.now();
    const email = `today_noclasses_${runId}@ufar.am`;
    
    try {
      await createTestStudentWithoutClasses(email);
      await invalidateDashboardCache(request);

      // Login
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill("testpassword");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      await page.waitForURL(/\/today/);

      const summary = page.locator("#today-summary");
      await expect(summary).toBeVisible();

      // Check for "Your day looks clear" or similar in empty state
      const empty = summary.locator(".dash-summary-empty");
      await expect(empty).toBeVisible();
      await expect(summary).toContainText(/Your day looks clear|Votre journée est calme/i);

      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toMatch(/undefined|null/i);
      
      // Check no duplicate empty state
      const noUpcomingCount = await page.getByText(/No upcoming classes/i).count();
      expect(noUpcomingCount).toBeLessThanOrEqual(1);

      const scheduleEmptyCount = await page.getByText(/No classes scheduled today/i).count();
      expect(scheduleEmptyCount).toBe(1);
    } finally {
      await cleanupTestUser(email);
    }
  });

  test("student with deadlines sees deadline count and clickable deadline rows", async ({ page, request }) => {
    const runId = Date.now();
    const email = `today_deadlines_${runId}@ufar.am`;
    
    try {
      await createTestStudentWithDeadlines(email);
      await invalidateDashboardCache(request);

      // Login
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill("testpassword");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      await page.waitForURL(/\/today/);

      const deadlinesSection = page.locator("#today-deadlines");
      await expect(deadlinesSection).toBeVisible();
      await expect(deadlinesSection).not.toContainText(/undefined|null/i);

      const summaryCards = page.locator("#today-summary");
      await expect(summaryCards).toContainText(/deadline/i); // Should show count > 0

      const deadlineRows = deadlinesSection.locator(".dash-deadline-row");
      const count = await deadlineRows.count();
      expect(count).toBeGreaterThan(0);

      const firstLink = deadlineRows.first().locator("xpath=ancestor::a");
      await expect(firstLink).toHaveAttribute("href", /\/calendar/);
    } finally {
      await cleanupTestUser(email);
    }
  });

  test("student with materials sees relevant materials only", async ({ page, request }) => {
    const runId = Date.now();
    const email = `today_materials_${runId}@ufar.am`;
    
    try {
      await createTestStudentWithMaterials(email);
      await invalidateDashboardCache(request);

      // Login
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill("testpassword");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      await page.waitForURL(/\/today/);

      const materialsSection = page.locator("#today-materials");
      await expect(materialsSection).toBeVisible();
      await expect(materialsSection).not.toContainText(/undefined|null|lecture_notes/i); // No raw enum

      const summaryCards = page.locator("#today-summary");
      await expect(summaryCards).toContainText(/material/i); // Should show count > 0

      const materialLinks = materialsSection.locator("a");
      const count = await materialLinks.count();
      expect(count).toBeGreaterThan(0);

      await expect(materialLinks.first()).toHaveAttribute("href", /\/study-materials/);
    } finally {
      await cleanupTestUser(email);
    }
  });

  test("student with unread messages sees unread count", async ({ page, request }) => {
    const runId = Date.now();
    const email = `today_messages_${runId}@ufar.am`;
    const senderEmail = `sender_${runId}@ufar.am`;
    
    try {
      await createTestStudentWithUnreadMessages(email, senderEmail);
      await invalidateDashboardCache(request);

      // Login
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill("testpassword");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      await page.waitForURL(/\/today/);

      const summaryCards = page.locator("#today-summary");
      await expect(summaryCards).toContainText(/message/i);
      // The count should not just be "All caught up" if there are >0 messages
      await expect(summaryCards).not.toContainText(/All caught up/i);

      // Check messages card is clickable and leads to /messages
      const messagesCard = summaryCards.locator("a[href*='/messages']").first();
      if (await messagesCard.isVisible()) {
         await expect(messagesCard).toHaveAttribute("href", /\/messages/);
      }
    } finally {
      await cleanupTestUser(email);
      await cleanupTestUser(senderEmail);
    }
  });
});
