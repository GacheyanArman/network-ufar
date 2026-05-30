"use client";

import { useRef, useState } from "react";
import Avatar from "@/shared/ui/Avatar";
import UiIcon from "@/shared/ui/UiIcon";
import StoryViewer from "./StoryViewer";
import { createStory } from "@/features/feed/server/story";

export type StoryAuthorSummary = {
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string | null;
  storyCount: number;
  latestAt: Date | string;
  allSeen: boolean;
};

interface StoriesBarProps {
  authors: StoryAuthorSummary[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  hasOwnStory?: boolean;
}

export default function StoriesBar({
  authors,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  hasOwnStory,
}: StoriesBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [openOwnerId, setOpenOwnerId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleAddStory = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    setUploading(true);
    try {
      await createStory(fd);
      // Reload by refreshing via location, since we have no client cache here.
      window.location.reload();
    } catch (err) {
      alert((err as Error).message || "Failed to upload story");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // De-dupe ourselves so we always show the "Your moment" tile first.
  const others = authors.filter((a) => a.ownerId !== currentUserId);

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          padding: "12px 4px",
          scrollbarWidth: "thin",
        }}
      >
        {/* Add own story tile */}
        <button
          type="button"
          onClick={hasOwnStory ? () => setOpenOwnerId(currentUserId) : handleAddStory}
          disabled={uploading}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            minWidth: "76px",
            padding: 0,
          }}
        >
          <div style={ringStyle(hasOwnStory ? "unseen" : "self")}>
            <div style={innerCircleStyle()}>
              <Avatar src={currentUserAvatar || undefined} alt={currentUserName} size={56} className="" />
            </div>
            <span
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--french-blue, #2c5aa0)",
                color: "var(--bg-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #fff",
              }}
            >
              <UiIcon name="plus" size={12} />
            </span>
          </div>
          <span style={labelStyle}>
            {uploading ? "Uploading…" : hasOwnStory ? "Your moment" : "Add"}
          </span>
        </button>

        {others.map((author) => {
          const variant = author.allSeen ? "seen" : "unseen";
          return (
            <button
              key={author.ownerId}
              type="button"
              onClick={() => setOpenOwnerId(author.ownerId)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                minWidth: "76px",
                padding: 0,
              }}
            >
              <div style={ringStyle(variant)}>
                <div style={innerCircleStyle()}>
                  <Avatar
                    src={author.ownerAvatar || undefined}
                    alt={author.ownerName}
                    size={56}
                    className=""
                  />
                </div>
              </div>
              <span style={labelStyle}>
                {author.ownerName.split(" ")[0].slice(0, 12)}
              </span>
            </button>
          );
        })}

        {others.length === 0 && !hasOwnStory && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: "var(--text-muted)",
              fontSize: 13,
              padding: "8px 12px",
            }}
          >
            No active moments. Be the first to share!
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {openOwnerId && (
        <StoryViewer
          ownerId={openOwnerId}
          isOwner={openOwnerId === currentUserId}
          onClose={() => {
            setOpenOwnerId(null);
            // refresh "seen" indicators
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-secondary)",
  maxWidth: 76,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function ringStyle(variant: "unseen" | "seen" | "self"): React.CSSProperties {
  const gradient =
    variant === "unseen"
      ? "linear-gradient(135deg, #2c5aa0, #f5b400)"
      : variant === "seen"
      ? "var(--border-color, #d6d6d6)"
      : "var(--border-color-light, #ececec)";
  return {
    position: "relative",
    width: 68,
    height: 68,
    borderRadius: "50%",
    padding: 3,
    background: gradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function innerCircleStyle(): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "var(--bg-card)",
    padding: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };
}
