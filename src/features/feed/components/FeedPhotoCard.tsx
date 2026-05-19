"use client";

import Link from "next/link";
import Image from "next/image";
import type { FeedPhotoItem } from "@/features/feed/server/queries";

export default function FeedPhotoCard({ item }: { item: FeedPhotoItem }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <Link href={`/photos`} style={{ textDecoration: "none", display: "block" }}>
        <div style={{ position: "relative", width: "100%", height: "220px" }}>
          <Image
            src={item.thumbnailUrl || item.imageUrl}
            alt={item.caption || "Campus moment"}
            fill
            sizes="(max-width: 700px) 100vw, 600px"
            style={{
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              display: "flex",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--bg-card)",
                background: "rgba(30,58,95,0.75)",
                backdropFilter: "blur(8px)",
                padding: "3px 10px",
                borderRadius: "6px",
              }}
            >
              {item.feedReason}
            </span>
          </div>
        </div>
      </Link>

      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href={`/profile/${item.ownerId}`} style={{ textDecoration: "none" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--french-blue-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--french-blue)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {item.ownerImage ? (
                <Image src={item.ownerImage} alt="" width={32} height={32} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                item.ownerName?.[0] || "U"
              )}
            </div>
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link href={`/profile/${item.ownerId}`} style={{ textDecoration: "none", color: "var(--text-primary)" }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 600 }}>{item.ownerName}</span>
            </Link>
            {item.caption && (
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.caption}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            <span>❤ {item.likesCount}</span>
            <span>💬 {item.commentsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
