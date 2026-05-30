"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import Avatar from "@/shared/ui/Avatar";
import UiIcon from "@/shared/ui/UiIcon";
import MediaViewer from "@/features/photos/components/MediaViewer";
import PhotoCommentsPanel, { PhotoCommentItem } from "./PhotoCommentsPanel";
import { likePhoto, savePhoto, deletePhoto } from "@/features/photos/server/actions";
import { tokenizeCaption } from "@/features/feed/server/hashtags";

export type PhotoFeedItem = {
  id: string;
  imageUrl: string;
  mediumUrl?: string;
  width?: number;
  height?: number;
  caption: string | null;
  location: string | null;
  createdAt: Date | string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  hashtags?: string[];
  comments?: PhotoCommentItem[];
  eventId?: string | null;
  eventTitle?: string | null;
};

interface PhotoFeedCardProps {
  photo: PhotoFeedItem;
  currentUserId: string;
  canModerate?: boolean;
}

export default function PhotoFeedCard({
  photo,
  currentUserId,
  canModerate = false,
}: PhotoFeedCardProps) {
  const [liked, setLiked] = useState(photo.isLiked);
  const [likes, setLikes] = useState(photo.likesCount);
  const [saved, setSaved] = useState(photo.isSaved);
  const [comments, setComments] = useState(photo.commentsCount);
  const [, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const ownsPhoto = photo.ownerId === currentUserId;
  const canDelete = ownsPhoto || canModerate;

  const handleLike = () => {
    // Optimistic
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((n) => n + (wasLiked ? -1 : 1));
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("photoId", photo.id);
        await likePhoto(fd);
      } catch (err) {
        // rollback
        setLiked(wasLiked);
        setLikes((n) => n + (wasLiked ? 1 : -1));
        alert((err as Error).message || "Failed");
      }
    });
  };

  const handleSave = () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("photoId", photo.id);
        await savePhoto(fd);
      } catch (err) {
        setSaved(wasSaved);
        alert((err as Error).message || "Failed");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this moment?")) return;
    setRemoved(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("photoId", photo.id);
        await deletePhoto(fd);
      } catch (err) {
        setRemoved(false);
        alert((err as Error).message || "Failed");
      }
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/photos#${photo.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Campus Moment" });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied!");
      }
    } catch {
      /* user cancelled */
    }
  };

  if (removed) return null;

  const tokens = tokenizeCaption(photo.caption);

  return (
    <article
      id={photo.id}
      className="card"
      style={{
        overflow: "hidden",
        marginBottom: 24,
        background: "var(--bg-card)",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
        }}
      >
        <Link
          href={`/profile/${photo.ownerId}`}
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}
        >
          <Avatar src={photo.ownerAvatar || undefined} alt={photo.ownerName} size={36} className="" />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {photo.ownerName}
            </div>
            {photo.location && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span aria-hidden>📍</span>
                {photo.location}
              </div>
            )}
          </div>
        </Link>

        {canDelete && (
          <button
            onClick={handleDelete}
            aria-label="Delete moment"
            style={iconButton}
          >
            <UiIcon name="trash" size={16} />
          </button>
        )}
      </header>

      {/* Image */}
      <div style={{ position: "relative", background: "#000", height: "min(640px, 80vh)" }}>
        <Image
          src={photo.mediumUrl || photo.imageUrl}
          alt={photo.caption || "Campus moment"}
          fill
          loading="lazy"
          onClick={() => setViewerOpen(true)}
          style={{
            objectFit: "contain",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 12px 4px",
        }}
      >
        <button
          onClick={handleLike}
          aria-label="Like"
          style={{
            ...iconButton,
            color: liked ? "#e0245e" : "var(--text-primary)",
          }}
        >
          <UiIcon name="heart" size={22} />
        </button>
        <button aria-label="Comment" style={iconButton}>
          <UiIcon name="comment" size={22} />
        </button>
        <button onClick={handleShare} aria-label="Share" style={iconButton}>
          <UiIcon name="share" size={20} />
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSave}
          aria-label="Save"
          style={{
            ...iconButton,
            color: saved ? "var(--french-blue, #2c5aa0)" : "var(--text-primary)",
          }}
        >
          <UiIcon name="bookmark" size={22} />
        </button>
      </div>

      {/* Likes count */}
      <div style={{ padding: "0 14px", fontSize: 14, fontWeight: 800 }}>
        {likes.toLocaleString()} {likes === 1 ? "like" : "likes"}
      </div>

      {/* Caption */}
      {(photo.caption || photo.eventTitle) && (
        <div
          style={{
            padding: "6px 14px 0",
            fontSize: 14,
            lineHeight: 1.45,
            color: "var(--text-primary)",
          }}
        >
          {photo.eventTitle && photo.eventId && (
            <div style={{ marginBottom: 6, fontSize: 12 }}>
              <Link
                href={`/events/${photo.eventId}`}
                style={{
                  color: "var(--french-blue, #2c5aa0)",
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "var(--french-blue-soft, #e8eef9)",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                <UiIcon name="calendar" size={12} />
                {photo.eventTitle}
              </Link>
            </div>
          )}
          {photo.caption && (
            <>
              <Link
                href={`/profile/${photo.ownerId}`}
                style={{
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  textDecoration: "none",
                  marginRight: 6,
                }}
              >
                {photo.ownerName}
              </Link>
              {tokens.map((tok, i) =>
                tok.type === "tag" ? (
                  <Link
                    key={i}
                    href={`/photos/tags/${encodeURIComponent(tok.value)}`}
                    style={{
                      color: "var(--french-blue, #2c5aa0)",
                      textDecoration: "none",
                      fontWeight: 700,
                    }}
                  >
                    #{tok.value}
                  </Link>
                ) : (
                  <span key={i}>{tok.value}</span>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* Comments */}
      <div style={{ padding: "10px 14px 14px" }}>
        <PhotoCommentsPanel
          photoId={photo.id}
          comments={photo.comments || []}
          currentUserId={currentUserId}
          canModerate={canModerate || ownsPhoto}
          onCountChange={(d) => setComments((n) => Math.max(0, n + d))}
        />
        {comments > 0 && (!photo.comments || photo.comments.length === 0) && (
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            {comments} {comments === 1 ? "comment" : "comments"}
          </div>
        )}
      </div>

      {/* Date */}
      <div
        style={{
          padding: "0 14px 12px",
          fontSize: 11,
          textTransform: "uppercase",
          color: "var(--text-muted)",
          letterSpacing: 0.4,
        }}
      >
        {new Date(photo.createdAt).toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>

      {viewerOpen && (
        <MediaViewer
          src={photo.imageUrl}
          alt={photo.caption || "Campus moment"}
          caption={photo.caption}
          authorName={photo.ownerName}
          authorImage={photo.ownerAvatar}
          createdAt={photo.createdAt}
          likesCount={likes}
          commentsCount={comments}
          isLiked={liked}
          isSaved={saved}
          photoId={photo.id}
          currentUserId={currentUserId}
          onCloseAction={() => setViewerOpen(false)}
        />
      )}
    </article>
  );
}

const iconButton: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 6,
  borderRadius: 8,
  color: "var(--text-primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
