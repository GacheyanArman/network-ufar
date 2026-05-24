import { NextResponse } from "next/server";
import { db } from "@/shared/db/db";
import {
  academicCalendar,
  eventRsvps,
  events,
  notifications,
  users,
} from "@/shared/db/schema";
import { and, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { sendEmail } from "@/shared/mail/mail";

export const dynamic = "force-dynamic";

/**
 * Reminder cron — to be called by Vercel Cron / GitHub Actions every 5
 * minutes. Sends in-app notifications and (when SMTP is configured) emails
 * for any calendar entries whose due date is now within one of the
 * configured offsets (e.g. 1 day / 3 hours / 30 minutes).
 *
 * Set CRON_SECRET in env to require `Authorization: Bearer <secret>` on
 * incoming calls. If unset, the endpoint is public (useful for local cron
 * testing) but logs a warning.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn(
      "[cron/reminders] CRON_SECRET is not set — endpoint is public!",
    );
  }

  const now = new Date();
  // Look at entries due in the next 25 hours (covers the 1-day offset).
  const horizon = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const candidates = await db
    .select({
      id: academicCalendar.id,
      title: academicCalendar.title,
      description: academicCalendar.description,
      dueDate: academicCalendar.dueDate,
      reminderOffsets: academicCalendar.reminderOffsets,
      lastReminderSentMinutes: academicCalendar.lastReminderSentMinutes,
      createdBy: academicCalendar.createdBy,
    })
    .from(academicCalendar)
    .where(
      and(
        isNotNull(academicCalendar.reminderOffsets),
        gte(academicCalendar.dueDate, now),
        lte(academicCalendar.dueDate, horizon),
      ),
    );

  let fired = 0;
  for (const entry of candidates) {
    if (!entry.reminderOffsets) continue;
    const offsets = entry.reminderOffsets
      .split(",")
      .map((x: string) => Number(x.trim()))
      .filter((n: number) => Number.isFinite(n) && n >= 0)
      .sort((a: number, b: number) => b - a); // largest offset first

    const minutesUntil = Math.floor(
      (entry.dueDate.getTime() - now.getTime()) / 60000,
    );

    // Pick the largest offset that is <= time-until-due AND has not been
    // fired yet. (We track the smallest offset already sent; once we sent
    // the 30-min reminder we shouldn't go back to 1d.)
    const lastSent = entry.lastReminderSentMinutes;
    const eligible = offsets.find(
      (off: number) =>
        minutesUntil <= off &&
        (lastSent === null || lastSent === undefined || off < lastSent),
    );
    if (eligible === undefined) continue;

    // Fan-out: in-app notification + email (best-effort).
    const [user] = await db
      .select({ email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, entry.createdBy))
      .limit(1);

    await db.insert(notifications).values({
      userId: entry.createdBy,
      type: "reminder" as any,
      entityId: entry.id,
    });

    if (user?.email) {
      const friendlyOffset =
        eligible >= 60 * 24
          ? `${Math.round(eligible / (60 * 24))} day(s)`
          : eligible >= 60
            ? `${Math.round(eligible / 60)} hour(s)`
            : `${eligible} minute(s)`;
      await sendEmail({
        to: user.email,
        subject: `Reminder: ${entry.title} in ${friendlyOffset}`,
        text: `Hi ${user.fullName || ""},

This is a reminder that "${entry.title}" is due in ${friendlyOffset} (at ${entry.dueDate.toLocaleString()}).

${entry.description || ""}

— UFAR Network`,
      });
    }

    await db
      .update(academicCalendar)
      .set({ lastReminderSentMinutes: eligible })
      .where(eq(academicCalendar.id, entry.id));

    fired += 1;
  }

  const eventCandidates = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      startTime: events.startTime,
      reminderOffsets: events.reminderOffsets,
      lastReminderSentMinutes: events.lastReminderSentMinutes,
      organizerId: events.organizerId,
    })
    .from(events)
    .where(
      and(
        isNotNull(events.reminderOffsets),
        gte(events.startTime, now),
        lte(events.startTime, horizon),
      ),
    );

  let eventFired = 0;
  for (const event of eventCandidates) {
    if (!event.reminderOffsets) continue;
    const offsets = event.reminderOffsets
      .split(",")
      .map((x: string) => Number(x.trim()))
      .filter((n: number) => Number.isFinite(n) && n >= 0)
      .sort((a: number, b: number) => b - a);

    const minutesUntil = Math.floor(
      (event.startTime.getTime() - now.getTime()) / 60000,
    );
    const lastSent = event.lastReminderSentMinutes;
    const eligible = offsets.find(
      (off: number) =>
        minutesUntil <= off &&
        (lastSent === null || lastSent === undefined || off < lastSent),
    );
    if (eligible === undefined) continue;

    const goingRows = await db
      .select({ userId: eventRsvps.userId })
      .from(eventRsvps)
      .where(
        and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")),
      );
    const recipientIds = Array.from(
      new Set([event.organizerId, ...goingRows.map((r: { userId: string }) => r.userId)]),
    );
    if (recipientIds.length === 0) continue;

    const recipients = await db
      .select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users)
      .where(inArray(users.id, recipientIds));

    const friendlyOffset =
      eligible >= 60 * 24
        ? `${Math.round(eligible / (60 * 24))} day(s)`
        : eligible >= 60
          ? `${Math.round(eligible / 60)} hour(s)`
          : `${eligible} minute(s)`;

    for (const user of recipients) {
      await db.insert(notifications).values({
        userId: user.id,
        type: "reminder" as any,
        entityId: event.id,
      });

      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: `Reminder: ${event.title} in ${friendlyOffset}`,
          text: `Hi ${user.fullName || ""},

This is a reminder that "${event.title}" starts in ${friendlyOffset} (at ${event.startTime.toLocaleString()}).

${event.description || ""}

— UFAR Network`,
        });
      }
    }

    await db
      .update(events)
      .set({ lastReminderSentMinutes: eligible })
      .where(eq(events.id, event.id));

    eventFired += recipients.length;
  }

  return NextResponse.json({
    ok: true,
    fired,
    eventFired,
    scanned: candidates.length,
    eventScanned: eventCandidates.length,
  });
}
