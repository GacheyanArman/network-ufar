"use client";

import Link from "next/link";
import Image from "next/image";
import type { FeedBirthdayItem } from "@/features/feed/server/queries";

export default function FeedBirthdayCard({ item }: { item: FeedBirthdayItem }) {
  return (
    <div
      className="card"
      style={{
        padding: "14px 18px",
        background: "linear-gradient(135deg, var(--french-gold-soft) 0%, rgba(255,255,255,0.95) 60%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "2px solid var(--french-gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--french-gold-soft)",
            fontSize: "1.3rem",
          }}
        >
          {item.image ? (
            <Image src={item.image} alt={item.fullName} width={44} height={44} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            item.fullName?.[0] || "🎂"
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: "2px" }}>
            <span
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--french-gold)",
                background: "rgba(212,175,55,0.12)",
                padding: "2px 8px",
                borderRadius: "5px",
              }}
            >
              🎂 {item.feedReason}
            </span>
          </div>
          <Link href={`/profile/${item.userId}`} style={{ textDecoration: "none", color: "var(--text-primary)" }}>
            <span style={{ fontSize: "0.92rem", fontWeight: 700 }}>{item.fullName}</span>
          </Link>
        </div>

        <span style={{ fontSize: "1.6rem" }}>🎉</span>
      </div>
    </div>
  );
}
