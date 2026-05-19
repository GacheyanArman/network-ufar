"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Avatar from "@/shared/ui/Avatar";
import UiIcon from "@/shared/ui/UiIcon";
import {
  getActiveStoriesForAuthor,
  viewStory,
  deleteStory,
} from "@/features/feed/server/story";

type Story = {
  id: string;
  imageUrl: string;
  caption: string | null;
  location: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string | null;
  viewsCount: number;
};

interface StoryViewerProps {
  ownerId: string;
  isOwner: boolean;
  onClose: () => void;
}

const STORY_DURATION_MS = 5000;

export default function StoryViewer({
  ownerId,
  isOwner,
  onClose,
}: StoryViewerProps) {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Fetch on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = (await getActiveStoriesForAuthor(ownerId)) as Story[];
      if (cancelled) return;
      setStories(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  // Mark current story viewed.
  useEffect(() => {
    if (!stories || stories.length === 0) return;
    const current = stories[index];
    if (!current || isOwner) return;
    const fd = new FormData();
    fd.append("storyId", current.id);
    viewStory(fd).catch(() => {});
  }, [stories, index, isOwner]);

  // Progress timer.
  useEffect(() => {
    if (!stories || stories.length === 0 || paused) return;

    startRef.current = performance.now() - progress * STORY_DURATION_MS;

    const tick = (t: number) => {
      const elapsed = t - startRef.current;
      const ratio = Math.min(elapsed / STORY_DURATION_MS, 1);
      setProgress(ratio);
      if (ratio >= 1) {
        if (index < stories.length - 1) {
          setProgress(0);
          setIndex(index + 1);
        } else {
          onClose();
          return;
        }
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, stories, paused]);

  const goPrev = useCallback(() => {
    if (!stories) return;
    setProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  }, [stories]);

  const goNext = useCallback(() => {
    if (!stories) return;
    if (index >= stories.length - 1) onClose();
    else {
      setProgress(0);
      setIndex(index + 1);
    }
  }, [stories, index, onClose]);

  // Keyboard controls.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

  const handleDelete = async () => {
    if (!stories) return;
    if (!confirm("Delete this moment?")) return;
    const fd = new FormData();
    fd.append("storyId", stories[index].id);
    await deleteStory(fd);
    onClose();
  };

  if (typeof window === "undefined") return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.96)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100vw)",
          height: "min(740px, 100vh)",
          background: "#000",
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!stories && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bg-card)",
            }}
          >
            Loading…
          </div>
        )}

        {stories && stories.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bg-card)",
            }}
          >
            No active stories
          </div>
        )}

        {stories && stories.length > 0 && (
          <>
            {/* Progress bars */}
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: "10px 12px 6px",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 5,
              }}
            >
              {stories.map((_, i) => {
                const ratio = i < index ? 1 : i === index ? progress : 0;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.3)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${ratio * 100}%`,
                        height: "100%",
                        background: "var(--bg-card)",
                        transition: i === index ? "width 60ms linear" : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Header */}
            <div
              style={{
                position: "absolute",
                top: 22,
                left: 0,
                right: 0,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--bg-card)",
                zIndex: 5,
              }}
            >
              <Avatar
                src={stories[index].ownerAvatar || undefined}
                alt={stories[index].ownerName}
                size={36}
                className=""
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {stories[index].ownerName}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  {timeAgo(stories[index].createdAt)}
                </div>
              </div>
              {isOwner && (
                <>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      opacity: 0.85,
                    }}
                  >
                    <UiIcon name="eye" size={14} />
                    {stories[index].viewsCount}
                  </span>
                  <button
                    onClick={handleDelete}
                    style={iconBtnStyle}
                    aria-label="Delete story"
                  >
                    <UiIcon name="trash" size={16} />
                  </button>
                </>
              )}
              <button onClick={onClose} style={iconBtnStyle} aria-label="Close">
                <UiIcon name="close" size={18} />
              </button>
            </div>

            {/* Image */}
            <div
              style={{
                flex: 1,
                position: "relative",
                width: "100%",
                background: "#000",
              }}
            >
              <Image
                src={stories[index].imageUrl}
                alt=""
                fill
                sizes="100vw"
                priority
                style={{ objectFit: "contain" }}
              />
            </div>

            {/* Caption / Location */}
            {(stories[index].caption || stories[index].location) && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "16px 16px 24px",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                  color: "var(--bg-card)",
                  fontSize: 14,
                }}
              >
                {stories[index].location && (
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    📍 {stories[index].location}
                  </div>
                )}
                {stories[index].caption && (
                  <div style={{ marginTop: 4 }}>{stories[index].caption}</div>
                )}
              </div>
            )}

            {/* Tap zones for prev/next */}
            <button
              aria-label="Previous"
              onClick={goPrev}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: "30%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            />
            <button
              aria-label="Next"
              onClick={goNext}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                right: 0,
                width: "30%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            />
          </>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

const iconBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.12)",
  color: "var(--bg-card)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

function timeAgo(value: Date | string) {
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return d.toLocaleDateString();
}
