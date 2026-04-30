"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { schedule } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";

/**
 * Create a new schedule entry
 */
export async function createScheduleEntry(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const courseName = formData.get("courseName") as string;
  const courseCode = formData.get("courseCode") as string;
  const instructor = formData.get("instructor") as string;
  const room = formData.get("room") as string;
  const dayOfWeek = parseInt(formData.get("dayOfWeek") as string);
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const faculty = formData.get("faculty") as string;
  const semester = formData.get("semester") as string;
  const isPublic = formData.get("isPublic") === "true";

  if (!courseName || isNaN(dayOfWeek) || !startTime || !endTime) {
    return { error: "Course name, day, start time, and end time are required" };
  }

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return { error: "Invalid day of week" };
  }

  try {
    await db.insert(schedule).values({
      courseName,
      courseCode: courseCode || null,
      instructor: instructor || null,
      room: room || null,
      dayOfWeek,
      startTime,
      endTime,
      faculty: faculty || null,
      semester: semester || null,
      createdBy: userId,
      isPublic,
    });

    revalidatePath("/schedule");
    return { success: true };
  } catch (error) {
    console.error("Error creating schedule entry:", error);
    return { error: "Failed to create schedule entry" };
  }
}

/**
 * Delete a schedule entry
 */
export async function deleteScheduleEntry(formData: FormData) {
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
      .from(schedule)
      .where(eq(schedule.id, entryId))
      .limit(1);

    if (!entry) {
      return { error: "Entry not found" };
    }

    if (entry.createdBy !== userId) {
      return { error: "Only the creator can delete this entry" };
    }

    await db.delete(schedule).where(eq(schedule.id, entryId));

    revalidatePath("/schedule");
    return { success: true };
  } catch (error) {
    console.error("Error deleting schedule entry:", error);
    return { error: "Failed to delete entry" };
  }
}
