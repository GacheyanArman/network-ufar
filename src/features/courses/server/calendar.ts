"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import {
  academicCalendar,
  communities,
  communityMembers,
  events,
  eventRsvps,
  users,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import { canModerate, getUserRole, isStaff } from "@/shared/auth/roles";
import { calendarEntrySchema } from "@/shared/validations/validations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId as string;
}

// FormData -> object that can be parsed by Zod. We coerce booleans because
// HTML forms send them as strings.
function readEntryFromFormData(fd: FormData) {
  return {
    title: String(fd.get("title") ?? ""),
    description: String(fd.get("description") ?? ""),
    eventType: String(fd.get("eventType") ?? "other"),
    course: String(fd.get("course") ?? ""),
    faculty: String(fd.get("faculty") ?? ""),
    communityId: String(fd.get("communityId") ?? ""),
    location: String(fd.get("location") ?? ""),
    onlineLink: String(fd.get("onlineLink") ?? ""),
    dueDate: String(fd.get("dueDate") ?? ""),
    endDate: String(fd.get("endDate") ?? ""),
    isAllDay: fd.get("isAllDay") === "true",
    isPublic: fd.get("isPublic") === "true",
    recurrence: String(fd.get("recurrence") ?? "none") as
      | "none"
      | "daily"
      | "weekly"
      | "monthly",
    recurrenceUntil: String(fd.get("recurrenceUntil") ?? ""),
    reminderOffsets: String(fd.get("reminderOffsets") ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Recurrence expansion
// ---------------------------------------------------------------------------

export type CalendarOccurrence = {
  id: string; // virtual id when from recurrence: `<masterId>__<isoDate>`
  masterId: string;
  title: string;
  description: string | null;
  eventType: string;
  category: string;
  course: string | null;
  faculty: string | null;
  communityId: string | null;
  communityName: string | null;
  location: string | null;
  onlineLink: string | null;
  dueDate: string;
  endDate: string | null;
  isAllDay: boolean;
  isPublic: boolean;
  recurrence: string;
  reminderOffsets: number[];
  createdBy: string;
  creatorName: string | null;
  source: "academic" | "rsvp";
  // True if this row is the original (non-recurring) instance.
  isMaster: boolean;
};

// Expands a master row into an array of occurrences in [windowStart, windowEnd].
// We cap to ~one year forward regardless of recurrenceUntil to bound the work.
function expandRecurrence(
  master: any,
  windowStart: Date,
  windowEnd: Date,
): { dueDate: Date; endDate: Date | null }[] {
  const result: { dueDate: Date; endDate: Date | null }[] = [];
  const start = new Date(master.dueDate);
  const end = master.endDate ? new Date(master.endDate) : null;
  const duration = end ? end.getTime() - start.getTime() : 0;

  if (master.recurrence === "none") {
    if (start >= windowStart && start <= windowEnd) {
      result.push({ dueDate: start, endDate: end });
    }
    return result;
  }

  const hardCap = new Date(windowEnd);
  hardCap.setFullYear(hardCap.getFullYear() + 1);
  const seriesEnd = master.recurrenceUntil
    ? new Date(
        Math.min(new Date(master.recurrenceUntil).getTime(), hardCap.getTime()),
      )
    : hardCap;

  // Iterate forward from `start` adding the recurrence step, but skip ahead
  // if `start` is far before `windowStart` to keep work small.
  const cur = new Date(start);
  while (cur < windowStart) {
    advanceRecurrence(cur, master.recurrence);
    if (cur.getTime() > seriesEnd.getTime()) return result;
  }
  while (cur <= windowEnd && cur <= seriesEnd) {
    const occEnd = duration > 0 ? new Date(cur.getTime() + duration) : null;
    result.push({ dueDate: new Date(cur), endDate: occEnd });
    advanceRecurrence(cur, master.recurrence);
  }
  return result;
}

function advanceRecurrence(d: Date, kind: string) {
  switch (kind) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    default:
      d.setFullYear(d.getFullYear() + 100); // effectively stop
  }
}

function parseReminderCsv(s: string | null): number[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => b - a); // largest offset first (= earliest reminder)
}

// ---------------------------------------------------------------------------
// Fetch the calendar feed (academic + RSVP'd events) for the current user.
// Returns expanded occurrences inside [windowStart, windowEnd].
// ---------------------------------------------------------------------------

export type CalendarFeedFilters = {
  windowStart?: Date | string;
  windowEnd?: Date | string;
  category?: string;
  course?: string;
  faculty?: string;
  communityId?: string;
};

export async function getCalendarFeed(filters: CalendarFeedFilters = {}) {
  const session = await getSession();
  const userId = (session?.userId as string | undefined) ?? null;
  if (!userId) return { entries: [], myCommunities: [] };

  const now = new Date();
  // Default window: current month - 1 month .. + 6 months. Wide enough for the
  // month/week/day views without being expensive.
  const windowStart = filters.windowStart
    ? new Date(filters.windowStart)
    : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const windowEnd = filters.windowEnd
    ? new Date(filters.windowEnd)
    : new Date(now.getFullYear(), now.getMonth() + 6, 0, 23, 59, 59);

  // 1) Academic calendar entries — public + own + own community ones (when
  // the user is a member, regardless of public flag).
  const myMemberships = await db
    .select({ communityId: communityMembers.communityId })
    .from(communityMembers)
    .where(eq(communityMembers.userId, userId));
  const myCommunityIds = myMemberships.map((m) => m.communityId);

  const conditions = [
    or(
      eq(academicCalendar.isPublic, true),
      eq(academicCalendar.createdBy, userId),
      myCommunityIds.length > 0
        ? inArray(academicCalendar.communityId, myCommunityIds)
        : undefined,
    ),
  ].filter(Boolean) as any[];

  // Optional filters (applied at SQL where possible, otherwise post-filtered).
  if (filters.category) {
    conditions.push(eq(academicCalendar.eventType, filters.category as any));
  }
  if (filters.course) {
    conditions.push(eq(academicCalendar.course, filters.course));
  }
  if (filters.faculty) {
    conditions.push(eq(academicCalendar.faculty, filters.faculty));
  }
  if (filters.communityId) {
    conditions.push(eq(academicCalendar.communityId, filters.communityId));
  }

  const rawAcademic = await db
    .select({
      entry: academicCalendar,
      creatorName: users.fullName,
      communityName: communities.name,
    })
    .from(academicCalendar)
    .innerJoin(users, eq(academicCalendar.createdBy, users.id))
    .leftJoin(communities, eq(academicCalendar.communityId, communities.id))
    .where(and(...conditions))
    .orderBy(academicCalendar.dueDate)
    .limit(500);

  // Expand recurrences inside the window. Master rows fully outside the
  // window with `recurrence = none` are also skipped here.
  const expanded: CalendarOccurrence[] = [];
  for (const r of rawAcademic) {
    const occurrences = expandRecurrence(r.entry, windowStart, windowEnd);
    for (const occ of occurrences) {
      expanded.push({
        id:
          r.entry.recurrence === "none"
            ? r.entry.id
            : `${r.entry.id}__${occ.dueDate.toISOString()}`,
        masterId: r.entry.id,
        title: r.entry.title,
        description: r.entry.description ?? null,
        eventType: r.entry.eventType,
        category: r.entry.eventType,
        course: r.entry.course ?? null,
        faculty: r.entry.faculty ?? null,
        communityId: r.entry.communityId ?? null,
        communityName: r.communityName ?? null,
        location: r.entry.location ?? null,
        onlineLink: r.entry.onlineLink ?? null,
        dueDate: occ.dueDate.toISOString(),
        endDate: occ.endDate ? occ.endDate.toISOString() : null,
        isAllDay: !!r.entry.isAllDay,
        isPublic: !!r.entry.isPublic,
        recurrence: r.entry.recurrence,
        reminderOffsets: parseReminderCsv(r.entry.reminderOffsets ?? null),
        createdBy: r.entry.createdBy,
        creatorName: r.creatorName,
        source: "academic",
        isMaster: r.entry.recurrence === "none",
      });
    }
  }

  const mirroredEventKeys = new Set(
    rawAcademic
      .filter(
        (r) =>
          r.entry.createdBy === userId &&
          !r.entry.isPublic &&
          r.entry.eventType === "event",
      )
      .map(
        (r) => `${r.entry.title}::${new Date(r.entry.dueDate).toISOString()}`,
      ),
  );

  // 2) Events the user RSVP'd "going" to. New RSVPs are also mirrored into
  // academicCalendar; the virtual source remains as a fallback for older data.
  const myRsvps = await db
    .select({ eventId: eventRsvps.eventId })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.userId, userId), eq(eventRsvps.status, "going")));
  const rsvpEventIds = myRsvps.map((r) => r.eventId);

  if (rsvpEventIds.length > 0) {
    const rsvpRows = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        eventType: events.eventType,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        reminderOffsets: events.reminderOffsets,
        organizerId: events.organizerId,
        organizerName: users.fullName,
        communityId: events.communityId,
        communityName: communities.name,
      })
      .from(events)
      .innerJoin(users, eq(events.organizerId, users.id))
      .leftJoin(communities, eq(events.communityId, communities.id))
      .where(
        and(
          inArray(events.id, rsvpEventIds),
          gte(events.startTime, windowStart),
          lte(events.startTime, windowEnd),
        ),
      );

    for (const e of rsvpRows) {
      const key = `${e.title}::${new Date(e.startTime ?? new Date()).toISOString()}`;
      if (mirroredEventKeys.has(key)) continue;

      expanded.push({
        id: `rsvp-${e.id}`,
        masterId: e.id,
        title: e.title,
        description: e.description ?? null,
        eventType: "event",
        category: "event",
        course: null,
        faculty: null,
        communityId: e.communityId ?? null,
        communityName: e.communityName ?? null,
        location: e.location ?? null,
        onlineLink: null,
        dueDate: (e.startTime ?? new Date()).toISOString(),
        endDate: e.endTime ? e.endTime.toISOString() : null,
        isAllDay: false,
        isPublic: true,
        recurrence: "none",
        reminderOffsets: parseReminderCsv(e.reminderOffsets ?? null),
        createdBy: e.organizerId,
        creatorName: e.organizerName ?? null,
        source: "rsvp",
        isMaster: true,
      });
    }
  }

  expanded.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  // For the filter dropdown we also want a list of communities the user is
  // in (for "this community only" filter).
  const myCommunities =
    myCommunityIds.length > 0
      ? await db
          .select({
            id: communities.id,
            name: communities.name,
          })
          .from(communities)
          .where(inArray(communities.id, myCommunityIds))
      : [];

  return { entries: expanded, myCommunities };
}

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------

export async function createCalendarEntry(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };
  const userId = session.userId as string;

  const rl = await checkRateLimitAsync(userId, "createCalendarEntry");
  if (!rl.allowed) return { error: getRateLimitError(rl.resetTime!) };

  const parsed = calendarEntrySchema.safeParse(readEntryFromFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }
  const v = parsed.data;

  // Permission: a public entry attached to a community requires staff role on
  // the platform OR ownership of the community. Public global entries (no
  // communityId) require platform staff.
  if (v.isPublic) {
    const role = await getUserRole(userId);
    if (!isStaff(role)) {
      // Allow public community entries only when the user is owner/moderator
      // of that community.
      if (v.communityId) {
        const [member] = await db
          .select({ role: communityMembers.role })
          .from(communityMembers)
          .where(
            and(
              eq(communityMembers.communityId, v.communityId),
              eq(communityMembers.userId, userId),
            ),
          )
          .limit(1);
        if (
          !member ||
          (member.role !== "owner" && member.role !== "moderator")
        ) {
          return {
            error: "Only community owners/moderators can post public events",
          };
        }
      } else {
        return {
          error: "Only moderators/admins can post public global events",
        };
      }
    }
  }

  try {
    await db.insert(academicCalendar).values({
      title: v.title.slice(0, 200),
      description: v.description ? v.description.slice(0, 1000) : null,
      eventType: v.eventType as any,
      course: v.course || null,
      faculty: v.faculty || null,
      communityId: v.communityId || null,
      location: v.location || null,
      onlineLink: v.onlineLink || null,
      dueDate: new Date(v.dueDate),
      endDate: v.endDate ? new Date(v.endDate) : null,
      isAllDay: !!v.isAllDay,
      recurrence: v.recurrence,
      recurrenceUntil: v.recurrenceUntil ? new Date(v.recurrenceUntil) : null,
      reminderOffsets: v.reminderOffsets || null,
      createdBy: userId,
      isPublic: !!v.isPublic,
    });

    revalidatePath("/calendar");
    return { success: true };
  } catch (err) {
    console.error("createCalendarEntry error:", err);
    return { error: "Failed to save" };
  }
}

export async function updateCalendarEntry(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };
  const userId = session.userId as string;

  const entryId = String(formData.get("entryId") || "");
  if (!entryId) return { error: "Missing entryId" };

  const [existing] = await db
    .select()
    .from(academicCalendar)
    .where(eq(academicCalendar.id, entryId))
    .limit(1);
  if (!existing) return { error: "Not found" };

  // Owner or staff can edit. For public community entries the community
  // owner/moderator can also edit.
  const allowed = await canModerate(userId, existing.createdBy);
  if (!allowed) return { error: "Forbidden" };

  const parsed = calendarEntrySchema.safeParse(readEntryFromFormData(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }
  const v = parsed.data;

  try {
    await db
      .update(academicCalendar)
      .set({
        title: v.title.slice(0, 200),
        description: v.description ? v.description.slice(0, 1000) : null,
        eventType: v.eventType as any,
        course: v.course || null,
        faculty: v.faculty || null,
        communityId: v.communityId || null,
        location: v.location || null,
        onlineLink: v.onlineLink || null,
        dueDate: new Date(v.dueDate),
        endDate: v.endDate ? new Date(v.endDate) : null,
        isAllDay: !!v.isAllDay,
        recurrence: v.recurrence,
        recurrenceUntil: v.recurrenceUntil ? new Date(v.recurrenceUntil) : null,
        reminderOffsets: v.reminderOffsets || null,
        // We reset the "last reminder fired" marker so updated dates trigger
        // a fresh reminder at the next cron run.
        lastReminderSentMinutes: null,
        isPublic: v.isPublic === undefined ? existing.isPublic : !!v.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(academicCalendar.id, entryId));

    revalidatePath("/calendar");
    return { success: true };
  } catch (err) {
    console.error("updateCalendarEntry error:", err);
    return { error: "Failed to update" };
  }
}

export async function deleteCalendarEntry(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };
  const userId = session.userId as string;

  const entryId = String(formData.get("entryId") || "");
  if (!entryId) return { error: "Missing entryId" };

  try {
    const [entry] = await db
      .select({ createdBy: academicCalendar.createdBy })
      .from(academicCalendar)
      .where(eq(academicCalendar.id, entryId))
      .limit(1);
    if (!entry) return { error: "Not found" };

    const allowed = await canModerate(userId, entry.createdBy);
    if (!allowed) return { error: "Forbidden" };

    await db.delete(academicCalendar).where(eq(academicCalendar.id, entryId));
    revalidatePath("/calendar");
    return { success: true };
  } catch (err) {
    console.error("deleteCalendarEntry error:", err);
    return { error: "Failed to delete" };
  }
}

// ---------------------------------------------------------------------------
// "Add to my calendar" — for an event the user has RSVP'd to, copy a personal
// row so it persists even if the user later un-RSVPs. This does *not* affect
// the existing RSVP flow; it just creates a personal mirror.
// ---------------------------------------------------------------------------

export async function addEventToCalendar(eventId: string) {
  const userId = await requireUserId();

  const [ev] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!ev) return { error: "Event not found" };

  await db.insert(academicCalendar).values({
    title: ev.title,
    description: ev.description ?? null,
    eventType: "event" as any,
    location: ev.location ?? null,
    dueDate: ev.startTime,
    endDate: ev.endTime ?? null,
    communityId: ev.communityId ?? null,
    createdBy: userId,
    isPublic: false, // personal mirror
  });

  revalidatePath("/calendar");
  return { success: true };
}

// ---------------------------------------------------------------------------
// "My deadlines this week" — quick helper used by the home/calendar page.
// ---------------------------------------------------------------------------

export async function getMyDeadlinesThisWeek() {
  const userId = await requireUserId();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  // Monday of this week (ISO week, Monday=1).
  const dow = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dow);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // We only count "deadline-like" categories.
  const deadlineCategories = [
    "exam",
    "homework",
    "assignment",
    "project",
    "deadline",
  ];

  const rows = await db
    .select()
    .from(academicCalendar)
    .where(
      and(
        eq(academicCalendar.createdBy, userId),
        inArray(academicCalendar.eventType, deadlineCategories as any),
        gte(academicCalendar.dueDate, weekStart),
        lte(academicCalendar.dueDate, weekEnd),
      ),
    )
    .orderBy(academicCalendar.dueDate);

  return rows;
}
