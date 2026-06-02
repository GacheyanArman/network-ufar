import { db } from "@/shared/db/db";
import {
  users,
  schedule,
  academicCalendar,
  courses,
  courseEnrollments,
  semesters,
  studyMaterials,
  messages,
} from "@/shared/db/schema";
import { eq, like } from "drizzle-orm";
import { APIRequestContext } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import { hash } from "bcryptjs";

/**
 * Returns the current date shifted by `offsetHours`.
 */
export function getTestCampusDate(offsetHours: number = 0) {
  const now = new Date();
  now.setHours(now.getHours() + offsetHours);
  return now;
}

/**
 * Calculates current campus day of week (0=Mon..6=Sun) and hour (0-23)
 * so we can seed `schedule` table accurately.
 */
export function getCampusDayOfWeekAndHour() {
  const timeZone = process.env.NEXT_PUBLIC_CAMPUS_TIMEZONE || "Asia/Yerevan";
  const now = new Date();
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(now);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return { dayOfWeek: map[wd] ?? 0, hour: parseInt(hour, 10) };
}

/**
 * Invalidate Next.js cache using our test-only API endpoint.
 */
export async function invalidateDashboardCache(request: APIRequestContext) {
  await request.post("/api/e2e/clear-cache", {
    headers: {
      "x-e2e-secret": process.env.E2E_SECRET || "dummy_unguessable_secret_for_tests",
    },
    data: { tags: ["schedule", "messages", "deadlines", "materials"] },
  });
}

/**
 * Setup a fresh user in DB.
 */
export async function setupTestUser(email: string) {
  await cleanupTestUser(email);

  const hashedPassword = await hash("testpassword", 10);

  const [user] = await db
    .insert(users)
    .values({
      email,
      password: hashedPassword,
      fullName: "Test Student",
      onboardingComplete: true,
      emailVerified: true,
    })
    .returning();

  return user;
}

/**
 * Cleanup user and all cascade data.
 */
export async function cleanupTestUser(email: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    await db.delete(users).where(eq(users.id, existing.id));
  }
}

/**
 * Cleanup all users created by today fixtures.
 * Usage: await cleanupTodayFixtures("today_")
 */
export async function cleanupTodayFixtures(prefix: string) {
  await db.delete(users).where(like(users.email, `${prefix}%`));
}

/**
 * 1. Student with classes
 * Seeds past, current, next, and tomorrow classes.
 */
export async function createTestStudentWithClasses(email: string) {
  const user = await setupTestUser(email);
  const { dayOfWeek } = getCampusDayOfWeekAndHour();

  await db.insert(schedule).values([
    {
      courseName: "Morning Class",
      dayOfWeek,
      startTime: "09:00",
      endTime: "10:30",
      createdBy: user.id,
      room: "Room 101",
    },
    {
      courseName: "Afternoon Class",
      dayOfWeek,
      startTime: "14:00",
      endTime: "15:30",
      createdBy: user.id,
      room: "Room 202",
    },
    {
      courseName: "Tomorrow Class",
      dayOfWeek: (dayOfWeek + 1) % 7,
      startTime: "10:00",
      endTime: "11:30",
      createdBy: user.id,
    },
  ]);

  return user;
}

/**
 * 2. Student without classes
 */
export async function createTestStudentWithoutClasses(email: string) {
  const user = await setupTestUser(email);
  // No schedule inserted
  return user;
}

/**
 * 3. Student with deadlines
 */
export async function createTestStudentWithDeadlines(email: string) {
  const user = await setupTestUser(email);

  await db.insert(academicCalendar).values([
    {
      title: "Today Deadline",
      eventType: "deadline",
      dueDate: getTestCampusDate(2), // 2 hours from now
      createdBy: user.id,
    },
    {
      title: "Tomorrow Homework",
      eventType: "homework",
      dueDate: getTestCampusDate(26), // Tomorrow
      createdBy: user.id,
    },
  ]);

  return user;
}

/**
 * 4. Student with materials
 */
export async function createTestStudentWithMaterials(email: string) {
  const user = await setupTestUser(email);

  const [course] = await db
    .insert(courses)
    .values({
      name: "Intro to Testing",
      code: "TEST101",
    })
    .returning();

  // Create a semester
  const [semester] = await db
    .insert(semesters)
    .values({
      name: "Fall 2026",
      year: 2026,
      season: "Fall",
      isActive: true,
    })
    .returning();

  // Enroll user
  await db.insert(courseEnrollments).values({
    userId: user.id,
    courseId: course.id,
    semesterId: semester.id,
  });

  await db.insert(studyMaterials).values({
    title: "Test Material Slides",
    type: "slides",
    courseId: course.id,
    ownerId: user.id,
    status: "approved",
  });

  return user;
}

/**
 * 5. Student with unread messages
 */
export async function createTestStudentWithUnreadMessages(email: string, senderEmail: string) {
  const user = await setupTestUser(email);
  const hashedPassword = await hash("pass", 10);
  const [sender] = await db
    .insert(users)
    .values({
      email: senderEmail,
      password: hashedPassword,
      fullName: "Sender",
    })
    .returning();

  await db.insert(messages).values([
    {
      senderId: sender.id,
      receiverId: user.id,
      content: "Hello E2E",
      isRead: false,
    },
    {
      senderId: sender.id,
      receiverId: user.id,
      content: "Another unread",
      isRead: false,
    },
  ]);

  return user;
}
