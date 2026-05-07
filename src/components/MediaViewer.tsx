"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type MediaType = "image" | "video";

type MediaComment = {
  id: string;
  content: string;
  authorName?: string | null;
  authorImage?: string | null;
  createdAt?: Date | string | null;
};

type MediaItem = {
  id?: string;
  imageUrl: string;
  caption?: string | null;
  mediaType?: MediaType | null;
  ownerName?: string | null;
  ownerImage?: string | null;
  authorName?: string | null;
  authorImage?: string | null;
  createdAt?: Date | string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  viewCount?: number | null;
  viewsCount?: number | null;
  isLiked?: boolean | null;
  isSaved?: boolean | null;
  communityName?: string | null;
};

type MediaViewerProps = {
  src: string;
  type?: MediaType;
  alt?: string;
  title?: string;
  caption?: string | null;
  authorName?: string | null;
  authorImage?: string | null;
  createdAt?: Date | string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  viewsCount?: number | null;
  isLiked?: boolean | null;
  isSaved?: boolean | null;
  communityName?: string | null;
  comments?: MediaComment[];
  onClose: () => void;
  items?: MediaItem[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
};

function formatDate(value?: Date | string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString();
}

function getInitial(name?: string | null) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "U";
}

function extractHashtags(text?: string | null) {
  if (!text) return [];
  return text.match(/#[\p{L}\p{N}_]+/gu)?.slice(0, 6) || [];
}

export default function MediaViewer({
  src,
  type = "image",
  alt = "Media",
  title,
  caption,
  authorName,
  authorImage,
  createdAt,
  likesCount,
  commentsCount,
  viewsCount,
  isLiked,
  isSaved,
  communityName,
  comments = [],
  onClose,
  items = [],
  currentIndex = 0,
  onNavigate,
}: MediaViewerProps) {
  const [mounted, setMounted] = useState(false);

  const activeItem = items[currentIndex];
  const activeSrc = activeItem?.imageUrl || src;
  const activeType = activeItem?.mediaType || type;

  const finalCaption = activeItem?.caption || caption || title || "";
  const finalAuthorName =
    activeItem?.authorName ||
    activeItem?.ownerName ||
    authorName ||
    "UFAR Student";

  const finalAuthorImage =
    activeItem?.authorImage ||
    activeItem?.ownerImage ||
    authorImage ||
    null;

  const finalCreatedAt = activeItem?.createdAt || createdAt;

  const finalLikes = activeItem?.likesCount ?? likesCount ?? 0;
  const finalCommentsCount =
    activeItem?.commentsCount ?? commentsCount ?? comments.length ?? 0;

  const finalViews =
    activeItem?.viewsCount ?? activeItem?.viewCount ?? viewsCount ?? 0;

  const finalIsLiked = activeItem?.isLiked ?? isLiked ?? false;
  const finalIsSaved = activeItem?.isSaved ?? isSaved ?? false;

  const finalCommunity = activeItem?.communityName || communityName;

  const hashtags = useMemo(() => extractHashtags(finalCaption), [finalCaption]);

  const canNavigate =
    items.length > 1 &&
    typeof currentIndex === "number" &&
    typeof onNavigate === "function";

  const goPrev = () => {
    if (!canNavigate) return;
    onNavigate(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
  };

  const goNext = () => {
    if (!canNavigate) return;
    onNavigate(currentIndex === items.length - 1 ? 0 : currentIndex + 1);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, items.length]);

  if (!mounted) return null;

  const viewer = (
    <div
      className="uf-photo-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onMouseDown={onClose}
    >
      <div
        className="uf-photo-viewer"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <section className="uf-photo-viewer-image-side">
          {items.length > 1 && (
            <div className="uf-photo-viewer-counter">
              {currentIndex + 1} / {items.length}
            </div>
          )}

          {canNavigate && (
            <button
              type="button"
              className="uf-photo-viewer-nav uf-photo-viewer-nav-left"
              onClick={goPrev}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <div className="uf-photo-viewer-image-frame">
            {activeType === "video" ? (
              <video
                src={activeSrc}
                controls
                autoPlay
                className="uf-photo-viewer-media"
              />
            ) : (
              <img
                src={activeSrc}
                alt={alt}
                className="uf-photo-viewer-media"
              />
            )}
          </div>

          {canNavigate && (
            <button
              type="button"
              className="uf-photo-viewer-nav uf-photo-viewer-nav-right"
              onClick={goNext}
              aria-label="Next photo"
            >
              ›
            </button>
          )}
        </section>

        <aside className="uf-photo-viewer-info">
          <button
            type="button"
            className="uf-photo-viewer-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>

          <header className="uf-photo-viewer-author">
            <div className="uf-photo-viewer-avatar">
              {finalAuthorImage ? (
                <img src={finalAuthorImage} alt={finalAuthorName} />
              ) : (
                <span>{getInitial(finalAuthorName)}</span>
              )}
            </div>

            <div>
              <strong>{finalAuthorName}</strong>
              <span>{formatDate(finalCreatedAt)}</span>
            </div>
          </header>

          <div className="uf-photo-viewer-caption">
            {finalCaption ? (
              <p>{finalCaption}</p>
            ) : (
              <p className="uf-photo-viewer-muted">
                No caption added.
              </p>
            )}

            {hashtags.length > 0 && (
              <div className="uf-photo-viewer-tags">
                {hashtags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="uf-photo-viewer-actions">
            <button
              type="button"
              className={finalIsLiked ? "active" : ""}
              disabled
              title="Likes are shown from real post data"
            >
              <span>♡</span>
              <strong>{finalLikes}</strong>
            </button>

            <button type="button" disabled>
              <span>💬</span>
              <strong>{finalCommentsCount}</strong>
            </button>

            <button
              type="button"
              className={finalIsSaved ? "active" : ""}
              disabled
            >
              <span>🔖</span>
              <strong>Save</strong>
            </button>

            <button type="button" disabled>
              <span>↗</span>
              <strong>Share</strong>
            </button>

            <a href={activeSrc} download>
              <span>↓</span>
              <strong>Download</strong>
            </a>
          </div>

          {(finalCommunity || finalViews > 0) && (
            <section className="uf-photo-viewer-student-box">
              <h3>Student context</h3>

              {finalCommunity && (
                <div>
                  <span>Community</span>
                  <strong>{finalCommunity}</strong>
                </div>
              )}

              <div>
                <span>Views</span>
                <strong>{finalViews}</strong>
              </div>
            </section>
          )}

          <section className="uf-photo-viewer-comments">
            <div className="uf-photo-viewer-comments-title">
              <strong>Comments</strong>
              <span>{finalCommentsCount}</span>
            </div>

            {comments.length > 0 ? (
              comments.slice(0, 6).map((comment) => (
                <div className="uf-photo-viewer-comment" key={comment.id}>
                  <div className="uf-photo-viewer-comment-avatar">
                    {comment.authorImage ? (
                      <img
                        src={comment.authorImage}
                        alt={comment.authorName || "User"}
                      />
                    ) : (
                      <span>{getInitial(comment.authorName)}</span>
                    )}
                  </div>

                  <div>
                    <p>
                      <strong>{comment.authorName || "Student"}</strong>{" "}
                      {comment.content}
                    </p>
                    <small>{formatDate(comment.createdAt)}</small>
                  </div>
                </div>
              ))
            ) : (
              <div className="uf-photo-viewer-empty-comments">
                No comments yet.
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );

  return createPortal(viewer, document.body);
}