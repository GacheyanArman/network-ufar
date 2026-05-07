"use client";

import { useState } from "react";
import Link from "next/link";
import UiIcon from "./UiIcon";
import MediaViewer from "./MediaViewer";

type TrendingPhoto = {
  id: string;
  imageUrl: string;
  caption: string | null;
  ownerId: string;
  ownerName: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date | string;
  eventId: string | null;
  eventTitle: string | null;
};

type EventPhoto = {
  id: string;
  imageUrl: string;
  eventId: string | null;
  eventTitle: string | null;
  eventStart: Date | string | null;
  ownerName: string;
};

interface ExploreClientProps {
  currentUserId: string;
  trendingPhotos: TrendingPhoto[];
  trendingTags: Array<{ tag: string; usageCount: number }>;
  eventPhotos: EventPhoto[];
}

export default function ExploreClient({
  trendingPhotos,
  trendingTags,
  eventPhotos,
}: ExploreClientProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {/* Trending hashtags */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionTitle}>Trending hashtags</h2>
        {trendingTags.length === 0 ? (
          <EmptyHint>No hashtags yet — be the first to start a trend.</EmptyHint>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {trendingTags.map((t) => (
              <Link
                key={t.tag}
                href={`/photos/tags/${encodeURIComponent(t.tag)}`}
                style={tagPill}
              >
                #{t.tag}
                <span style={tagCount}>{t.usageCount}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trending photos grid */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionTitle}>Most loved this week</h2>
        {trendingPhotos.length === 0 ? (
          <EmptyHint>No public moments yet.</EmptyHint>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 6,
            }}
          >
            {trendingPhotos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setOpenIndex(i)}
                style={tileButton}
              >
                <img src={p.imageUrl} alt="" loading="lazy" style={tileImg} />
                <div style={tileOverlay}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    <UiIcon name="heart" size={14} /> {p.likesCount}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    <UiIcon name="comment" size={14} /> {p.commentsCount}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Event highlights */}
      <section>
        <h2 style={sectionTitle}>From recent events</h2>
        {eventPhotos.length === 0 ? (
          <EmptyHint>No event photos yet. Tag a moment to an event!</EmptyHint>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {eventPhotos.map((p) => (
              <Link
                key={p.id}
                href={p.eventId ? `/events/${p.eventId}` : "/events"}
                style={{
                  ...tileButton,
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#000",
                  textDecoration: "none",
                  position: "relative",
                  height: 200,
                }}
              >
                <img src={p.imageUrl} alt="" loading="lazy" style={tileImg} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05))",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: 12,
                    color: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 14 }}>
                    {p.eventTitle || "Event"}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    by {p.ownerName}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {openIndex !== null && trendingPhotos[openIndex] && (
        <MediaViewer
          src={trendingPhotos[openIndex].imageUrl}
          type="image"
          alt={trendingPhotos[openIndex].caption || "Moment"}
          authorName={trendingPhotos[openIndex].ownerName}
          createdAt={trendingPhotos[openIndex].createdAt}
          caption={trendingPhotos[openIndex].caption}
          likesCount={trendingPhotos[openIndex].likesCount}
          commentsCount={trendingPhotos[openIndex].commentsCount}
          onClose={() => setOpenIndex(null)}
          items={trendingPhotos.map((p) => ({
            id: p.id,
            imageUrl: p.imageUrl,
            caption: p.caption,
            authorName: p.ownerName,
            createdAt: p.createdAt,
            likesCount: p.likesCount,
            commentsCount: p.commentsCount,
          }))}
          currentIndex={openIndex}
          onNavigate={(i) => setOpenIndex(i)}
        />
      )}
    </>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px dashed var(--border-color)",
        padding: 16,
        borderRadius: 12,
        color: "var(--text-secondary)",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 16,
  fontWeight: 900,
  color: "var(--text-primary)",
  letterSpacing: "-0.01em",
};

const tagPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  background: "var(--french-blue-soft, #e8eef9)",
  color: "var(--french-blue, #2c5aa0)",
  fontWeight: 800,
  fontSize: 13,
  textDecoration: "none",
};

const tagCount: React.CSSProperties = {
  color: "var(--text-muted)",
  fontWeight: 600,
  fontSize: 11,
  background: "#fff",
  padding: "1px 6px",
  borderRadius: 999,
};

const tileButton: React.CSSProperties = {
  position: "relative",
  background: "#000",
  border: "none",
  padding: 0,
  cursor: "pointer",
  height: 180,
  borderRadius: 8,
  overflow: "hidden",
  display: "block",
  width: "100%",
};

const tileImg: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 0.3s ease",
};

const tileOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  padding: 10,
  background:
    "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))",
};
