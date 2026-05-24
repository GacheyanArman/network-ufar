import Link from "next/link";
import Image from "next/image";
import { redirect, notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/shared/db/db";
import { photoAlbums, photos } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { fetchPhotoFeed } from "@/features/photos/server/queries";
import { getUserRole, isStaff } from "@/shared/auth/roles";
import {
  getEventDetail,
  getEventAttendees,
  getEventComments,
} from "@/features/events/server/actions";
import UiIcon from "@/shared/ui/UiIcon";
import PhotoFeedCard from "@/features/photos/components/PhotoFeedCard";
import EventDetailClient from "@/features/events/components/EventDetailClient";

export const dynamic = "force-dynamic";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.userId) redirect("/login");
  const userId = session.userId as string;

  const detail = await getEventDetail(id);
  if (!detail) notFound();

  const [attendees, comments] = await Promise.all([
    getEventAttendees(id),
    getEventComments(id),
  ]);

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
      and(eq(photoAlbums.eventId, id), eq(photoAlbums.isPrivate, false))
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

  // Serialise dates to strings for the client component.
  const serialisedComments = comments.map((c: any) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));
  const serialisedAttendees = {
    going: attendees.going.map((a: any) => ({ ...a })),
    interested: attendees.interested.map((a: any) => ({ ...a })),
    waitlisted: attendees.waitlisted.map((a: any) => ({ ...a })),
  };

  // Server component: rendered once per request, so calling Date.now() at the
  // top of the function is fine. The lint rule is meant for client renders.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const isPast = detail.event.startTime
    ? new Date(detail.event.startTime).getTime() < nowMs
    : false;

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
          background: "var(--bg-card)",
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

      <EventDetailClient
        event={detail.event}
        coOrganizers={detail.coOrganizers}
        rsvpCounts={detail.rsvpCounts}
        myRsvpStatus={detail.myRsvpStatus}
        myWaitlistPosition={detail.myWaitlistPosition}
        canManage={detail.canManage}
        isCheckedIn={detail.isCheckedIn}
        checkInCount={detail.checkInCount}
        isFull={detail.isFull}
        isPast={isPast}
        attendees={serialisedAttendees}
        comments={serialisedComments}
        currentUserId={userId}
      />

      {/* Albums for this event */}
      {albums.length > 0 && (
        <section style={{ margin: "28px 0" }}>
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
            {albums.map((a: any) => (
              <Link
                key={a.id}
                href={`/photos/albums/${a.id}`}
                style={{
                  display: "block",
                  background: "#000",
                  borderRadius: 12,
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "var(--bg-card)",
                  position: "relative",
                  height: 160,
                }}
              >
                {a.coverPhotoUrl && (
                  <Image
                    src={a.coverPhotoUrl}
                    alt=""
                    fill
                    sizes="(max-width: 700px) 100vw, 400px"
                    style={{
                      objectFit: "cover",
                      opacity: 0.85,
                    }}
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
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
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

      {/* Direct event moments — also functions as the "Event photos after
          the event" archive for past events. */}
      <section style={{ marginTop: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
            {isPast
              ? "Photos from this event"
              : "Campus moments from this event"}
          </h2>
        </div>

        {eventPhotos.length === 0 ? (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px dashed var(--border-color)",
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            {isPast
              ? "No photos shared yet from this event. If you attended, upload your favourites!"
              : "No moments yet from this event. Be the first to share one!"}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            {eventPhotos.map((p: any) => (
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
