"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { academicCalendar } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";

export async function createCalendarEntry(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };

  const userId = session.userId as string;
  const rl = checkRateLimit(userId, "createCalendarEntry");
  if (!rl.allowed) return { error: getRateLimitError(rl.resetTime!) };

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const eventType = String(formData.get("eventType") || "other").trim();
  const course = String(formData.get("course") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "").trim();
  const isPublic = formData.get("isPublic") === "true";

  if (!title || !dueDateRaw) return { error: "Title and date are required" };

  const valid = ["exam","assignment","lecture","holiday","deadline","reminder","study_group","club","erasmus","event","other"];
  const type = valid.includes(eventType) ? eventType : "other";

  // Map extended types to schema enum
  const enumMap: Record<string,string> = {
    reminder: "other",
    study_group: "other",
    club: "other",
    erasmus: "other",
    event: "other",
  };
  const schemaType = enumMap[type] || type;

  try {
    await db.insert(academicCalendar).values({
      title: title.slice(0, 200),
      description: description ? description.slice(0, 1000) : null,
      eventType: schemaType as any,
      course: course ? course.slice(0, 100) : null,
      dueDate: new Date(dueDateRaw),
      createdBy: userId,
      isPublic,
    });

    revalidatePath("/calendar");
    return { success: true };
  } catch (err) {
    console.error("createCalendarEntry error:", err);
    return { error: "Failed to save" };
  }
}

export async function deleteCalendarEntry(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: "Unauthorized" };

  const userId = session.userId as string;
  const entryId = String(formData.get("entryId") || "");
  if (!entryId) return { error: "Missing entryId" };

  try {
    const [entry] = await db.select().from(academicCalendar).where(eq(academicCalendar.id, entryId)).limit(1);
    if (!entry) return { error: "Not found" };
    if (entry.createdBy !== userId) return { error: "Forbidden" };

    await db.delete(academicCalendar).where(eq(academicCalendar.id, entryId));
    revalidatePath("/calendar");
    return { success: true };
  } catch (err) {
    console.error("deleteCalendarEntry error:", err);
    return { error: "Failed to delete" };
  }
}
