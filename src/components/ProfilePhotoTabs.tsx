"use client";

import { useState } from "react";
import UiIcon from "./UiIcon";
import MediaViewer from "./MediaViewer";

export type ProfilePhotoTile = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  ownerId: string;
  ownerName?: string | null;
  ownerImage?: string | null;
  createdAt?: Date | string | null;
};

type Tab = "photos" | "tagged" | "saved";

interface ProfilePhotoTabsProps {
  isOwner: boolean;
  photos: ProfilePhotoTile[];
  tagged: ProfilePhotoTile[];
  saved: ProfilePhotoTile[];
}

export default function ProfilePhotoTabs({
  isOwner,
  photos,
  tagged,
  saved,
}: ProfilePhotoTabsProps) {
  const [tab, setTab] = useState<Tab>("photos");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const list = tab === "photos" ? photos : tab === "tagged" ? tagged : saved;

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          borderBottom: "1px solid var(--border-color-light)",
        }}
      >
        <TabBtn
          icon="grid"
          label="Photos"
          count={photos.length}
          active={tab === "photos"}
          onClick={() => setTab("photos")}
        />
        <TabBtn
          icon="user"
          label="Tagged"
          count={tagged.length}
          active={tab === "tagged"}
          onClick={() => setTab("tagged")}
        />
        {isOwner && (
          <TabBtn
            icon="bookmark"
            label="Saved"
            count={saved.length}
            active={tab === "saved"}
            onClick={() => setTab("saved")}
          />
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState tab={tab} isOwner={isOwner} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 4,
          }}
        >
          {list.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setOpenIdx(i)}
              style={{
                aspectRatio: "1 / 1",
                background: "#000",
                border: "none",
                padding: 0,
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                borderRadius: 4,
              }}
            >
              <img
                src={p.imageUrl}
                alt={p.caption || "Moment"}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </button>
          ))}
        </div>
      )}

      {openIdx !== null && list[openIdx] && (
        <MediaViewer
          src={list[openIdx].imageUrl}
          type="image"
          alt={list[openIdx].caption || "Moment"}
          authorName={list[openIdx].ownerName ?? null}
          authorImage={list[openIdx].ownerImage ?? null}
          createdAt={list[openIdx].createdAt ?? null}
          caption={list[openIdx].caption ?? null}
          onClose={() => setOpenIdx(null)}
          items={list.map((p) => ({
            id: p.id,
            imageUrl: p.imageUrl,
            caption: p.caption ?? null,
            authorName: p.ownerName ?? null,
            authorImage: p.ownerImage ?? null,
            createdAt: p.createdAt ?? null,
          }))}
          currentIndex={openIdx}
          onNavigate={(i) => setOpenIdx(i)}
        />
      )}
    </div>
  );
}

function TabBtn({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: "transparent",
        border: "none",
        padding: "12px 8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        fontWeight: 800,
        fontSize: 13,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        borderTop: active ? "2px solid var(--text-primary)" : "2px solid transparent",
        marginBottom: -1,
      }}
    >
      <UiIcon name={icon} size={14} />
      {label}
      <span
        style={{
          color: "var(--text-muted)",
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ tab, isOwner }: { tab: Tab; isOwner: boolean }) {
  const messages: Record<Tab, string> = {
    photos: isOwner
      ? "You haven’t shared any moments yet."
      : "No public moments yet.",
    tagged: isOwner
      ? "When friends tag you in a moment, it’ll show here once you approve."
      : "No tagged moments yet.",
    saved: "Tap the bookmark on any moment to save it here.",
  };
  return (
    <div
      style={{
        padding: "32px 16px",
        background: "#fff",
        border: "1px dashed var(--border-color)",
        borderRadius: 12,
        textAlign: "center",
        color: "var(--text-secondary)",
        fontSize: 14,
      }}
    >
      {messages[tab]}
    </div>
  );
}
