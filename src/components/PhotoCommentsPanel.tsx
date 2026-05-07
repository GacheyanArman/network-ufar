"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import UiIcon from "./UiIcon";
import { commentPhoto, deletePhotoComment } from "@/app/actions/photo";

export type PhotoCommentItem = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
};

interface PhotoCommentsPanelProps {
  photoId: string;
  comments: PhotoCommentItem[];
  currentUserId: string;
  canModerate: boolean;
  initiallyExpanded?: boolean;
  onCountChange?: (delta: number) => void;
}

export default function PhotoCommentsPanel({
  photoId,
  comments: initial,
  currentUserId,
  canModerate,
  initiallyExpanded = false,
  onCountChange,
}: PhotoCommentsPanelProps) {
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [pending, startTransition] = useTransition();

  const visible = expanded ? items : items.slice(0, 2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;

    // Optimistic insert.
    const tempId = `tmp_${Date.now()}`;
    const optimistic: PhotoCommentItem = {
      id: tempId,
      content: value,
      createdAt: new Date(),
      userId: currentUserId,
      userName: "You",
    };
    setItems((prev) => [...prev, optimistic]);
    setText("");
    onCountChange?.(1);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("photoId", photoId);
        fd.append("content", value);
        const res = await commentPhoto(fd);
        const realId = (res as { comment?: { id: string } })?.comment?.id;
        if (realId) {
          setItems((prev) =>
            prev.map((c) => (c.id === tempId ? { ...c, id: realId } : c))
          );
        }
      } catch (err) {
        setItems((prev) => prev.filter((c) => c.id !== tempId));
        onCountChange?.(-1);
        alert((err as Error).message || "Failed to comment");
      }
    });
  };

  const handleDelete = (id: string, ownerId: string) => {
    if (!confirm("Delete this comment?")) return;
    const before = items;
    setItems((prev) => prev.filter((c) => c.id !== id));
    onCountChange?.(-1);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("commentId", id);
        await deletePhotoComment(fd);
      } catch (err) {
        setItems(before);
        onCountChange?.(1);
        alert((err as Error).message || "Failed to delete");
      }
    });
  };

  return (
    <div>
      {items.length > 2 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "4px 0",
            fontSize: 13,
          }}
        >
          View all {items.length} comments
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((c) => {
          const canDelete = c.userId === currentUserId || canModerate;
          return (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <Avatar src={c.userAvatar || undefined} alt={c.userName} size={26} className="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/profile/${c.userId}`}
                  style={{
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    textDecoration: "none",
                    marginRight: 6,
                  }}
                >
                  {c.userName}
                </Link>
                <span style={{ color: "var(--text-primary)" }}>{c.content}</span>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {timeAgo(c.createdAt)}
                </div>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id, c.userId)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                  aria-label="Delete comment"
                >
                  <UiIcon name="x" size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid var(--border-color-light)",
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          maxLength={500}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || pending}
          style={{
            background: "none",
            border: "none",
            color: text.trim()
              ? "var(--french-blue, #2c5aa0)"
              : "var(--text-muted)",
            fontWeight: 800,
            cursor: text.trim() ? "pointer" : "default",
            fontSize: 14,
          }}
        >
          Post
        </button>
      </form>
    </div>
  );
}

function timeAgo(value: Date | string) {
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}
