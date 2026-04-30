"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { academicCalendar } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";

/**
 * Create a new academic calendar entry
 */
export async function createCalendarEntry(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  // Check rate limit
  const rateLimitResult = checkRateLimit(userId, "createCalendarEntry");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime!) };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const eventType = formData.get("eventType") as string;
  const course = formData.get("course") as string;
  const dueDate = formData.get("dueDate") as string;
  const isPublic = formData.get("isPublic") === "true";

  if (!title || !eventType || !dueDate) {
    return { error: "Title, type, and due date are required" };
  }

  const validEventTypes = ["exam", "assignment", "lecture", "holiday", "deadline", "other"];
  if (!validEventTypes.includes(eventType)) {
    return { error: "Invalid event type" };
  }

  try {
    await db.insert(academicCalendar).values({
      title,
      description: description || null,
      eventType: eventType as any,
      course: course || null,
      dueDate: new Date(dueDate),
      createdBy: userId,
      isPublic,
    });

    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    console.error("Error creating calendar entry:", error);
    return { error: "Failed to create calendar entry" };
  }
}

/**
 * Delete a calendar entry
 */
export async function deleteCalendarEntry(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const entryId = formData.get("entryId") as string;

  if (!entryId) {
    return { error: "Entry ID is required" };
  }

  try {
    // Check if user created this entry
    const [entry] = await db
      .select()
      .from(academicCalendar)
      .where(eq(academicCalendar.id, entryId))
      .limit(1);

    if (!entry) {
      return { error: "Entry not found" };
    }

    if (entry.createdBy !== userId) {
      return { error: "Only the creator can delete this entry" };
    }

    await db.delete(academicCalendar).where(eq(academicCalendar.id, entryId));

    revalidatePath("/calendar");
    return { success: true };
  } catch (error) {
    console.error("Error deleting calendar entry:", error);
    return { error: "Failed to delete entry" };
  }
}
