import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events, eventRsvps, users, communities } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, gte, inArray, sql, and } from "drizzle-orm";
import EventsPageClient from "@/components/EventsPageClient";

export default async function EventsPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const upcomingEvents = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      imageUrl: events.imageUrl,
      maxAttendees: events.maxAttendees,
      organizerId: events.organizerId,
      organizerName: users.fullName,
      organizerImage: users.image,
      communityName: communities.name,
      createdAt: events.createdAt,
    })
    .from(events)
    .innerJoin(users, eq(events.organizerId, users.id))
    .leftJoin(communities, eq(events.communityId, communities.id))
    .where(gte(events.startTime, new Date()))
    .orderBy(events.startTime)
    .limit(80);

  const eventIds = upcomingEvents.map((event) => event.id);

  const rsvpCounts =
    eventIds.length > 0
      ? await db
          .select({
            eventId: eventRsvps.eventId,
            status: eventRsvps.status,
            count: sql`count(*)::int`,
          })
          .from(eventRsvps)
          .where(inArray(eventRsvps.eventId, eventIds))
          .groupBy(eventRsvps.eventId, eventRsvps.status)
      : [];

  const userRsvps =
    eventIds.length > 0
      ? await db
          .select({
            eventId: eventRsvps.eventId,
            status: eventRsvps.status,
          })
          .from(eventRsvps)
          .where(
            and(
              eq(eventRsvps.userId, session.userId),
              inArray(eventRsvps.eventId, eventIds)
            )
          )
      : [];

  const userRsvpMap = new Map(
    userRsvps.map((row) => [row.eventId, row.status])
  );

  const countsByEvent = new Map();

  for (const row of rsvpCounts) {
    const current = countsByEvent.get(row.eventId) || {
      going: 0,
      interested: 0,
      not_going: 0,
    };

    current[row.status] = Number(row.count || 0);
    countsByEvent.set(row.eventId, current);
  }

  const normalizedEvents = upcomingEvents.map((event) => {
    const counts = countsByEvent.get(event.id) || {
      going: 0,
      interested: 0,
      not_going: 0,
    };

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      location: event.location,
      startTime: event.startTime ? event.startTime.toISOString() : null,
      endTime: event.endTime ? event.endTime.toISOString() : null,
      imageUrl: event.imageUrl,
      maxAttendees: event.maxAttendees,
      organizerId: event.organizerId,
      organizerName: event.organizerName,
      organizerImage: event.organizerImage,
      communityName: event.communityName,
      createdAt: event.createdAt ? event.createdAt.toISOString() : null,
      goingCount: counts.going,
      maybeCount: counts.interested,
      notGoingCount: counts.not_going,
      rsvpStatus: userRsvpMap.get(event.id) || null,
    };
  });

  return (
    <EventsPageClient
      events={normalizedEvents}
      currentUserId={session.userId}
    />
  );
}