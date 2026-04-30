"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events, eventRsvps } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";

/**
 * Create a new event
 */
export async function createEvent(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  // Check rate limit
  const rateLimitResult = checkRateLimit(userId, "createEvent");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime!) };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const eventType = formData.get("eventType") as string;
  const location = formData.get("location") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const maxAttendees = formData.get("maxAttendees") as string;

  if (!title || !eventType || !startTime) {
    return { error: "Title, type, and start time are required" };
  }

  const validEventTypes = ["party", "academic", "sports", "cultural", "workshop", "other"];
  if (!validEventTypes.includes(eventType)) {
    return { error: "Invalid event type" };
  }

  try {
    await db.insert(events).values({
      title,
      description: description || null,
      eventType: eventType as any,
      location: location || null,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      organizerId: userId,
    });

    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("Error creating event:", error);
    return { error: "Failed to create event" };
  }
}

/**
 * RSVP to an event
 */
export async function rsvpToEvent(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const eventId = formData.get("eventId") as string;
  const status = formData.get("status") as string;

  if (!eventId || !status) {
    return { error: "Event ID and status are required" };
  }

  const validStatuses = ["going", "interested", "not_going"];
  if (!validStatuses.includes(status)) {
    return { error: "Invalid RSVP status" };
  }

  try {
    // Check if RSVP already exists
    const [existing] = await db
      .select()
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing RSVP
      await db
        .update(eventRsvps)
        .set({
          status: status as any,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(eventRsvps.eventId, eventId),
            eq(eventRsvps.userId, userId)
          )
        );
    } else {
      // Create new RSVP
      await db.insert(eventRsvps).values({
        eventId,
        userId,
        status: status as any,
      });
    }

    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("Error RSVPing to event:", error);
    return { error: "Failed to RSVP" };
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const eventId = formData.get("eventId") as string;

  if (!eventId) {
    return { error: "Event ID is required" };
  }

  try {
    // Check if user is the organizer
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      return { error: "Event not found" };
    }

    if (event.organizerId !== userId) {
      return { error: "Only the organizer can delete this event" };
    }

    await db.delete(events).where(eq(events.id, eventId));

    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { error: "Failed to delete event" };
  }
}
