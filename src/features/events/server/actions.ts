"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import {
  events,
  eventRsvps,
  eventCoOrganizers,
  eventComments,
  eventCheckIns,
  communities,
  communityMembers,
  academicCalendar,
  users,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import { saveUploadFileWithMeta } from "@/shared/storage/upload";
import { isStaff, getUserRole } from "@/shared/auth/roles";
import { eventSchema, eventCommentSchema } from "@/shared/validations/validations";

// ===========================================================================
// Helpers
// ===========================================================================

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId as string;
}

/**
 * Permission check: organizer / co-organizer / community owner-or-moderator /
 * platform admin/moderator can modify the given event.
 */
async function canManageEvent(
  userId: string,
  event: {
    organizerId: string;
    communityId: string | null;
    id: string;
  },
): Promise<boolean> {
  const role = await getUserRole(userId);
  if (isStaff(role)) return true;

  const isOrganizer = event.organizerId === userId;

  const [co] = await db
    .select({ id: eventCoOrganizers.id })
    .from(eventCoOrganizers)
    .where(
      and(
        eq(eventCoOrganizers.eventId, event.id),
        eq(eventCoOrganizers.userId, userId),
      ),
    )
    .limit(1);
  const isCoOrganizer = !!co;

  if (!event.communityId) return isOrganizer || isCoOrganizer;

  const [member] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, event.communityId),
        eq(communityMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!member) return false;
  if (member.role === "owner" || member.role === "moderator") return true;

  return isOrganizer || isCoOrganizer;
}

async function canCreateOrMoveCommunityEvent(
  userId: string,
  communityId: string | null | undefined,
): Promise<boolean> {
  if (!communityId) return true;

  const role = await getUserRole(userId);
  if (isStaff(role)) return true;

  const [member] = await db
    .select({ role: communityMembers.role })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId),
      ),
    )
    .limit(1);

  return !!member && (member.role === "owner" || member.role === "moderator");
}

async function isCommunityMember(
  userId: string,
  communityId: string | null | undefined,
): Promise<boolean> {
  if (!communityId) return true;
  const role = await getUserRole(userId);
  if (isStaff(role)) return true;

  const [member] = await db
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId),
      ),
    )
    .limit(1);

  return !!member;
}

async function canViewEvent(
  userId: string | null,
  event: { communityId: string | null; communityIsPrivate?: boolean | null },
): Promise<boolean> {
  if (!event.communityId || !event.communityIsPrivate) return true;
  if (!userId) return false;
  return isCommunityMember(userId, event.communityId);
}

async function canViewEventById(
  userId: string | null,
  eventId: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      communityId: events.communityId,
      communityIsPrivate: communities.isPrivate,
    })
    .from(events)
    .leftJoin(communities, eq(events.communityId, communities.id))
    .where(eq(events.id, eventId))
    .limit(1);
  if (!row) return false;
  return canViewEvent(userId, row);
}

function readEventInputFromForm(fd: FormData) {
  return {
    title: String(fd.get("title") ?? ""),
    description: String(fd.get("description") ?? ""),
    eventType: String(fd.get("eventType") ?? "social"),
    location: String(fd.get("location") ?? ""),
    startTime: String(fd.get("startTime") ?? ""),
    endTime: String(fd.get("endTime") ?? ""),
    maxAttendees: fd.get("maxAttendees") as any,
    enableWaitlist: fd.get("enableWaitlist") !== "false",
    communityId: String(fd.get("communityId") ?? ""),
    reminderOffsets: String(fd.get("reminderOffsets") ?? ""),
  };
}

/**
 * Counts current "going" RSVPs for an event. Used to decide whether new RSVPs
 * should be put on the waitlist instead.
 */
async function countGoing(eventId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "going")),
    );
  return Number(count) || 0;
}

/**
 * After someone leaves "going", promote the first person on the waitlist (if
 * any). Best-effort; race-y if used at scale but fine for our load.
 */
async function renumberWaitlist(eventId: string) {
  await db.execute(sql`
    WITH ordered AS (
      SELECT "id", ROW_NUMBER() OVER (ORDER BY "waitlist_position" ASC NULLS LAST, "updated_at" ASC) AS rn
      FROM "event_rsvp"
      WHERE "event_id" = ${eventId} AND "status" = 'waitlisted'
    )
    UPDATE "event_rsvp" SET "waitlist_position" = ordered.rn
    FROM ordered WHERE "event_rsvp"."id" = ordered."id"
  `);
}

async function promoteFromWaitlist(eventId: string) {
  const [next] = await db
    .select({
      id: eventRsvps.id,
      userId: eventRsvps.userId,
      waitlistPosition: eventRsvps.waitlistPosition,
    })
    .from(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "waitlisted")),
    )
    .orderBy(asc(eventRsvps.waitlistPosition))
    .limit(1);
  if (!next) return null;

  await db
    .update(eventRsvps)
    .set({
      status: "going",
      waitlistPosition: null,
      updatedAt: new Date(),
    })
    .where(eq(eventRsvps.id, next.id));

  await renumberWaitlist(eventId);
  await mirrorEventToCalendar(next.userId, eventId);

  return next.userId;
}

/**
 * When a user RSVPs "going" we mirror the event into their academicCalendar
 * (private). Idempotent: the unique index on academicCalendar isn't enforced
 * here so we just check first.
 */
async function mirrorEventToCalendar(userId: string, eventId: string) {
  const [ev] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!ev) return;

  // Skip duplicate rows, but keep an existing mirror in sync when event
  // details or reminder offsets changed after the RSVP.
  const existing = await db
    .select({ id: academicCalendar.id })
    .from(academicCalendar)
    .where(
      and(
        eq(academicCalendar.createdBy, userId),
        eq(academicCalendar.title, ev.title),
        eq(academicCalendar.dueDate, ev.startTime),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(academicCalendar)
      .set({
        description: ev.description ?? null,
        location: ev.location ?? null,
        endDate: ev.endTime ?? null,
        communityId: ev.communityId ?? null,
        reminderOffsets: null,
        lastReminderSentMinutes: null,
        updatedAt: new Date(),
      })
      .where(eq(academicCalendar.id, existing[0].id));
    return;
  }

  await db.insert(academicCalendar).values({
    title: ev.title,
    description: ev.description ?? null,
    eventType: "event" as any,
    location: ev.location ?? null,
    dueDate: ev.startTime,
    endDate: ev.endTime ?? null,
    communityId: ev.communityId ?? null,
    reminderOffsets: null,
    createdBy: userId,
    isPublic: false,
  });
}

// ===========================================================================
// Read API
// ===========================================================================

export type EventsFilter =
  | "all"
  | "upcoming"
  | "today"
  | "this_week"
  | "my_events"
  | "community"
  | "past";

export type EventListFilters = {
  filter?: EventsFilter;
  category?: string;
  communityId?: string;
  query?: string;
};

export async function getEventsList(filters: EventListFilters = {}) {
  const session = await getSession();
  const userId = (session?.userId as string | undefined) ?? null;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const weekEnd = new Date(startOfDay);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const conditions: SQL[] = [];
  const myCommunityIds = userId
    ? (
        await db
          .select({ communityId: communityMembers.communityId })
          .from(communityMembers)
          .where(eq(communityMembers.userId, userId))
      ).map((m) => m.communityId)
    : [];
  const role = userId ? await getUserRole(userId) : "user";
  const staff = isStaff(role as any);

  const ongoingOrFuture = or(
    gte(events.startTime, now),
    and(isNotNull(events.endTime), gte(events.endTime, now)),
  )!;
  const overlapsToday = and(
    lte(events.startTime, endOfDay),
    or(
      and(isNotNull(events.endTime), gte(events.endTime, startOfDay)),
      and(isNull(events.endTime), gte(events.startTime, startOfDay)),
    ),
  )!;
  const overlapsWeek = and(
    lte(events.startTime, weekEnd),
    or(
      and(isNotNull(events.endTime), gte(events.endTime, startOfDay)),
      and(isNull(events.endTime), gte(events.startTime, startOfDay)),
    ),
  )!;

  switch (filters.filter) {
    case "today":
      conditions.push(overlapsToday);
      break;
    case "this_week":
      conditions.push(overlapsWeek);
      break;
    case "my_events":
      // Organized/co-organized/RSVP'd events are post-filtered below.
      break;
    case "past":
      conditions.push(
        or(
          and(isNotNull(events.endTime), lt(events.endTime, now)),
          and(isNull(events.endTime), lt(events.startTime, now)),
        )!,
      );
      break;
    case "community":
      conditions.push(ongoingOrFuture);
      if (!userId) return [];
      if (filters.communityId) {
        if (!staff && !myCommunityIds.includes(filters.communityId)) return [];
        conditions.push(eq(events.communityId, filters.communityId));
      } else {
        if (!staff && myCommunityIds.length === 0) return [];
        if (!staff)
          conditions.push(inArray(events.communityId, myCommunityIds));
        else conditions.push(isNotNull(events.communityId));
      }
      break;
    case "all":
      break;
    case "upcoming":
    default:
      conditions.push(ongoingOrFuture);
      break;
  }

  if (filters.category) {
    conditions.push(eq(events.eventType, filters.category as any));
  }
  if (filters.communityId && filters.filter !== "community") {
    conditions.push(eq(events.communityId, filters.communityId));
  }
  if (!staff) {
    // Private community events are visible only to members. Personal events
    // and public community events remain discoverable.
    conditions.push(
      or(
        isNull(events.communityId),
        eq(communities.isPrivate, false),
        myCommunityIds.length > 0
          ? inArray(events.communityId, myCommunityIds)
          : undefined,
      )!,
    );
  }
  if (filters.query?.trim()) {
    const like = `%${filters.query.trim()}%`;
    conditions.push(
      or(
        ilike(events.title, like),
        ilike(events.description, like),
        ilike(events.location, like),
        ilike(users.fullName, like),
        ilike(communities.name, like),
      )!,
    );
  }
  // We don't filter cancelled events out — the UI shows them with a banner.

  let order: SQL[] = [asc(events.startTime)];
  if (filters.filter === "past") order = [desc(events.startTime)];

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      imageUrl: events.imageUrl,
      coverImageUrl: events.coverImageUrl,
      maxAttendees: events.maxAttendees,
      enableWaitlist: events.enableWaitlist,
      isCancelled: events.isCancelled,
      organizerId: events.organizerId,
      organizerName: users.fullName,
      organizerImage: users.image,
      communityId: events.communityId,
      communityName: communities.name,
      communityIsPrivate: communities.isPrivate,
      createdAt: events.createdAt,
    })
    .from(events)
    .innerJoin(users, eq(events.organizerId, users.id))
    .leftJoin(communities, eq(events.communityId, communities.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...order)
    .limit(120);

  // Aggregate RSVP counts and the current user's RSVP, in two side queries.
  const eventIds = rows.map((r) => r.id);

  const [rsvpCounts, userRsvps, coOrganizerSets] = await Promise.all([
    eventIds.length
      ? db
          .select({
            eventId: eventRsvps.eventId,
            status: eventRsvps.status,
            count: sql<number>`count(*)::int`,
          })
          .from(eventRsvps)
          .where(inArray(eventRsvps.eventId, eventIds))
          .groupBy(eventRsvps.eventId, eventRsvps.status)
      : Promise.resolve([]),
    eventIds.length && userId
      ? db
          .select({
            eventId: eventRsvps.eventId,
            status: eventRsvps.status,
            waitlistPosition: eventRsvps.waitlistPosition,
          })
          .from(eventRsvps)
          .where(
            and(
              eq(eventRsvps.userId, userId),
              inArray(eventRsvps.eventId, eventIds),
            ),
          )
      : Promise.resolve([]),
    eventIds.length
      ? db
          .select({
            eventId: eventCoOrganizers.eventId,
            userId: eventCoOrganizers.userId,
          })
          .from(eventCoOrganizers)
          .where(inArray(eventCoOrganizers.eventId, eventIds))
      : Promise.resolve([]),
  ]);

  const counts = new Map<
    string,
    { going: number; interested: number; waitlisted: number }
  >();
  for (const r of rsvpCounts) {
    const c = counts.get(r.eventId) || {
      going: 0,
      interested: 0,
      waitlisted: 0,
    };
    if (r.status === "going") c.going = Number(r.count);
    else if (r.status === "interested") c.interested = Number(r.count);
    else if (r.status === "waitlisted") c.waitlisted = Number(r.count);
    counts.set(r.eventId, c);
  }

  const myRsvp = new Map<
    string,
    { status: string; waitlistPosition: number | null }
  >();
  for (const r of userRsvps) {
    myRsvp.set(r.eventId, {
      status: r.status as any,
      waitlistPosition: r.waitlistPosition ?? null,
    });
  }

  const coOrganizers = new Map<string, Set<string>>();
  for (const c of coOrganizerSets) {
    const s = coOrganizers.get(c.eventId) || new Set();
    s.add(c.userId);
    coOrganizers.set(c.eventId, s);
  }

  let normalized = rows.map((e) => {
    const c = counts.get(e.id) || { going: 0, interested: 0, waitlisted: 0 };
    const my = myRsvp.get(e.id) ?? null;
    const isMine =
      userId === e.organizerId ||
      (coOrganizers.get(e.id)?.has(userId ?? "") ?? false);
    const isFull =
      e.maxAttendees != null && e.maxAttendees > 0 && c.going >= e.maxAttendees;
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      eventType: e.eventType,
      location: e.location,
      startTime: e.startTime ? e.startTime.toISOString() : null,
      endTime: e.endTime ? e.endTime.toISOString() : null,
      imageUrl: e.coverImageUrl || e.imageUrl,
      maxAttendees: e.maxAttendees,
      enableWaitlist: e.enableWaitlist,
      isCancelled: e.isCancelled,
      organizerId: e.organizerId,
      organizerName: e.organizerName,
      organizerImage: e.organizerImage,
      communityId: e.communityId,
      communityName: e.communityName,
      createdAt: e.createdAt ? e.createdAt.toISOString() : null,
      goingCount: c.going,
      maybeCount: c.interested,
      waitlistedCount: c.waitlisted,
      notGoingCount: 0, // kept for API compat with old client; not exposed any more
      rsvpStatus: (my?.status ?? null) as
        | "going"
        | "interested"
        | "not_going"
        | "waitlisted"
        | null,
      waitlistPosition: my?.waitlistPosition ?? null,
      isMine,
      isFull,
    };
  });

  // Apply "my_events" filter post-fetch (organized OR RSVP'd) since we'd
  // need a UNION otherwise.
  if (filters.filter === "my_events" && userId) {
    normalized = normalized.filter(
      (e) =>
        e.isMine ||
        e.rsvpStatus === "going" ||
        e.rsvpStatus === "interested" ||
        e.rsvpStatus === "waitlisted",
    );
  }

  if (filters.query) {
    const q = filters.query.trim().toLowerCase();
    if (q) {
      normalized = normalized.filter((e) =>
        [
          e.title,
          e.description ?? "",
          e.location ?? "",
          e.communityName ?? "",
          e.organizerName ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
  }

  return normalized;
}

export type EventListItem = Awaited<ReturnType<typeof getEventsList>>[number];

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export async function getEventDetail(eventId: string) {
  const session = await getSession();
  const userId = (session?.userId as string | undefined) ?? null;

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      imageUrl: events.imageUrl,
      coverImageUrl: events.coverImageUrl,
      maxAttendees: events.maxAttendees,
      enableWaitlist: events.enableWaitlist,
      isCancelled: events.isCancelled,
      qrToken: events.qrToken,
      organizerId: events.organizerId,
      organizerName: users.fullName,
      organizerImage: users.image,
      communityId: events.communityId,
      communityName: communities.name,
      communityIsPrivate: communities.isPrivate,
      createdAt: events.createdAt,
    })
    .from(events)
    .innerJoin(users, eq(events.organizerId, users.id))
    .leftJoin(communities, eq(events.communityId, communities.id))
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return null;
  if (!(await canViewEvent(userId, event))) return null;

  const [coOrgs, [counts], myRsvpRow, [checkInCount]] = await Promise.all([
    db
      .select({
        userId: eventCoOrganizers.userId,
        name: users.fullName,
        image: users.image,
      })
      .from(eventCoOrganizers)
      .innerJoin(users, eq(eventCoOrganizers.userId, users.id))
      .where(eq(eventCoOrganizers.eventId, eventId)),
    db
      .select({
        going: sql<number>`COUNT(*) FILTER (WHERE ${eventRsvps.status} = 'going')::int`,
        interested: sql<number>`COUNT(*) FILTER (WHERE ${eventRsvps.status} = 'interested')::int`,
        waitlisted: sql<number>`COUNT(*) FILTER (WHERE ${eventRsvps.status} = 'waitlisted')::int`,
      })
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, eventId)),
    userId
      ? db
          .select({
            status: eventRsvps.status,
            waitlistPosition: eventRsvps.waitlistPosition,
          })
          .from(eventRsvps)
          .where(
            and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)),
          )
          .limit(1)
      : Promise.resolve([] as any[]),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventCheckIns)
      .where(eq(eventCheckIns.eventId, eventId)),
  ]);

  const canManage = userId
    ? await canManageEvent(userId, {
        id: event.id,
        organizerId: event.organizerId,
        communityId: event.communityId ?? null,
      })
    : false;

  const myRsvp = (myRsvpRow as any[])[0] ?? null;
  const isCheckedIn = userId
    ? !!(
        await db
          .select({ id: eventCheckIns.id })
          .from(eventCheckIns)
          .where(
            and(
              eq(eventCheckIns.eventId, eventId),
              eq(eventCheckIns.userId, userId),
            ),
          )
          .limit(1)
      ).length
    : false;

  return {
    event: {
      ...event,
      startTime: event.startTime?.toISOString() ?? null,
      endTime: event.endTime ? event.endTime.toISOString() : null,
      createdAt: event.createdAt?.toISOString() ?? null,
      imageUrl: event.coverImageUrl || event.imageUrl,
      coverImageUrl: event.coverImageUrl || event.imageUrl,
    },
    coOrganizers: coOrgs,
    rsvpCounts: counts ?? { going: 0, interested: 0, waitlisted: 0 },
    myRsvpStatus: (myRsvp?.status as any) ?? null,
    myWaitlistPosition: myRsvp?.waitlistPosition ?? null,
    canManage,
    isCheckedIn,
    checkInCount: Number(checkInCount?.count ?? 0),
    isFull:
      event.maxAttendees != null &&
      event.maxAttendees > 0 &&
      Number(counts?.going ?? 0) >= event.maxAttendees,
  };
}

/**
 * Returns the going / waitlisted / interested attendee lists.
 * Lightweight (id + name + avatar) so it's safe to render server-side.
 */
export async function getEventAttendees(eventId: string) {
  const session = await getSession();
  const userId = (session?.userId as string | undefined) ?? null;
  if (!(await canViewEventById(userId, eventId))) {
    return { going: [], interested: [], waitlisted: [] };
  }

  const rows = await db
    .select({
      userId: eventRsvps.userId,
      status: eventRsvps.status,
      waitlistPosition: eventRsvps.waitlistPosition,
      name: users.fullName,
      avatar: users.avatarUrl,
      image: users.image,
    })
    .from(eventRsvps)
    .innerJoin(users, eq(eventRsvps.userId, users.id))
    .where(eq(eventRsvps.eventId, eventId))
    .orderBy(asc(eventRsvps.waitlistPosition), asc(users.fullName));

  return {
    going: rows.filter((r) => r.status === "going"),
    interested: rows.filter((r) => r.status === "interested"),
    waitlisted: rows.filter((r) => r.status === "waitlisted"),
  };
}

export async function getEventComments(eventId: string) {
  const session = await getSession();
  const userId = (session?.userId as string | undefined) ?? null;
  if (!(await canViewEventById(userId, eventId))) return [];

  return db
    .select({
      id: eventComments.id,
      content: eventComments.content,
      createdAt: eventComments.createdAt,
      userId: eventComments.userId,
      userName: users.fullName,
      userImage: users.image,
      userAvatar: users.avatarUrl,
    })
    .from(eventComments)
    .innerJoin(users, eq(eventComments.userId, users.id))
    .where(eq(eventComments.eventId, eventId))
    .orderBy(desc(eventComments.createdAt));
}

// ===========================================================================
// Mutations
// ===========================================================================

export async function createEvent(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };
  const userId = session.userId as string;

  const rl = await checkRateLimitAsync(userId, "createEvent");
  if (!rl.allowed) return { error: getRateLimitError(rl.resetTime!) };

  const parsed = eventSchema.safeParse(readEventInputFromForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }
  const v = parsed.data;

  // If communityId is set, the user must be owner/moderator OR platform staff.
  if (!(await canCreateOrMoveCommunityEvent(userId, v.communityId))) {
    return {
      error: "Only community owners or moderators can create community events",
    };
  }

  // Optional cover image upload
  const coverFile = formData.get("coverFile") as File | null;
  let coverUrl: string | null = null;
  let coverThumbnailUrl: string | null = null;
  let coverMediumUrl: string | null = null;
  if (coverFile && coverFile.size > 0) {
    const uploaded = await saveUploadFileWithMeta(coverFile, {
      subdir: "events",
      prefix: "cover",
      maxSize: 5 * 1024 * 1024,
      allowedMimePrefix: "image/",
    });
    coverUrl = uploaded?.url ?? null;
    coverThumbnailUrl = uploaded?.thumbnailUrl ?? null;
    coverMediumUrl = uploaded?.mediumUrl ?? null;
  }

  const maxAttendeesNum =
    v.maxAttendees == null || v.maxAttendees === ""
      ? null
      : Number(v.maxAttendees);

  try {
    await db.insert(events).values({
      title: v.title.slice(0, 160),
      description: v.description ? v.description.slice(0, 1500) : null,
      eventType: v.eventType as any,
      location: v.location ? v.location.slice(0, 220) : null,
      startTime: new Date(v.startTime),
      endTime: v.endTime ? new Date(v.endTime) : null,
      imageUrl: coverUrl,
      coverImageUrl: coverUrl,
      coverThumbnailUrl,
      coverMediumUrl,
      organizerId: userId,
      communityId: v.communityId || null,
      maxAttendees:
        Number.isFinite(maxAttendeesNum) && maxAttendeesNum! > 0
          ? maxAttendeesNum
          : null,
      enableWaitlist: v.enableWaitlist !== false,
      reminderOffsets: v.reminderOffsets || null,
    });

    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("Error creating event:", error);
    return { error: "Failed to create event" };
  }
}

export async function updateEvent(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };
  const userId = session.userId as string;

  const eventId = String(formData.get("eventId") || "");
  if (!eventId) return { error: "Missing eventId" };

  const [existing] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!existing) return { error: "Event not found" };

  if (
    !(await canManageEvent(userId, {
      id: existing.id,
      organizerId: existing.organizerId,
      communityId: existing.communityId ?? null,
    }))
  ) {
    return { error: "Forbidden" };
  }

  const parsed = eventSchema.safeParse(readEventInputFromForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }
  const v = parsed.data;
  const nextCommunityId = v.communityId || null;
  if (nextCommunityId !== (existing.communityId ?? null)) {
    const role = await getUserRole(userId);
    if (existing.organizerId !== userId && !isStaff(role)) {
      return {
        error: "Only the organizer can move an event between communities",
      };
    }
    if (!(await canCreateOrMoveCommunityEvent(userId, nextCommunityId))) {
      return {
        error:
          "Only community owners or moderators can create community events",
      };
    }
  } else if (
    nextCommunityId &&
    !(await canCreateOrMoveCommunityEvent(userId, nextCommunityId)) &&
    !(await canManageEvent(userId, {
      id: existing.id,
      organizerId: existing.organizerId,
      communityId: existing.communityId ?? null,
    }))
  ) {
    return { error: "Forbidden" };
  }

  let coverUrl: string | null | undefined = undefined;
  let coverThumbnailUrl: string | null | undefined = undefined;
  let coverMediumUrl: string | null | undefined = undefined;
  const coverFile = formData.get("coverFile") as File | null;
  if (coverFile && coverFile.size > 0) {
    const uploaded = await saveUploadFileWithMeta(coverFile, {
      subdir: "events",
      prefix: "cover",
      maxSize: 5 * 1024 * 1024,
      allowedMimePrefix: "image/",
    });
    coverUrl = uploaded?.url ?? undefined;
    coverThumbnailUrl = uploaded?.thumbnailUrl ?? undefined;
    coverMediumUrl = uploaded?.mediumUrl ?? undefined;
  }

  const maxAttendeesNum =
    v.maxAttendees == null || v.maxAttendees === ""
      ? null
      : Number(v.maxAttendees);

  try {
    const nextStartTime = new Date(v.startTime);
    const nextEndTime = v.endTime ? new Date(v.endTime) : null;
    const nextTitle = v.title.slice(0, 160);
    const nextDescription = v.description ? v.description.slice(0, 1500) : null;
    const nextLocation = v.location ? v.location.slice(0, 220) : null;

    await db
      .update(events)
      .set({
        title: nextTitle,
        description: nextDescription,
        eventType: v.eventType as any,
        location: nextLocation,
        startTime: nextStartTime,
        endTime: nextEndTime,
        ...(coverUrl !== undefined
          ? { imageUrl: coverUrl, coverImageUrl: coverUrl, coverThumbnailUrl: coverThumbnailUrl ?? null, coverMediumUrl: coverMediumUrl ?? null }
          : {}),
        communityId: nextCommunityId,
        maxAttendees:
          Number.isFinite(maxAttendeesNum) && maxAttendeesNum! > 0
            ? maxAttendeesNum
            : null,
        enableWaitlist: v.enableWaitlist !== false,
        reminderOffsets: v.reminderOffsets || null,
        lastReminderSentMinutes: null,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    await db
      .update(academicCalendar)
      .set({
        title: nextTitle,
        description: nextDescription,
        location: nextLocation,
        dueDate: nextStartTime,
        endDate: nextEndTime,
        communityId: nextCommunityId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(academicCalendar.title, existing.title),
          eq(academicCalendar.dueDate, existing.startTime),
          eq(academicCalendar.eventType, "event" as any),
          eq(academicCalendar.isPublic, false),
        ),
      );

    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating event:", error);
    return { error: "Failed to update event" };
  }
}

export async function deleteEvent(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };
  const userId = session.userId as string;

  const eventId = String(formData.get("eventId") || "");
  if (!eventId) return { error: "Missing eventId" };

  const [existing] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!existing) return { error: "Event not found" };

  if (
    !(await canManageEvent(userId, {
      id: existing.id,
      organizerId: existing.organizerId,
      communityId: existing.communityId ?? null,
    }))
  ) {
    return { error: "Forbidden" };
  }

  try {
    await db
      .delete(academicCalendar)
      .where(
        and(
          eq(academicCalendar.title, existing.title),
          eq(academicCalendar.dueDate, existing.startTime),
          eq(academicCalendar.eventType, "event" as any),
          eq(academicCalendar.isPublic, false),
        ),
      );
    await db.delete(events).where(eq(events.id, eventId));
    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { error: "Failed to delete event" };
  }
}

// ---------------------------------------------------------------------------
// RSVP
// ---------------------------------------------------------------------------

/**
 * Toggle / change a user's RSVP. Implements waitlist and calendar mirroring.
 */
export async function rsvpToEvent(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };
  const userId = session.userId as string;

  const eventId = String(formData.get("eventId") || "");
  const desired = String(formData.get("status") || "");
  if (!eventId || !desired) {
    return { error: "Event ID and status are required" };
  }

  const valid = ["going", "interested", "not_going"];
  if (!valid.includes(desired)) {
    return { error: "Invalid RSVP status" };
  }

  try {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) return { error: "Event not found" };
    if (!(await canViewEventById(userId, eventId))) {
      return { error: "Forbidden" };
    }
    if (event.isCancelled) {
      return { error: "Event has been cancelled" };
    }

    const [existing] = await db
      .select()
      .from(eventRsvps)
      .where(
        and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)),
      )
      .limit(1);

    let actualStatus = desired;
    let waitlistPosition: number | null = null;

    if (desired === "going") {
      const going = await countGoing(eventId);
      const isFull =
        event.maxAttendees != null &&
        event.maxAttendees > 0 &&
        going >= event.maxAttendees;

      // If the user already had a "going" we don't need to recount.
      const wasAlreadyGoing = existing?.status === "going";

      if (isFull && !wasAlreadyGoing) {
        if (!event.enableWaitlist) {
          return {
            error: "Event is full and the waitlist is disabled",
          };
        }
        if (existing?.status === "waitlisted") {
          waitlistPosition = existing.waitlistPosition ?? null;
        } else {
          const [tail] = await db
            .select({
              pos: sql<number>`COALESCE(MAX(waitlist_position), 0)::int`,
            })
            .from(eventRsvps)
            .where(
              and(
                eq(eventRsvps.eventId, eventId),
                eq(eventRsvps.status, "waitlisted"),
              ),
            );
          waitlistPosition = Number(tail?.pos ?? 0) + 1;
        }
        actualStatus = "waitlisted";
      }
    }

    if (existing) {
      const wasGoing = existing.status === "going";
      const wasWaitlisted = existing.status === "waitlisted";
      await db
        .update(eventRsvps)
        .set({
          status: actualStatus as any,
          waitlistPosition,
          updatedAt: new Date(),
        })
        .where(eq(eventRsvps.id, existing.id));
      // If the user just left "going", promote the first person on the waitlist.
      if (wasGoing && actualStatus !== "going") {
        await promoteFromWaitlist(eventId);
      } else if (wasWaitlisted && actualStatus !== "waitlisted") {
        await renumberWaitlist(eventId);
      }
    } else {
      await db.insert(eventRsvps).values({
        eventId,
        userId,
        status: actualStatus as any,
        waitlistPosition,
      });
    }

    if (actualStatus === "going") {
      await mirrorEventToCalendar(userId, eventId);
    }

    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/calendar");
    return {
      success: true,
      status: actualStatus,
      waitlistPosition,
    };
  } catch (error) {
    console.error("Error RSVPing:", error);
    return { error: "Failed to RSVP" };
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function createEventComment(formData: FormData) {
  const userId = await requireUserId();

  const rl = await checkRateLimitAsync(userId, "createComment");
  if (!rl.allowed) return { error: getRateLimitError(rl.resetTime!) };

  const parsed = eventCommentSchema.safeParse({
    eventId: formData.get("eventId"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid comment" };
  }
  if (!(await canViewEventById(userId, parsed.data.eventId))) {
    return { error: "Forbidden" };
  }

  try {
    const [row] = await db
      .insert(eventComments)
      .values({
        eventId: parsed.data.eventId,
        userId,
        content: parsed.data.content,
      })
      .returning({
        id: eventComments.id,
        createdAt: eventComments.createdAt,
      });

    revalidatePath(`/events/${parsed.data.eventId}`);
    return { success: true, id: row.id, createdAt: row.createdAt };
  } catch (err) {
    console.error("createEventComment error:", err);
    return { error: "Failed to post comment" };
  }
}

export async function deleteEventComment(formData: FormData) {
  const userId = await requireUserId();
  const commentId = String(formData.get("commentId") || "");
  if (!commentId) return { error: "Missing commentId" };

  const [c] = await db
    .select({
      id: eventComments.id,
      authorId: eventComments.userId,
      eventId: eventComments.eventId,
    })
    .from(eventComments)
    .where(eq(eventComments.id, commentId))
    .limit(1);
  if (!c) return { error: "Not found" };

  // Comment author can delete their own comment; organizers/staff can delete
  // any comment on their event.
  if (c.authorId !== userId) {
    const [event] = await db
      .select({
        id: events.id,
        organizerId: events.organizerId,
        communityId: events.communityId,
      })
      .from(events)
      .where(eq(events.id, c.eventId))
      .limit(1);
    if (!event || !(await canManageEvent(userId, event as any))) {
      return { error: "Forbidden" };
    }
  }

  await db.delete(eventComments).where(eq(eventComments.id, commentId));
  revalidatePath(`/events/${c.eventId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Co-organizers
// ---------------------------------------------------------------------------

export async function addCoOrganizer(eventId: string, targetUserId: string) {
  const userId = await requireUserId();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return { error: "Event not found" };
  if (!(await canManageEvent(userId, event))) return { error: "Forbidden" };
  if (targetUserId === event.organizerId) {
    return { error: "Organizer is already managing this event" };
  }

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (!target) return { error: "User not found" };

  if (
    event.communityId &&
    !(await isCommunityMember(targetUserId, event.communityId))
  ) {
    return { error: "Co-organizer must be a member of the event community" };
  }

  try {
    await db
      .insert(eventCoOrganizers)
      .values({ eventId, userId: targetUserId })
      .onConflictDoNothing();
    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (err) {
    console.error("addCoOrganizer error:", err);
    return { error: "Failed to add co-organizer" };
  }
}

export async function removeCoOrganizer(eventId: string, targetUserId: string) {
  const userId = await requireUserId();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return { error: "Event not found" };
  if (!(await canManageEvent(userId, event))) return { error: "Forbidden" };

  await db
    .delete(eventCoOrganizers)
    .where(
      and(
        eq(eventCoOrganizers.eventId, eventId),
        eq(eventCoOrganizers.userId, targetUserId),
      ),
    );
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function searchEventCoOrganizerCandidates(
  eventId: string,
  query: string,
) {
  const userId = await requireUserId();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return [];
  if (!(await canManageEvent(userId, event))) return [];

  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const conditions: SQL[] = [
    or(
      ilike(users.fullName, like),
      ilike(users.username, like),
      ilike(users.email, like),
      ilike(users.faculty, like),
    )!,
  ];
  if (event.communityId) {
    conditions.push(eq(communityMembers.communityId, event.communityId));
  }

  const rows = event.communityId
    ? await db
        .select({
          id: users.id,
          name: users.fullName,
          username: users.username,
          image: users.image,
          avatar: users.avatarUrl,
          faculty: users.faculty,
        })
        .from(communityMembers)
        .innerJoin(users, eq(communityMembers.userId, users.id))
        .where(and(...conditions))
        .limit(8)
    : await db
        .select({
          id: users.id,
          name: users.fullName,
          username: users.username,
          image: users.image,
          avatar: users.avatarUrl,
          faculty: users.faculty,
        })
        .from(users)
        .where(and(...conditions))
        .limit(8);

  const existing = await db
    .select({ userId: eventCoOrganizers.userId })
    .from(eventCoOrganizers)
    .where(eq(eventCoOrganizers.eventId, eventId));
  const existingIds = new Set(existing.map((c) => c.userId));

  return rows.filter(
    (u) => u.id !== event.organizerId && !existingIds.has(u.id),
  );
}

// ---------------------------------------------------------------------------
// QR check-in
// ---------------------------------------------------------------------------

/**
 * Returns the event's QR token, generating one on first call. Only the
 * organizer / co-organizer / staff can fetch it.
 */
export async function getEventQrToken(eventId: string) {
  const userId = await requireUserId();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) throw new Error("Event not found");

  if (
    !(await canManageEvent(userId, {
      id: event.id,
      organizerId: event.organizerId,
      communityId: event.communityId ?? null,
    }))
  ) {
    throw new Error("Forbidden");
  }

  if (event.qrToken) return event.qrToken;

  const token = crypto.randomBytes(20).toString("hex");
  await db.update(events).set({ qrToken: token }).where(eq(events.id, eventId));
  return token;
}

/**
 * Marks the current user as "checked in" if the supplied token matches the
 * event. Idempotent — if already checked in, returns success.
 *
 * Also auto-RSVPs the user as "going" if they hadn't yet (people who
 * physically showed up are obviously attending).
 */
export async function checkInWithToken(eventId: string, token: string) {
  const userId = await requireUserId();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return { error: "Event not found" };
  if (!(await canViewEventById(userId, eventId))) {
    return { error: "Forbidden" };
  }
  if (!event.qrToken || event.qrToken !== token) {
    return { error: "Invalid check-in code" };
  }
  if (event.isCancelled) {
    return { error: "Event has been cancelled" };
  }

  // Auto-RSVP to going if missing (don't promote out of the waitlist — they
  // physically attended, which is fine).
  const [rsvp] = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)))
    .limit(1);
  if (!rsvp) {
    await db.insert(eventRsvps).values({
      eventId,
      userId,
      status: "going",
    });
  } else if (rsvp.status !== "going") {
    await db
      .update(eventRsvps)
      .set({ status: "going", waitlistPosition: null, updatedAt: new Date() })
      .where(eq(eventRsvps.id, rsvp.id));
  }

  await mirrorEventToCalendar(userId, eventId);

  await db
    .insert(eventCheckIns)
    .values({ eventId, userId })
    .onConflictDoNothing();

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function getEventCheckIns(eventId: string) {
  const userId = await requireUserId();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) throw new Error("Event not found");
  if (
    !(await canManageEvent(userId, {
      id: event.id,
      organizerId: event.organizerId,
      communityId: event.communityId ?? null,
    }))
  ) {
    throw new Error("Forbidden");
  }
  return db
    .select({
      userId: eventCheckIns.userId,
      checkedInAt: eventCheckIns.checkedInAt,
      name: users.fullName,
      avatar: users.avatarUrl,
      image: users.image,
    })
    .from(eventCheckIns)
    .innerJoin(users, eq(eventCheckIns.userId, users.id))
    .where(eq(eventCheckIns.eventId, eventId))
    .orderBy(desc(eventCheckIns.checkedInAt));
}
