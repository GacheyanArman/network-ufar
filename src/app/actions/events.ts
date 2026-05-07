"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events, eventRsvps } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";
import { saveUploadFile } from "@/lib/upload";

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

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const rawEventType = String(formData.get("eventType") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const startTime = String(formData.get("startTime") || "").trim();
  const endTime = String(formData.get("endTime") || "").trim();
  const maxAttendees = String(formData.get("maxAttendees") || "").trim();

  // Handle cover image file upload
  const coverFile = formData.get("coverFile") as File | null;
  let imageUrl: string | null = null;
  if (coverFile && coverFile.size > 0) {
    imageUrl = await saveUploadFile(coverFile, {
      subdir: "events",
      prefix: "cover",
      allowedMimePrefix: "image/",
    });
  }

  const categoryMap: Record<string, string> = {
    academic: "academic",
    clubs: "cultural",
    career: "other",
    erasmus: "cultural",
    sports: "sports",
    parties: "party",
    party: "party",
    workshops: "workshop",
    workshop: "workshop",
    exams: "academic",
    student_life: "other",
    volunteering: "other",
    cultural: "cultural",
    other: "other",
  };

  const eventType = categoryMap[rawEventType] || rawEventType;

  if (!title || !eventType || !startTime) {
    return { error: "Title, type, and start time are required" };
  }

  const validEventTypes = [
    "party",
    "academic",
    "sports",
    "cultural",
    "workshop",
    "other",
  ];

  if (!validEventTypes.includes(eventType)) {
    return { error: "Invalid event type" };
  }

   try {
    await db.insert(events).values({
      title: title.slice(0, 160),
      description: description ? description.slice(0, 1200) : null,
      eventType: eventType as any,
      location: location ? location.slice(0, 220) : null,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      imageUrl: imageUrl || null,
      maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
      organizerId: userId,
    });

    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("Error creating event:", error);
    return { error: "Failed to create event" };
  }
}

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
