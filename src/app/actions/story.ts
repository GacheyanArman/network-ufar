"use server";

import { and, desc, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { stories, storyViews, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { saveUploadFile } from "@/lib/upload";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";
import { canModerate } from "@/lib/roles";

const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId as string;
}

export async function createStory(formData: FormData) {
  const userId = await requireUserId();

  const rate = checkRateLimit(userId, "uploadPhoto");
  if (!rate.allowed) throw new Error(getRateLimitError(rate.resetTime));

  const image = formData.get("image") as File | null;
  const caption = String(formData.get("caption") || "").trim().slice(0, 240) || null;
  const location = String(formData.get("location") || "").trim().slice(0, 120) || null;

  if (!image || image.size === 0) throw new Error("No image provided");

  const imageUrl = await saveUploadFile(image, {
    subdir: "photos",
    prefix: "story",
    maxSize: 5 * 1024 * 1024,
    allowedMimePrefix: "image/",
  });

  const expiresAt = new Date(Date.now() + STORY_TTL_MS);

  const inserted = await db
    .insert(stories)
    .values({
      ownerId: userId,
      imageUrl,
      caption,
      location,
      expiresAt,
    })
    .returning({ id: stories.id });

  revalidatePath("/photos");
  return { ok: true, storyId: inserted[0].id };
}

export async function viewStory(formData: FormData) {
  const userId = await requireUserId();
  const storyId = formData.get("storyId")?.toString().trim();
  if (!storyId) throw new Error("Invalid story");

  // Avoid noisy uniqueness violations.
  try {
    await db
      .insert(storyViews)
      .values({ storyId, viewerId: userId });
  } catch {
    /* already viewed */
  }

  return { ok: true };
}

export async function deleteStory(formData: FormData) {
  const userId = await requireUserId();
  const storyId = formData.get("storyId")?.toString().trim();
  if (!storyId) throw new Error("Invalid story");

  const [story] = await db
    .select({ ownerId: stories.ownerId })
    .from(stories)
    .where(eq(stories.id, storyId));
  if (!story) throw new Error("Not found");
  if (!(await canModerate(userId, story.ownerId))) throw new Error("Forbidden");

  await db.delete(stories).where(eq(stories.id, storyId));

  revalidatePath("/photos");
  return { ok: true };
}

/**
 * Returns one row per author with at least one active (non-expired) story,
 * indicating whether the current viewer has seen ALL of that author's stories.
 */
export async function getActiveStoryAuthors(viewerId: string) {
  const now = new Date();

  const rows = await db
    .select({
      ownerId: stories.ownerId,
      ownerName: users.fullName,
      ownerAvatar: users.image,
      storyCount: sql<number>`COUNT(${stories.id})::int`,
      latestAt: sql<Date>`MAX(${stories.createdAt})`,
      seenCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${storyViews}
        WHERE ${storyViews.storyId} IN (
          SELECT id FROM ${stories} s2
          WHERE s2.owner_id = ${stories.ownerId}
            AND s2.expires_at > ${now}
        )
        AND ${storyViews.viewerId} = ${viewerId}
      )`,
    })
    .from(stories)
    .innerJoin(users, eq(stories.ownerId, users.id))
    .where(gt(stories.expiresAt, now))
    .groupBy(stories.ownerId, users.fullName, users.image)
    .orderBy(desc(sql`MAX(${stories.createdAt})`));

  return rows.map((row) => ({
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    ownerAvatar: row.ownerAvatar,
    storyCount: row.storyCount,
    latestAt: row.latestAt,
    allSeen: row.seenCount >= row.storyCount,
  }));
}

/**
 * Stories of one author, oldest-first. Includes view info if viewer is owner.
 */
export async function getActiveStoriesForAuthor(ownerId: string) {
  const now = new Date();
  const rows = await db
    .select({
      id: stories.id,
      imageUrl: stories.imageUrl,
      caption: stories.caption,
      location: stories.location,
      createdAt: stories.createdAt,
      expiresAt: stories.expiresAt,
      ownerId: stories.ownerId,
      ownerName: users.fullName,
      ownerAvatar: users.image,
      viewsCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${storyViews}
        WHERE ${storyViews.storyId} = ${stories.id}
      )`,
    })
    .from(stories)
    .innerJoin(users, eq(stories.ownerId, users.id))
    .where(and(eq(stories.ownerId, ownerId), gt(stories.expiresAt, now)))
    .orderBy(stories.createdAt);
  return rows;
}
