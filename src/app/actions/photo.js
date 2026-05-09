"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  photoAlbums,
  photos,
  photoLikes,
  photoSaves,
  photoTags,
  photoComments,
  photoHashtags,
  hashtags,
  reports,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { saveUploadFile } from "@/lib/upload";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";
import { canModerate, isStaff, getUserRole } from "@/lib/roles";
import { extractHashtags } from "@/lib/hashtags";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

/**
 * Persist hashtags discovered in a caption + link them to a photo.
 * Idempotent: re-running for the same photo replaces previous links.
 */
async function syncPhotoHashtags(photoId, caption) {
  const tags = extractHashtags(caption);

  // Wipe previous links so editing/recreating works cleanly.
  await db.delete(photoHashtags).where(eq(photoHashtags.photoId, photoId));

  if (tags.length === 0) return;

  // Upsert hashtag rows + bump usageCount.
  for (const tag of tags) {
    const existing = await db
      .select({ id: hashtags.id })
      .from(hashtags)
      .where(eq(hashtags.tag, tag))
      .limit(1);

    let hashtagId;
    if (existing[0]) {
      hashtagId = existing[0].id;
      await db
        .update(hashtags)
        .set({ usageCount: sql`${hashtags.usageCount} + 1` })
        .where(eq(hashtags.id, hashtagId));
    } else {
      const inserted = await db
        .insert(hashtags)
        .values({ tag, usageCount: 1 })
        .returning({ id: hashtags.id });
      hashtagId = inserted[0].id;
    }

    await db.insert(photoHashtags).values({ photoId, hashtagId });
  }
}

/**
 * Create an Instagram-style photo post (Campus Moment).
 * Backwards compatible with the older uploadPhoto contract.
 */
export async function createPhotoPost(formData) {
  const userId = await requireUserId();

  const rate = checkRateLimit(userId, "uploadPhoto");
  if (!rate.allowed) throw new Error(getRateLimitError(rate.resetTime));

  const image = formData.get("image");
  const caption = String(formData.get("caption") || "").trim().slice(0, 2200);
  const location = String(formData.get("location") || "").trim().slice(0, 120) || null;
  const isPrivate = formData.get("isPrivate") === "true";
  const albumId = formData.get("albumId")?.toString().trim() || null;
  const eventId = formData.get("eventId")?.toString().trim() || null;
  const taggedIdsRaw = formData.get("taggedUserIds")?.toString() || "";

  if (!image || image.size === 0) throw new Error("No image file provided");

  const imageUrl = await saveUploadFile(image, {
    subdir: "photos",
    prefix: "photo",
    maxSize: 5 * 1024 * 1024,
    allowedMimePrefix: "image/",
  });

  const inserted = await db
    .insert(photos)
    .values({
      imageUrl,
      caption,
      location,
      isPrivate,
      albumId,
      eventId,
      ownerId: userId,
    })
    .returning({ id: photos.id });

  const photoId = inserted[0].id;

  // Hashtags
  await syncPhotoHashtags(photoId, caption);

  // Tagged users (pending, requires the tagged user to approve)
  const taggedIds = taggedIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
  for (const taggedId of taggedIds) {
    if (taggedId === userId) continue;
    try {
      await db.insert(photoTags).values({
        photoId,
        userId: taggedId,
        taggedBy: userId,
        status: "pending",
      });
    } catch {
      // ignore unique violations
    }
  }

  revalidatePath("/photos");
  revalidatePath("/photos/explore");
  revalidatePath(`/profile/${userId}`);
  return { ok: true, photoId };
}

// Backwards-compatible alias.
export async function uploadPhoto(formData) {
  return createPhotoPost(formData);
}

export async function createPhotoAlbum(formData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "other").trim();
  const eventDate = formData.get("eventDate")?.toString().trim() || null;
  const eventId = formData.get("eventId")?.toString().trim() || null;
  const isPrivate = formData.get("isPrivate") === "true";

  if (!title) throw new Error("Album title is required");

  await db.insert(photoAlbums).values({
    title: title.slice(0, 120),
    description: description.slice(0, 400),
    category,
    eventDate: eventDate ? new Date(eventDate) : null,
    eventId,
    isPrivate,
    ownerId: userId,
  });

  revalidatePath("/photos");
  revalidatePath("/photos/albums");
  if (eventId) revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function deletePhotoAlbum(formData) {
  const userId = await requireUserId();
  const albumId = formData.get("albumId")?.toString().trim();
  if (!albumId) throw new Error("Invalid album");

  const [album] = await db
    .select({ ownerId: photoAlbums.ownerId, eventId: photoAlbums.eventId })
    .from(photoAlbums)
    .where(eq(photoAlbums.id, albumId));

  if (!album) throw new Error("Album not found");
  if (!(await canModerate(userId, album.ownerId))) {
    throw new Error("Forbidden");
  }

  await db.delete(photoAlbums).where(eq(photoAlbums.id, albumId));

  revalidatePath("/photos/albums");
  revalidatePath("/photos");
  if (album.eventId) revalidatePath(`/events/${album.eventId}`);
  return { ok: true };
}

export async function getPhotoComments(photoId) {
  if (!photoId) return [];
  const rows = await db
    .select({
      id: photoComments.id,
      content: photoComments.content,
      createdAt: photoComments.createdAt,
      userId: photoComments.userId,
      authorName: users.fullName,
      authorImage: users.image,
    })
    .from(photoComments)
    .innerJoin(users, eq(photoComments.userId, users.id))
    .where(eq(photoComments.photoId, photoId))
    .orderBy(photoComments.createdAt);
  return rows;
}

export async function deletePhoto(formData) {
  const userId = await requireUserId();
  const photoId = formData.get("photoId")?.toString().trim();
  if (!photoId) throw new Error("Invalid photo");

  const [photo] = await db
    .select({ ownerId: photos.ownerId, eventId: photos.eventId })
    .from(photos)
    .where(eq(photos.id, photoId));
  if (!photo) throw new Error("Photo not found");
  if (!(await canModerate(userId, photo.ownerId))) {
    throw new Error("Forbidden");
  }

  await db.delete(photos).where(eq(photos.id, photoId));

  revalidatePath("/photos");
  revalidatePath("/photos/explore");
  revalidatePath("/photos/saved");
  if (photo.eventId) revalidatePath(`/events/${photo.eventId}`);
  return { ok: true };
}

/**
 * Like / unlike a photo. Idempotent and safe against race conditions
 * thanks to the (photo_id, user_id) unique index.
 */
export async function likePhoto(formData) {
  const userId = await requireUserId();
  const photoId = formData.get("photoId")?.toString().trim();
  if (!photoId) throw new Error("Invalid photo");

  const existing = await db
    .select({ id: photoLikes.id })
    .from(photoLikes)
    .where(and(eq(photoLikes.photoId, photoId), eq(photoLikes.userId, userId)))
    .limit(1);

  let liked;
  if (existing.length > 0) {
    await db
      .delete(photoLikes)
      .where(and(eq(photoLikes.photoId, photoId), eq(photoLikes.userId, userId)));
    await db
      .update(photos)
      .set({ likesCount: sql`GREATEST(${photos.likesCount} - 1, 0)` })
      .where(eq(photos.id, photoId));
    liked = false;
  } else {
    try {
      await db.insert(photoLikes).values({ photoId, userId });
      await db
        .update(photos)
        .set({ likesCount: sql`${photos.likesCount} + 1` })
        .where(eq(photos.id, photoId));
      liked = true;
    } catch {
      // duplicate insert, treat as already liked
      liked = true;
    }
  }

  revalidatePath("/photos");
  return { ok: true, liked };
}

export async function savePhoto(formData) {
  const userId = await requireUserId();
  const photoId = formData.get("photoId")?.toString().trim();
  if (!photoId) throw new Error("Invalid photo");

  const existing = await db
    .select({ id: photoSaves.id })
    .from(photoSaves)
    .where(and(eq(photoSaves.photoId, photoId), eq(photoSaves.userId, userId)))
    .limit(1);

  let saved;
  if (existing.length > 0) {
    await db
      .delete(photoSaves)
      .where(and(eq(photoSaves.photoId, photoId), eq(photoSaves.userId, userId)));
    saved = false;
  } else {
    try {
      await db.insert(photoSaves).values({ photoId, userId });
      saved = true;
    } catch {
      saved = true;
    }
  }

  revalidatePath("/photos/saved");
  revalidatePath("/photos");
  return { ok: true, saved };
}

export async function commentPhoto(formData) {
  const userId = await requireUserId();
  const photoId = formData.get("photoId")?.toString().trim();
  const content = String(formData.get("content") || "").trim();

  if (!photoId) throw new Error("Invalid photo");
  if (!content) throw new Error("Comment cannot be empty");

  const rate = checkRateLimit(userId, "commentOnPhoto");
  if (!rate.allowed) throw new Error(getRateLimitError(rate.resetTime));

  const inserted = await db
    .insert(photoComments)
    .values({
      photoId,
      userId,
      content: content.slice(0, 500),
    })
    .returning({ id: photoComments.id, createdAt: photoComments.createdAt });

  await db
    .update(photos)
    .set({ commentsCount: sql`${photos.commentsCount} + 1` })
    .where(eq(photos.id, photoId));

  revalidatePath("/photos");
  return {
    ok: true,
    comment: { id: inserted[0].id, createdAt: inserted[0].createdAt },
  };
}

// Legacy name used in earlier UI.
export async function commentOnPhoto(formData) {
  return commentPhoto(formData);
}

export async function deletePhotoComment(formData) {
  const userId = await requireUserId();
  const commentId = formData.get("commentId")?.toString().trim();
  if (!commentId) throw new Error("Invalid comment");

  const [comment] = await db
    .select({
      id: photoComments.id,
      photoId: photoComments.photoId,
      userId: photoComments.userId,
    })
    .from(photoComments)
    .where(eq(photoComments.id, commentId));

  if (!comment) throw new Error("Comment not found");
  if (!(await canModerate(userId, comment.userId))) {
    throw new Error("Forbidden");
  }

  await db.delete(photoComments).where(eq(photoComments.id, commentId));
  await db
    .update(photos)
    .set({ commentsCount: sql`GREATEST(${photos.commentsCount} - 1, 0)` })
    .where(eq(photos.id, comment.photoId));

  revalidatePath("/photos");
  return { ok: true };
}

export async function tagUser(formData) {
  const userId = await requireUserId();
  const photoId = formData.get("photoId")?.toString().trim();
  const taggedUserId = formData.get("taggedUserId")?.toString().trim();

  if (!photoId || !taggedUserId) throw new Error("Invalid data");
  if (taggedUserId === userId) throw new Error("Cannot tag yourself");

  const [photo] = await db
    .select({ ownerId: photos.ownerId })
    .from(photos)
    .where(eq(photos.id, photoId));
  if (!photo) throw new Error("Photo not found");

  // Only the photo owner can add tags.
  if (photo.ownerId !== userId) {
    const role = await getUserRole(userId);
    if (!isStaff(role)) throw new Error("Forbidden");
  }

  try {
    await db.insert(photoTags).values({
      photoId,
      userId: taggedUserId,
      taggedBy: userId,
      status: "pending",
    });
  } catch {
    throw new Error("User already tagged");
  }

  revalidatePath("/photos");
  return { ok: true };
}

// Legacy name used in earlier UI.
export async function tagUserInPhoto(formData) {
  return tagUser(formData);
}

/**
 * Tagged user approves / rejects / removes the tag on themselves.
 */
export async function respondToPhotoTag(formData) {
  const userId = await requireUserId();
  const tagId = formData.get("tagId")?.toString().trim();
  const action = formData.get("action")?.toString().trim(); // "approve" | "reject"
  if (!tagId || !["approve", "reject"].includes(action)) {
    throw new Error("Invalid data");
  }

  const [tag] = await db
    .select({ id: photoTags.id, userId: photoTags.userId })
    .from(photoTags)
    .where(eq(photoTags.id, tagId));
  if (!tag) throw new Error("Tag not found");
  if (tag.userId !== userId) {
    const role = await getUserRole(userId);
    if (!isStaff(role)) throw new Error("Forbidden");
  }

  if (action === "approve") {
    await db
      .update(photoTags)
      .set({ status: "approved" })
      .where(eq(photoTags.id, tagId));
  } else {
    await db.delete(photoTags).where(eq(photoTags.id, tagId));
  }

  revalidatePath(`/profile/${userId}`);
  revalidatePath("/photos");
  return { ok: true };
}

export async function reportPhoto(formData) {
  const userId = await requireUserId();
  const photoId = formData.get("photoId")?.toString().trim();
  const reason = formData.get("reason")?.toString().trim();
  const description = String(formData.get("description") || "").trim();

  if (!photoId || !reason) throw new Error("Invalid data");

  await db.insert(reports).values({
    reporterId: userId,
    photoId,
    reason,
    description: description.slice(0, 500),
  });

  revalidatePath("/photos");
  return { ok: true };
}

export async function incrementPhotoView(photoId) {
  if (!photoId) return;
  await db
    .update(photos)
    .set({ viewCount: sql`${photos.viewCount} + 1` })
    .where(eq(photos.id, photoId));
}

export async function moderatePhoto(formData) {
  const userId = await requireUserId();
  const photoId = formData.get("photoId")?.toString().trim();
  const status = formData.get("status")?.toString().trim();
  if (!photoId || !status) throw new Error("Invalid data");

  const role = await getUserRole(userId);
  if (!isStaff(role)) throw new Error("Forbidden");

  await db
    .update(photos)
    .set({
      moderationStatus: status,
      moderatedBy: userId,
      moderatedAt: new Date(),
    })
    .where(eq(photos.id, photoId));

  revalidatePath("/photos");
  return { ok: true };
}
