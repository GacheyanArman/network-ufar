"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { 
  libraryResources, 
  libraryRequests, 
  librarySavedResources 
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq, and } from "drizzle-orm";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import {
  safeParseFormData,
  suggestResourceSchema,
  requestBookSchema,
} from "@/shared/validations/validations";

export async function suggestResource(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  const rateLimitResult = await checkRateLimitAsync(userId, "suggestLibraryResource");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime ?? Date.now()) };
  }

  const parsed = safeParseFormData(suggestResourceSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const data = parsed.data;

  try {
    await db.insert(libraryResources).values({
      title: data.title,
      type: data.type as any,
      locationOrLink: data.locationOrLink || null,
      faculty: data.faculty,
      subject: data.subject,
      description: data.description || null,
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

  const rateLimitResult = await checkRateLimitAsync(userId, "requestLibraryBook");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime ?? Date.now()) };
  }

  const parsed = safeParseFormData(requestBookSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const data = parsed.data;

  try {
    await db.insert(libraryRequests).values({
      title: data.title,
      author: data.author || null,
      subject: data.subject,
      faculty: data.faculty,
      reason: data.reason,
      urgency: (data.urgency || "medium") as any,
      link: data.link || null,
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
