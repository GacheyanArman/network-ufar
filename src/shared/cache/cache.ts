import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/shared/db/db";
import {
  users,
  notifications,
  messages,
  schedule,
  academicCalendar,
} from "@/shared/db/schema";
import { and, asc, count, eq, gte, inArray, sql } from "drizzle-orm";

// ─── User basic info ────────────────────────────────────────────────────────

/**
 * Cached user basic info (name, image, faculty).
 * Tag: `user-{userId}` — invalidate on profile update.
 * TTL: 5 minutes.
 */
export function getCachedUser(userId: string) {
  return unstable_cache(
    async () => {
      const [user] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          image: users.image,
          avatarUrl: users.avatarUrl,
          faculty: users.faculty,
          username: users.username,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user || null;
    },
    [`user-profile-${userId}`],
    { revalidate: 300, tags: [`user-${userId}`, "user"] },
  )();
}

/**
 * Cached minimal user data for layout/topbar
 * (name + image + onboarding status + role).
 * Bust via `invalidateUserCache(userId)` after profile/onboarding/role updates.
 * TTL: 5 minutes.
 */
export function getCachedUserBasicInfo(userId: string) {
  return unstable_cache(
    async () => {
      const [user] = await db
        .select({
          fullName: users.fullName,
          image: users.image,
          onboardingComplete: users.onboardingComplete,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user || null;
    },
    // v2 — key bumped to bust any stale entries that were cached without the
    // `role` field (i.e. before role was added to this select).
    [`user-basic-v2-${userId}`],
    { revalidate: 300, tags: [`user-${userId}`, "user"] },
  )();
}

// ─── Unread counts ──────────────────────────────────────────────────────────

/**
 * Cached unread notification count.
 * Tag: `notif-{userId}` — invalidate when a notification is created/read.
 * TTL: 30 seconds.
 */
export function getCachedUnreadNotifications(userId: string) {
  return unstable_cache(
    async () => {
      const [row] = await db
        .select({ value: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
          ),
        );

      return Number(row?.value || 0);
    },
    [`unread-notif-${userId}`],
    { revalidate: 30, tags: [`notif-${userId}`, "notifications"] },
  )();
}

/**
 * Cached unread DM count.
 * Tag: `msg-unread-{userId}` — invalidate on markThreadRead / sendMessage.
 * TTL: 30 seconds.
 */
export function getCachedUnreadMessages(userId: string) {
  return unstable_cache(
    async () => {
      const [row] = await db
        .select({ value: sql<number>`COUNT(*)::int` })
        .from(messages)
        .where(
          and(eq(messages.receiverId, userId), eq(messages.isRead, false)),
        );

      return Number(row?.value || 0);
    },
    [`unread-msg-${userId}`],
    { revalidate: 30, tags: [`msg-unread-${userId}`, "messages"] },
  )();
}

// ─── Schedule & deadlines (right-panel widgets + dashboard) ────────────────

const DEADLINE_CATEGORIES = [
  "deadline",
  "exam",
  "homework",
  "assignment",
  "project",
] as const;

/**
 * Cached weekly schedule for a user (entire week, capped at 50 rows).
 * Both consumers (TodayDashboard, RightPanelWidgets) filter this in JS.
 * Tag: `schedule-{userId}` — invalidate when schedule edited.
 * TTL: 60 seconds.
 *
 * Wrapped with React `cache()` for per-request deduplication so parallel
 * callers within the same render (layout + page) share a single promise.
 */
export const getCachedUserSchedule = cache((userId: string) => {
  return unstable_cache(
    async () => {
      return db
        .select({
          id: schedule.id,
          courseName: schedule.courseName,
          courseCode: schedule.courseCode,
          room: schedule.room,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        })
        .from(schedule)
        .where(eq(schedule.createdBy, userId))
        .orderBy(asc(schedule.dayOfWeek), asc(schedule.startTime))
        .limit(50);
    },
    [`schedule-${userId}`],
    { revalidate: 60, tags: [`schedule-${userId}`, "schedule"] },
  )();
});

/**
 * Cached upcoming deadlines for a user (top 5 in the future).
 * Both consumers (TodayDashboard, RightPanelWidgets) slice this further.
 * Tag: `deadlines-{userId}` — invalidate when calendar entries change.
 * TTL: 60 seconds.
 *
 * Note: TTL is short because dueDate filtering is time-based; with a longer
 * TTL a deadline that just passed could linger in the cache.
 *
 * Wrapped with React `cache()` for per-request deduplication so parallel
 * callers within the same render (layout + page) share a single promise.
 */
export const getCachedUpcomingDeadlines = cache((userId: string) => {
  return unstable_cache(
    async () => {
      const now = new Date();
      return db
        .select({
          id: academicCalendar.id,
          title: academicCalendar.title,
          eventType: academicCalendar.eventType,
          dueDate: academicCalendar.dueDate,
        })
        .from(academicCalendar)
        .where(
          and(
            eq(academicCalendar.createdBy, userId),
            gte(academicCalendar.dueDate, now),
            inArray(
              academicCalendar.eventType,
              DEADLINE_CATEGORIES as unknown as any[],
            ),
          ),
        )
        .orderBy(asc(academicCalendar.dueDate))
        .limit(5);
    },
    [`deadlines-${userId}`],
    { revalidate: 60, tags: [`deadlines-${userId}`, "deadlines"] },
  )();
});

// ─── Right-panel social widgets ─────────────────────────────────────────────

/**
 * Cached wrapper for the layout's "Following" widget — followed users + count.
 * Tag: `social-{userId}` — invalidate on follow/unfollow.
 * TTL: 60 seconds (small staleness is OK for a sidebar widget).
 */
export function getCachedFollowingSummary(userId: string, limit = 5) {
  return unstable_cache(
    async () => {
      // Lazy import to avoid circular import (social.js imports from db too).
      const { getFollowingSummary } =
        await import("@/features/feed/server/social");
      return getFollowingSummary(userId, limit) as Promise<{
        count: number;
        users: Array<{
          id: string;
          fullName: string;
          username: string | null;
          faculty: string | null;
          image: string | null;
          avatarUrl: string | null;
        }>;
      }>;
    },
    [`following-summary-${userId}-${limit}`],
    { revalidate: 60, tags: [`social-${userId}`, "social"] },
  )();
}

/**
 * Cached wrapper for "People you may know" suggestions.
 * Tag: `social-{userId}` — invalidate on follow/friend/community changes.
 * TTL: 5 minutes (suggestions are an approximation; staleness is fine).
 */
export function getCachedPeopleYouMayKnow(userId: string, limit = 5) {
  return unstable_cache(
    async () => {
      const { getPeopleYouMayKnow } =
        await import("@/features/feed/server/social");
      return getPeopleYouMayKnow(userId, limit) as Promise<
        Array<{
          id: string;
          fullName: string;
          username: string | null;
          faculty: string | null;
          image: string | null;
          avatarUrl: string | null;
          reason: string;
        }>
      >;
    },
    [`people-may-know-${userId}-${limit}`],
    { revalidate: 300, tags: [`social-${userId}`, "social"] },
  )();
}

// ─── Cache invalidation helpers ─────────────────────────────────────────────

/** Call after profile update to bust user info cache. */
export function invalidateUserCache(userId: string) {
  revalidateTag(`user-${userId}`, {});
}

/** Call after notification created / read / marked-all-read. */
export function invalidateNotificationsCache(userId: string) {
  revalidateTag(`notif-${userId}`, {});
}

/** Call after message sent or markThreadRead. */
export function invalidateMessagesCache(userId: string) {
  revalidateTag(`msg-unread-${userId}`, {});
}

/** Call after a schedule entry is created/edited/deleted. */
export function invalidateScheduleCache(userId: string) {
  revalidateTag(`schedule-${userId}`, {});
}

/** Call after an academic-calendar entry is created/edited/deleted. */
export function invalidateDeadlinesCache(userId: string) {
  revalidateTag(`deadlines-${userId}`, {});
}

/** Call after follow/unfollow, accept/reject friend, join/leave community. */
export function invalidateSocialCache(userId: string) {
  revalidateTag(`social-${userId}`, {});
}
