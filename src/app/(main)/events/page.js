import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { events, eventRsvps, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, gte, sql } from "drizzle-orm";
import { createEvent, rsvpToEvent, deleteEvent } from "@/app/actions/events";

export default async function EventsPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  // Get upcoming events
  const upcomingEvents = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      maxAttendees: events.maxAttendees,
      organizerId: events.organizerId,
      organizerName: users.fullName,
      organizerImage: users.image,
      createdAt: events.createdAt,
    })
    .from(events)
    .innerJoin(users, eq(events.organizerId, users.id))
    .where(gte(events.startTime, new Date()))
    .orderBy(events.startTime)
    .limit(50);

  // Get RSVP counts for each event
  const eventIds = upcomingEvents.map((e) => e.id);
  const rsvpCounts = eventIds.length > 0 ? await db
    .select({
      eventId: eventRsvps.eventId,
      status: eventRsvps.status,
      count: sql<number>`count(*)::int`,
    })
    .from(eventRsvps)
    .where(sql`${eventRsvps.eventId} = ANY(${eventIds})`)
    .groupBy(eventRsvps.eventId, eventRsvps.status) : [];

  // Get user's RSVPs
  const userRsvps = eventIds.length > 0 ? await db
    .select({
      eventId: eventRsvps.eventId,
      status: eventRsvps.status,
    })
    .from(eventRsvps)
    .where(eq(eventRsvps.userId, session.userId)) : [];

  const userRsvpMap = new Map(userRsvps.map((r) => [r.eventId, r.status]));

  const eventsWithRsvps = upcomingEvents.map((event) => {
    const going = rsvpCounts.find((r) => r.eventId === event.id && r.status === "going")?.count || 0;
    const interested = rsvpCounts.find((r) => r.eventId === event.id && r.status === "interested")?.count || 0;

    return {
      ...event,
      goingCount: going,
      interestedCount: interested,
      userRsvp: userRsvpMap.get(event.id) || null,
    };
  });

  return (
    <div className="card" style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 900 }}>
              University Events
            </h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
              Discover and join campus events, parties, and activities
            </p>
          </div>
          <button
            onClick={() => {
              const modal = document.getElementById("create-event-modal");
              if (modal) modal.style.display = "flex";
            }}
            className="btn btn-primary"
          >
            Create Event
          </button>
        </div>
      </div>

      {eventsWithRsvps.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>
            📅
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>
            No upcoming events
          </h3>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
            Be the first to create an event!
          </p>
        </div>
      ) : (
        <div style={{ padding: "16px" }}>
          {eventsWithRsvps.map((event) => {
            const eventDate = new Date(event.startTime);
            const isOrganizer = event.organizerId === session.userId;

            return (
              <div
                key={event.id}
                style={{
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", gap: "16px" }}>
                  <div
                    style={{
                      width: "60px",
                      textAlign: "center",
                      padding: "8px",
                      borderRadius: "8px",
                      background: "var(--french-blue)",
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>
                      {eventDate.toLocaleDateString("en-US", { month: "short" })}
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 900 }}>
                      {eventDate.getDate()}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 900 }}>
                          {event.title}
                        </h3>
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: "var(--bg-secondary)",
                            marginRight: "8px",
                            textTransform: "capitalize",
                          }}>
                            {event.eventType}
                          </span>
                          {eventDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          {event.location && ` • ${event.location}`}
                        </div>
                      </div>
                    </div>

                    {event.description && (
                      <p style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text-primary)" }}>
                        {event.description}
                      </p>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <Link href={`/profile/${event.organizerId}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
                        {event.organizerImage ? (
                          <img
                            src={event.organizerImage}
                            alt={event.organizerName}
                            style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }}
                          />
                        ) : (
                          <div style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "var(--french-blue)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}>
                            {event.organizerName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                          Organized by {event.organizerName}
                        </span>
                      </Link>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                      <span>👥 {event.goingCount} going</span>
                      <span>⭐ {event.interestedCount} interested</span>
                      {event.maxAttendees && (
                        <span>📊 Max: {event.maxAttendees}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <form action={rsvpToEvent}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="status" value="going" />
                        <button
                          type="submit"
                          className={event.userRsvp === "going" ? "btn btn-primary" : "btn btn-secondary"}
                          style={{ fontSize: "13px" }}
                        >
                          {event.userRsvp === "going" ? "✓ Going" : "Going"}
                        </button>
                      </form>

                      <form action={rsvpToEvent}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="status" value="interested" />
                        <button
                          type="submit"
                          className={event.userRsvp === "interested" ? "btn btn-primary" : "btn btn-secondary"}
                          style={{ fontSize: "13px" }}
                        >
                          {event.userRsvp === "interested" ? "⭐ Interested" : "Interested"}
                        </button>
                      </form>

                      {isOrganizer && (
                        <form action={deleteEvent}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <button
                            type="submit"
                            className="btn btn-secondary"
                            style={{ fontSize: "13px", color: "var(--error-color)" }}
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      <div
        id="create-event-modal"
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.style.display = "none";
          }
        }}
      >
        <div className="card" style={{ maxWidth: "600px", width: "90%", padding: "24px", maxHeight: "90vh", overflowY: "auto" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 900 }}>
            Create New Event
          </h2>

          <form action={createEvent}>
            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Title</span>
              <input
                type="text"
                name="title"
                required
                placeholder="Event title"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Type</span>
              <select
                name="eventType"
                required
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              >
                <option value="party">Party</option>
                <option value="academic">Academic</option>
                <option value="sports">Sports</option>
                <option value="cultural">Cultural</option>
                <option value="workshop">Workshop</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Description</span>
              <textarea
                name="description"
                placeholder="Event description"
                rows={4}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", resize: "vertical" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Location</span>
              <input
                type="text"
                name="location"
                placeholder="Event location"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Start Time</span>
              <input
                type="datetime-local"
                name="startTime"
                required
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>End Time (Optional)</span>
              <input
                type="datetime-local"
                name="endTime"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Max Attendees (Optional)</span>
              <input
                type="number"
                name="maxAttendees"
                min="1"
                placeholder="Leave empty for unlimited"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </label>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  const modal = document.getElementById("create-event-modal");
                  if (modal) modal.style.display = "none";
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Event
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
