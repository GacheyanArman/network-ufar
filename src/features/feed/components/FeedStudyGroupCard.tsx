"use client";

import Link from "next/link";
import { useTransition } from "react";
import { joinStudyGroup, leaveStudyGroup } from "@/features/study-groups/server/actions";
import type { FeedStudyGroupItem } from "@/features/feed/server/queries";

export default function FeedStudyGroupCard({ item }: { item: FeedStudyGroupItem }) {
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    const fd = new FormData();
    fd.set("groupId", item.id);
    startTransition(async () => {
      await joinStudyGroup(fd);
    });
  }

  function handleLeave() {
    const fd = new FormData();
    fd.set("groupId", item.id);
    startTransition(async () => {
      await leaveStudyGroup(fd);
    });
  }

  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, var(--french-gold-soft), var(--french-blue-soft))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            flexShrink: 0,
          }}
        >
          📚
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <span
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--french-gold)",
                background: "var(--french-gold-soft)",
                padding: "2px 8px",
                borderRadius: "5px",
              }}
            >
              {item.feedReason}
            </span>
          </div>
          <Link href={`/study-groups`} style={{ textDecoration: "none", color: "var(--text-primary)" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>{item.title}</h4>
          </Link>
          {item.subject && (
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {item.subject}
            </p>
          )}
          <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "0.80rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
            {item.meetingDay && <span>📅 {item.meetingDay} {item.meetingTime || ""}</span>}
            {item.location && <span>📍 {item.location}</span>}
            <span>👥 {item.membersCount}/{item.maxMembers || "∞"}</span>
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {item.isMember ? (
            <button
              onClick={handleLeave}
              disabled={isPending}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                background: "var(--bg-soft)",
                color: "var(--text-secondary)",
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "5px 12px",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              Leave
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={isPending}
              style={{
                border: "1px solid var(--french-blue-line)",
                borderRadius: "8px",
                background: "var(--french-blue-soft)",
                color: "var(--french-blue)",
                fontSize: "0.78rem",
                fontWeight: 700,
                padding: "5px 12px",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "..." : "Join"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
