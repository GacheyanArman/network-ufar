"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { 
  libraryResources, 
  libraryRequests, 
  librarySavedResources 
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and } from "drizzle-orm";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";

export async function suggestResource(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  const rateLimitResult = checkRateLimit(userId, "suggestLibraryResource");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime!) };
  }

  const title = formData.get("title") as string;
  const type = formData.get("type") as any;
  const locationOrLink = formData.get("locationOrLink") as string;
  const faculty = formData.get("faculty") as string;
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;

  if (!title || !type || !faculty || !subject) {
    return { error: "Missing required fields" };
  }

  try {
    await db.insert(libraryResources).values({
      title,
      type,
      locationOrLink: locationOrLink || null,
      faculty,
      subject,
      description: description || null,
      status: "pending", // Requires moderator approval
      availability: "request_needed", // Default
      createdBy: userId,
    });

    revalidatePath("/library");
    return { success: true };
  } catch (error) {
    console.error("Error suggesting resource:", error);
    return { error: "Failed to suggest resource" };
  }
}

export async function requestBook(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  const rateLimitResult = checkRateLimit(userId, "requestLibraryBook");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime!) };
  }

  const title = formData.get("title") as string;
  const author = formData.get("author") as string;
  const subject = formData.get("subject") as string;
  const faculty = formData.get("faculty") as string;
  const reason = formData.get("reason") as string;
  const urgency = formData.get("urgency") as any;
  const link = formData.get("link") as string;

  if (!title || !subject || !faculty || !reason) {
    return { error: "Missing required fields" };
  }

  try {
    await db.insert(libraryRequests).values({
      title,
      author: author || null,
      subject,
      faculty,
      reason,
      urgency: urgency || "medium",
      link: link || null,
      status: "pending",
      userId,
    });

    revalidatePath("/library");
    return { success: true };
  } catch (error) {
    console.error("Error requesting book:", error);
    return { error: "Failed to request book" };
  }
}

export async function toggleSaveResource(resourceId: string) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  try {
    const [existing] = await db
      .select()
      .from(librarySavedResources)
      .where(
        and(
          eq(librarySavedResources.userId, userId),
          eq(librarySavedResources.resourceId, resourceId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .delete(librarySavedResources)
        .where(eq(librarySavedResources.id, existing.id));
    } else {
      await db.insert(librarySavedResources).values({
        userId,
        resourceId,
      });
    }

    revalidatePath("/library");
    return { success: true };
  } catch (error) {
    console.error("Error toggling save status:", error);
    return { error: "Failed to toggle save status" };
  }
}

export async function toggleSaveReadingList(listId: string) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  try {
    const [existing] = await db
      .select()
      .from(librarySavedResources)
      .where(
        and(
          eq(librarySavedResources.userId, userId),
          eq(librarySavedResources.listId, listId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .delete(librarySavedResources)
        .where(eq(librarySavedResources.id, existing.id));
    } else {
      await db.insert(librarySavedResources).values({
        userId,
        listId,
      });
    }

    revalidatePath("/library");
    return { success: true };
  } catch (error) {
    console.error("Error toggling save status:", error);
    return { error: "Failed to toggle save status" };
  }
}
