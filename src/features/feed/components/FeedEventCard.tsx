"use client";

import Link from "next/link";
import { useTransition } from "react";
import { rsvpToEvent } from "@/features/events/server/actions";
import type { FeedEventItem } from "@/features/feed/server/queries";

export default function FeedEventCard({ item }: { item: FeedEventItem }) {
  const [isPending, startTransition] = useTransition();

  const dateStr = new Date(item.startTime).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  const timeStr = new Date(item.startTime).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });

  function handleRsvp() {
    const fd = new FormData();
    fd.set("eventId", item.id);
    fd.set("status", "going");
    startTransition(async () => {
      await rsvpToEvent(fd);
    });
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 18px",
          borderBottom: "1px solid var(--border-color-light)",
          background: "linear-gradient(135deg, var(--french-blue-soft) 0%, transparent 100%)",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--french-blue), var(--french-navy))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--bg-card)",
            fontSize: "1.1rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {item.eventType === "academic" ? "🎓" : item.eventType === "sports" ? "⚽" : item.eventType === "social" ? "🎉" : item.eventType === "club" ? "🏛" : "📅"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--french-blue)",
                background: "rgba(44,90,160,0.08)",
                padding: "2px 8px",
                borderRadius: "6px",
              }}
            >
              {item.feedReason}
            </span>
          </div>
          <Link
            href={`/events/${item.id}`}
            style={{ textDecoration: "none", color: "var(--text-primary)" }}
          >
            <h4 style={{ margin: "4px 0 0", fontSize: "1rem", fontWeight: 700, lineHeight: 1.3 }}>
              {item.title}
            </h4>
          </Link>
        </div>
      </div>

      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
          <span>📅 {dateStr}</span>
          <span>🕐 {timeStr}</span>
          {item.location && <span>📍 {item.location}</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {item.rsvpCount} going{item.communityName ? ` · ${item.communityName}` : ""}
          </span>

          {item.rsvpGoing ? (
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--success)",
                background: "rgba(5,150,105,0.08)",
                padding: "6px 14px",
                borderRadius: "8px",
              }}
            >
              ✓ Going
            </span>
          ) : (
            <button
              onClick={handleRsvp}
              disabled={isPending}
              style={{
                border: "1px solid var(--french-blue-line)",
                borderRadius: "8px",
                background: isPending ? "var(--bg-hover)" : "var(--french-blue-soft)",
                color: "var(--french-blue)",
                fontSize: "0.82rem",
                fontWeight: 700,
                padding: "6px 16px",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "..." : "RSVP"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
