import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { academicCalendar, users, events, eventRsvps } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, or, and, inArray } from "drizzle-orm";
import CalendarPageClient from "@/components/CalendarPageClient";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  // 1. Academic calendar entries (public + own)
  const academicEntries = await db
    .select({
      id: academicCalendar.id,
      title: academicCalendar.title,
      description: academicCalendar.description,
      eventType: academicCalendar.eventType,
      course: academicCalendar.course,
      dueDate: academicCalendar.dueDate,
      isPublic: academicCalendar.isPublic,
      createdBy: academicCalendar.createdBy,
      creatorName: users.fullName,
    })
    .from(academicCalendar)
    .innerJoin(users, eq(academicCalendar.createdBy, users.id))
    .where(or(eq(academicCalendar.isPublic, true), eq(academicCalendar.createdBy, session.userId)))
    .orderBy(academicCalendar.dueDate)
    .limit(200);

  // 2. Events the user RSVP'd "going" to
  const myRsvps = await db
    .select({ eventId: eventRsvps.eventId })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.userId, session.userId), eq(eventRsvps.status, "going")));

  const rsvpEventIds = myRsvps.map(r => r.eventId);

  const rsvpEvents = rsvpEventIds.length > 0
    ? await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          eventType: events.eventType,
          location: events.location,
          startTime: events.startTime,
          endTime: events.endTime,
          organizerId: events.organizerId,
          organizerName: users.fullName,
        })
        .from(events)
        .innerJoin(users, eq(events.organizerId, users.id))
        .where(inArray(events.id, rsvpEventIds))
    : [];

  // Normalise academic entries
  const normalAcademic = academicEntries.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    eventType: e.eventType,
    category: e.eventType,
    course: e.course,
    location: null,
    onlineLink: null,
    dueDate: e.dueDate ? e.dueDate.toISOString() : new Date().toISOString(),
    endDate: null,
    isPublic: e.isPublic,
    createdBy: e.createdBy,
    creatorName: e.creatorName,
    source: "academic",
  }));

  // Normalise RSVP'd events
  const normalRsvp = rsvpEvents.map(e => ({
    id: `rsvp-${e.id}`,
    title: e.title,
    description: e.description,
    eventType: "event",
    category: "event",
    course: null,
    location: e.location,
    onlineLink: null,
    dueDate: e.startTime ? e.startTime.toISOString() : new Date().toISOString(),
    endDate: e.endTime ? e.endTime.toISOString() : null,
    isPublic: true,
    createdBy: e.organizerId,
    creatorName: e.organizerName,
    source: "rsvp",
  }));

  const allEntries = [...normalAcademic, ...normalRsvp].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <CalendarPageClient
      entries={allEntries}
      currentUserId={session.userId}
    />
  );
}
