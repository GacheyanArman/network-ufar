import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  events,
  eventRsvps,
  photoAlbums,
  photos,
  users,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { fetchPhotoFeed } from "@/lib/photo-feed";
import { getUserRole, isStaff } from "@/lib/roles";
import UiIcon from "@/components/UiIcon";
import PhotoFeedCard from "@/components/PhotoFeedCard";

export const dynamic = "force-dynamic";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.userId) redirect("/login");
  const userId = session.userId as string;

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
      imageUrl: events.imageUrl,
      organizerId: events.organizerId,
      organizerName: users.fullName,
      organizerImage: users.image,
    })
    .from(events)
    .innerJoin(users, eq(events.organizerId, users.id))
    .where(eq(events.id, id))
    .limit(1);

  if (!event) notFound();

  const [rsvpStats] = await db
    .select({
      going: sql<number>`COUNT(*) FILTER (WHERE ${eventRsvps.status} = 'going')::int`,
      interested: sql<number>`COUNT(*) FILTER (WHERE ${eventRsvps.status} = 'interested')::int`,
    })
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, id));

  // Albums explicitly attached to this event.
  const albums = await db
    .select({
      id: photoAlbums.id,
      title: photoAlbums.title,
      coverPhotoUrl: photoAlbums.coverPhotoUrl,
      photoCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${photos}
        WHERE ${photos.albumId} = ${photoAlbums.id}
      )`,
    })
    .from(photoAlbums)
    .where(
      and(
        eq(photoAlbums.eventId, id),
        eq(photoAlbums.isPrivate, false)
      )
    )
    .orderBy(desc(photoAlbums.createdAt));

  // Photos directly tagged to this event (independent of albums).
  const eventPhotos = await fetchPhotoFeed({
    viewerId: userId,
    eventId: id,
    scope: "public",
    limit: 24,
    withComments: false,
  });

  const role = await getUserRole(userId);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 12px 48px" }}>
      <Link
        href="/events"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 999,
          background: "#fff",
          border: "1px solid var(--border-color-light)",
          color: "var(--text-secondary)",
          textDecoration: "none",
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        <UiIcon name="news" size={12} /> Back to events
      </Link>

      <header
        style={{
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--border-color-light)",
          marginBottom: 20,
        }}
      >
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt=""
            style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
          />
        )}
        <div style={{ padding: 20 }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 999,
              background: "var(--french-blue-soft, #e8eef9)",
              color: "var(--french-blue, #2c5aa0)",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {event.eventType}
          </div>
          <h1
            style={{
              margin: "10px 0 6px",
              fontSize: "clamp(22px, 4vw, 28px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            {event.title}
          </h1>
          <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            {new Date(event.startTime).toLocaleString()}
            {event.location ? ` · ${event.location}` : ""}
          </div>
          {event.description && (
            <p style={{ marginTop: 12, lineHeight: 1.6, color: "var(--text-primary)" }}>
              {event.description}
            </p>
          )}
          <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 13, color: "var(--text-secondary)" }}>
            <span><strong>{rsvpStats?.going ?? 0}</strong> going</span>
            <span><strong>{rsvpStats?.interested ?? 0}</strong> interested</span>
          </div>
        </div>
      </header>

      {/* Albums for this event */}
      {albums.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 900 }}>
            Albums
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {albums.map((a) => (
              <Link
                key={a.id}
                href={`/photos/albums/${a.id}`}
                style={{
                  display: "block",
                  background: "#000",
                  borderRadius: 12,
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "#fff",
                  position: "relative",
                  height: 160,
                }}
              >
                {a.coverPhotoUrl && (
                  <img
                    src={a.coverPhotoUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    {a.photoCount} photos
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Direct event moments */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
            Campus Moments from this event
          </h2>
        </div>

        {eventPhotos.length === 0 ? (
          <div
            style={{
              background: "#fff",
              border: "1px dashed var(--border-color)",
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            No moments yet from this event. Be the first to share one!
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            {eventPhotos.map((p) => (
              <PhotoFeedCard
                key={p.id}
                photo={p}
                currentUserId={userId}
                canModerate={isStaff(role)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
