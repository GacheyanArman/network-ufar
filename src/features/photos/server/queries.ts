import {
  and,
  desc,
  eq,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/shared/db/db";
import {
  photos,
  photoComments,
  photoLikes,
  photoSaves,
  photoHashtags,
  hashtags,
  users,
  events,
} from "@/shared/db/schema";
import type { PhotoFeedItem } from "@/features/photos/components/PhotoFeedCard";

export type PhotoVisibilityScope = "public" | "saved" | "all-mine";

interface FetchFeedOptions {
  viewerId: string;
  ownerId?: string;
  hashtag?: string;
  eventId?: string;
  scope?: PhotoVisibilityScope; // default: public
  limit?: number;
  offset?: number;
  withComments?: boolean;
}

/**
 * Loads a list of photos enriched with author, like / save / event info,
 * hashtags, and the latest 2 comments — ready to feed straight into
 * <PhotoFeedCard /> as `PhotoFeedItem[]`.
 */
export async function fetchPhotoFeed(
  opts: FetchFeedOptions
): Promise<PhotoFeedItem[]> {
  const {
    viewerId,
    ownerId,
    hashtag,
    eventId,
    scope = "public",
    limit = 20,
    offset = 0,
    withComments = true,
  } = opts;

  // Build visibility filter.
  const visibility = (() => {
    if (scope === "all-mine") return eq(photos.ownerId, viewerId);
    if (scope === "saved")
      return sql`EXISTS (
        SELECT 1 FROM ${photoSaves}
        WHERE ${photoSaves.photoId} = ${photos.id}
          AND ${photoSaves.userId} = ${viewerId}
      )`;
    return or(
      eq(photos.isPrivate, false),
      and(eq(photos.isPrivate, true), eq(photos.ownerId, viewerId))
    );
  })();

  // Optional hashtag filter via subquery.
  const conditions = [
    eq(photos.moderationStatus, "approved"),
    visibility,
  ];

  if (ownerId) conditions.push(eq(photos.ownerId, ownerId));
  if (eventId) conditions.push(eq(photos.eventId, eventId));
  if (hashtag) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${photoHashtags} ph
        INNER JOIN ${hashtags} h ON h.id = ph.hashtag_id
        WHERE ph.photo_id = ${photos.id} AND h.tag = ${hashtag.toLowerCase()}
      )`
    );
  }

  const rows = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      thumbnailUrl: photos.thumbnailUrl,
      mediumUrl: photos.mediumUrl,
      width: photos.width,
      height: photos.height,
      caption: photos.caption,
      location: photos.location,
      createdAt: photos.createdAt,
      ownerId: photos.ownerId,
      ownerName: users.fullName,
      ownerAvatar: users.image,
      likesCount: photos.likesCount,
      commentsCount: photos.commentsCount,
      eventId: photos.eventId,
      eventTitle: events.title,
      isLiked: sql<boolean>`EXISTS (
        SELECT 1 FROM ${photoLikes}
        WHERE ${photoLikes.photoId} = ${photos.id}
          AND ${photoLikes.userId} = ${viewerId}
      )`,
      isSaved: sql<boolean>`EXISTS (
        SELECT 1 FROM ${photoSaves}
        WHERE ${photoSaves.photoId} = ${photos.id}
          AND ${photoSaves.userId} = ${viewerId}
      )`,
    })
    .from(photos)
    .innerJoin(users, eq(photos.ownerId, users.id))
    .leftJoin(events, eq(photos.eventId, events.id))
    .where(and(...conditions))
    .orderBy(desc(photos.createdAt))
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) return [];

  const photoIds = rows.map((r) => r.id);

  // Hashtags per photo.
  const tagRows = await db
    .select({
      photoId: photoHashtags.photoId,
      tag: hashtags.tag,
    })
    .from(photoHashtags)
    .innerJoin(hashtags, eq(photoHashtags.hashtagId, hashtags.id))
    .where(inArray(photoHashtags.photoId, photoIds));
  const tagsByPhoto = new Map<string, string[]>();
  for (const t of tagRows) {
    const arr = tagsByPhoto.get(t.photoId) || [];
    arr.push(t.tag);
    tagsByPhoto.set(t.photoId, arr);
  }

  // Latest 2 comments per photo (window function not portable; use rough subquery).
  let commentsByPhoto = new Map<string, PhotoFeedItem["comments"]>();
  if (withComments) {
    const commentRows = await db
      .select({
        id: photoComments.id,
        photoId: photoComments.photoId,
        content: photoComments.content,
        createdAt: photoComments.createdAt,
        userId: photoComments.userId,
        userName: users.fullName,
        userAvatar: users.image,
      })
      .from(photoComments)
      .innerJoin(users, eq(photoComments.userId, users.id))
      .where(inArray(photoComments.photoId, photoIds))
      .orderBy(desc(photoComments.createdAt));

    // Take last 2 (oldest of those 2 first when displayed).
    const buckets = new Map<string, typeof commentRows>();
    for (const c of commentRows) {
      const list = buckets.get(c.photoId) || [];
      if (list.length < 2) {
        list.push(c);
        buckets.set(c.photoId, list);
      }
    }
    for (const [pid, list] of buckets) {
      commentsByPhoto.set(
        pid,
        list
          .reverse()
          .map((c) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            userId: c.userId,
            userName: c.userName,
            userAvatar: c.userAvatar,
          }))
      );
    }
  }

  return rows.map((r) => ({
    id: r.id,
    imageUrl: r.imageUrl,
    caption: r.caption,
    location: r.location,
    createdAt: r.createdAt,
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    ownerAvatar: r.ownerAvatar,
    likesCount: r.likesCount,
    commentsCount: r.commentsCount,
    isLiked: !!r.isLiked,
    isSaved: !!r.isSaved,
    hashtags: tagsByPhoto.get(r.id) || [],
    comments: commentsByPhoto.get(r.id) || [],
    eventId: r.eventId,
    eventTitle: r.eventTitle,
  }));
}
