"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { schedule } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq } from "drizzle-orm";
import {
  safeParseFormData,
  createScheduleEntrySchema,
  scheduleEntryIdSchema,
} from "@/shared/validations/validations";

/**
 * Create a new schedule entry
 */
export async function createScheduleEntry(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const parsed = safeParseFormData(createScheduleEntrySchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const data = parsed.data;

  try {
    await db.insert(schedule).values({
      courseName: data.courseName,
      courseCode: data.courseCode || null,
      instructor: data.instructor || null,
      room: data.room || null,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      faculty: data.faculty || null,
      semester: data.semester || null,
      createdBy: userId,
      isPublic: data.isPublic ?? false,
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
  const parsed = safeParseFormData(scheduleEntryIdSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { entryId } = parsed.data;

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
