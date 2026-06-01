"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import MediaViewer from "@/features/photos/components/MediaViewer";
import { translations } from "@/shared/i18n/i18n";

export type ProfilePhotoTile = {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string | null;
  ownerId: string;
  ownerName?: string | null;
  ownerImage?: string | null;
  createdAt?: Date | string | null;
};

type Tab = "photos" | "tagged" | "saved";

interface ProfilePhotoTabsProps {
  isOwner: boolean;
  currentUserId?: string | null;
  photos: ProfilePhotoTile[];
  tagged: ProfilePhotoTile[];
  saved: ProfilePhotoTile[];
}

export default function ProfilePhotoTabs({
  isOwner,
  currentUserId,
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
              <Image
                src={p.thumbnailUrl || p.imageUrl}
                alt={p.caption || "Moment"}
                fill
                loading="lazy"
                style={{ objectFit: "cover" }}
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
          photoId={list[openIdx].id}
          currentUserId={currentUserId}
          onCloseAction={() => setOpenIdx(null)}
          items={list.map((p) => ({
            id: p.id,
            imageUrl: p.imageUrl,
            caption: p.caption ?? null,
            authorName: p.ownerName ?? null,
            authorImage: p.ownerImage ?? null,
            createdAt: p.createdAt ?? null,
          }))}
          currentIndex={openIdx}
          onNavigateAction={(i) => setOpenIdx(i)}
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
  const lang = typeof window !== "undefined" ? (localStorage.getItem("language") || "en") : "en";
  const es = (translations[lang as keyof typeof translations] || translations.en).emptyStates;

  const title: Record<Tab, string> = {
    photos: isOwner ? es.photos.noPhotos : "No public moments yet.",
    tagged: isOwner ? es.photos.noTagged : es.photos.noTaggedOther,
    saved: es.photos.noSaved,
  };
  const hint: Record<Tab, string> = {
    photos: isOwner ? es.photos.noPhotosHint : "",
    tagged: isOwner ? "" : "",
    saved: es.photos.noSavedHint,
  };

  return (
    <div
      style={{
        padding: "32px 16px",
        background: "var(--bg-card)",
        border: "1px dashed var(--border-color)",
        borderRadius: 12,
        textAlign: "center",
        color: "var(--text-secondary)",
        fontSize: 14,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <p style={{ margin: 0 }}>{title[tab]}</p>
      {hint[tab] && <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>{hint[tab]}</p>}
      {isOwner && tab === "photos" && (
        <Link href="/photos" className="btn btn-primary" style={{ marginTop: 6, textDecoration: "none", fontSize: "0.85rem" }}>
          {es.photos.uploadPhoto}
        </Link>
      )}
      {isOwner && tab === "saved" && (
        <Link href="/photos/explore" className="btn btn-secondary" style={{ marginTop: 6, textDecoration: "none", fontSize: "0.85rem" }}>
          {es.photos.browseMoments}
        </Link>
      )}
    </div>
  );
}
