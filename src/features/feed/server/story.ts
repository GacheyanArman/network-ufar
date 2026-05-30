"use server";

import { and, desc, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { stories, storyViews, users } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { saveUploadFileWithMeta } from "@/shared/storage/upload";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import { canModerate } from "@/shared/auth/roles";
import {
  parseFormDataWith,
  createStoryFormSchema,
  storyIdSchema,
} from "@/shared/validations/validations";

const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId as string;
}

export async function createStory(formData: FormData) {
  const userId = await requireUserId();

  const rate = await checkRateLimitAsync(userId, "uploadPhoto");
  if (!rate.allowed) throw new Error(getRateLimitError(rate.resetTime ?? Date.now()));

  const data = parseFormDataWith(createStoryFormSchema, formData);
  const image = formData.get("image") as File | null;
  const caption = data.caption || null;
  const location = data.location || null;

  if (!image || image.size === 0) throw new Error("No image provided");

  const uploaded = await saveUploadFileWithMeta(image, {
    subdir: "photos",
    prefix: "story",
    maxSize: 5 * 1024 * 1024,
    allowedMimePrefix: "image/",
    processImage: true,
  });
  const imageUrl = uploaded?.url ?? null;
  if (!imageUrl) throw new Error("Image upload failed");

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
  const { storyId } = parseFormDataWith(storyIdSchema, formData);

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
  const { storyId } = parseFormDataWith(storyIdSchema, formData);

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

  return rows.map((row: any) => ({
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
