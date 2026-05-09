import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { events, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { checkInWithToken } from "@/app/actions/events";
import UiIcon from "@/components/UiIcon";

export const dynamic = "force-dynamic";

interface CheckInPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

/**
 * Self-service QR check-in page. The QR code printed by the organizer points
 * to /events/[id]/checkin?token=XXX. The user opens it with their phone, we
 * verify the token and mark them as checked-in. They are auto-RSVP'd "going"
 * if they hadn't already.
 */
export default async function EventCheckInPage({
  params,
  searchParams,
}: CheckInPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const token = (sp.token || "").trim();

  const session = await getSession();
  if (!session?.userId) {
    redirect(
      `/login?next=${encodeURIComponent(`/events/${id}/checkin?token=${token}`)}`,
    );
  }

  // Pull event for display.
  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      startTime: events.startTime,
      location: events.location,
      organizerId: events.organizerId,
      organizerName: users.fullName,
    })
    .from(events)
    .innerJoin(users, eq(events.organizerId, users.id))
    .where(eq(events.id, id))
    .limit(1);
  if (!event) notFound();

  let result: { success?: boolean; error?: string } = {};
  if (token) {
    result = (await checkInWithToken(id, token)) as typeof result;
  } else {
    result = { error: "Missing check-in code" };
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border-color)",
          borderRadius: 16,
          padding: 28,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 12px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: result.success
              ? "rgba(22,163,74,0.1)"
              : "rgba(220,38,38,0.1)",
            color: result.success ? "#16a34a" : "#dc2626",
          }}
        >
          <UiIcon name={result.success ? "check-circle" : "x"} size={34} />
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900 }}>
          {result.success ? "You are checked in" : "Check-in failed"}
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>
          {result.success
            ? `Welcome to ${event.title}. Have a great time!`
            : result.error || "Please scan the organizer QR code again."}
        </p>

        <div
          style={{
            margin: "20px 0",
            padding: 12,
            border: "1px solid var(--border-color-light)",
            borderRadius: 12,
            textAlign: "left",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14 }}>{event.title}</div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            {event.startTime ? new Date(event.startTime).toLocaleString() : ""}
            {event.location ? ` · ${event.location}` : ""}
          </div>
        </div>

        <Link
          href={`/events/${id}`}
          style={{
            display: "inline-block",
            padding: "10px 18px",
            borderRadius: 10,
            background: "var(--french-blue, #2563eb)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Open event page <UiIcon name="arrow-right" size={14} />
          </span>
        </Link>
      </div>
    </div>
  );
}
