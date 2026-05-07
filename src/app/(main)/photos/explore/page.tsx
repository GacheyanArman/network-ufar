import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  events,
  hashtags as hashtagsTable,
  photoHashtags,
  photoLikes,
  photos,
  users,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import UiIcon from "@/components/UiIcon";
import ExploreClient from "@/components/ExploreClient";

export const dynamic = "force-dynamic";

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

export default async function ExplorePage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");
  const userId = session.userId as string;

  const since = new Date(Date.now() - SEVEN_DAYS);

  // Trending photos: most-liked in the last 7 days, fall back to recent.
  const trending = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      caption: photos.caption,
      ownerId: photos.ownerId,
      ownerName: users.fullName,
      likesCount: photos.likesCount,
      commentsCount: photos.commentsCount,
      createdAt: photos.createdAt,
      eventId: photos.eventId,
      eventTitle: events.title,
      recentLikes: sql<number>`(
        SELECT COUNT(*)::int FROM ${photoLikes}
        WHERE ${photoLikes.photoId} = ${photos.id}
          AND ${photoLikes.createdAt} >= ${since}
      )`,
    })
    .from(photos)
    .innerJoin(users, eq(photos.ownerId, users.id))
    .leftJoin(events, eq(photos.eventId, events.id))
    .where(
      and(
        eq(photos.moderationStatus, "approved"),
        eq(photos.isPrivate, false)
      )
    )
    .orderBy(
      desc(sql`(
        SELECT COUNT(*)::int FROM ${photoLikes}
        WHERE ${photoLikes.photoId} = ${photos.id}
          AND ${photoLikes.createdAt} >= ${since}
      )`),
      desc(photos.createdAt)
    )
    .limit(30);

  // Trending hashtags.
  const trendingTags = await db
    .select({
      tag: hashtagsTable.tag,
      usageCount: hashtagsTable.usageCount,
    })
    .from(hashtagsTable)
    .orderBy(desc(hashtagsTable.usageCount))
    .limit(12);

  // Photos linked to upcoming/ongoing events.
  const eventPhotos = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      eventId: photos.eventId,
      eventTitle: events.title,
      eventStart: events.startTime,
      ownerName: users.fullName,
    })
    .from(photos)
    .innerJoin(events, eq(photos.eventId, events.id))
    .innerJoin(users, eq(photos.ownerId, users.id))
    .where(
      and(
        eq(photos.moderationStatus, "approved"),
        eq(photos.isPrivate, false),
        gte(events.startTime, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      )
    )
    .orderBy(desc(events.startTime), desc(photos.createdAt))
    .limit(18);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 12px 48px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(22px, 4vw, 28px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            Explore
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
            Trending Campus Moments, popular hashtags and event highlights.
          </p>
        </div>
        <Link
          href="/photos"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 999,
            background: "#fff",
            border: "1px solid var(--border-color-light)",
            color: "var(--text-primary)",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <UiIcon name="news" size={14} /> Back to feed
        </Link>
      </div>

      <ExploreClient
        currentUserId={userId}
        trendingPhotos={trending}
        trendingTags={trendingTags}
        eventPhotos={eventPhotos}
      />
    </div>
  );
}
