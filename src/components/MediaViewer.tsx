"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import UiIcon from "@/components/UiIcon";
import {
  likePhoto,
  savePhoto,
  commentPhoto,
  getPhotoComments,
  deletePhotoComment,
} from "@/app/actions/photo";

type MediaType = "image" | "video";

type MediaComment = {
  id: string;
  content: string;
  authorName?: string | null;
  authorImage?: string | null;
  createdAt?: Date | string | null;
  userId?: string | null;
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
  photoId?: string | null;
  currentUserId?: string | null;
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
  comments: initialComments = [],
  photoId,
  currentUserId,
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

  const finalPhotoId = activeItem?.id || photoId || null;

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

  // Interactive state
  const [liked, setLiked] = useState(
    activeItem?.isLiked ?? isLiked ?? false,
  );
  const [likesNum, setLikesNum] = useState(
    activeItem?.likesCount ?? likesCount ?? 0,
  );
  const [saved, setSaved] = useState(
    activeItem?.isSaved ?? isSaved ?? false,
  );
  const [viewsNum, setViewsNum] = useState(
    activeItem?.viewsCount ?? activeItem?.viewCount ?? viewsCount ?? 0,
  );
  const [commentsList, setCommentsList] = useState<MediaComment[]>(initialComments);
  const [commentsNum, setCommentsNum] = useState(
    activeItem?.commentsCount ?? commentsCount ?? initialComments.length ?? 0,
  );
  const [commentText, setCommentText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [shareToast, setShareToast] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Reset state when navigating to different photo
  useEffect(() => {
    setLiked(activeItem?.isLiked ?? isLiked ?? false);
    setLikesNum(activeItem?.likesCount ?? likesCount ?? 0);
    setSaved(activeItem?.isSaved ?? isSaved ?? false);
    setViewsNum(activeItem?.viewsCount ?? activeItem?.viewCount ?? viewsCount ?? 0);
    setCommentsNum(activeItem?.commentsCount ?? commentsCount ?? 0);
    setCommentsList(initialComments);
    setCommentText("");
  }, [currentIndex]);

  // Fetch comments when photoId changes
  useEffect(() => {
    if (!finalPhotoId) return;
    let cancelled = false;
    getPhotoComments(finalPhotoId).then((rows) => {
      if (cancelled) return;
      const mapped = rows.map((r) => ({
        id: r.id,
        content: r.content,
        authorName: r.authorName,
        authorImage: r.authorImage,
        createdAt: r.createdAt,
        userId: r.userId,
      }));
      setCommentsList(mapped);
      setCommentsNum(mapped.length);
    });
    return () => { cancelled = true; };
  }, [finalPhotoId]);

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

  const handleLike = useCallback(() => {
    if (!finalPhotoId) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesNum((n) => n + (wasLiked ? -1 : 1));
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("photoId", finalPhotoId);
        await likePhoto(fd);
      } catch {
        setLiked(wasLiked);
        setLikesNum((n) => n + (wasLiked ? 1 : -1));
      }
    });
  }, [finalPhotoId, liked]);

  const handleSave = useCallback(() => {
    if (!finalPhotoId) return;
    const wasSaved = saved;
    setSaved(!wasSaved);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("photoId", finalPhotoId);
        await savePhoto(fd);
      } catch {
        setSaved(wasSaved);
      }
    });
  }, [finalPhotoId, saved]);

  const handleSubmitComment = useCallback(() => {
    const text = commentText.trim();
    if (!text || !finalPhotoId) return;
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: MediaComment = {
      id: tempId,
      content: text,
      authorName: "You",
      authorImage: null,
      createdAt: new Date().toISOString(),
      userId: currentUserId || undefined,
    };
    setCommentsList((prev) => [...prev, optimisticComment]);
    setCommentsNum((prev) => prev + 1);
    setCommentText("");
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("photoId", finalPhotoId);
        fd.append("content", text);
        await commentPhoto(fd);
        const fresh = await getPhotoComments(finalPhotoId);
        setCommentsList(fresh.map((r) => ({
          id: r.id,
          content: r.content,
          authorName: r.authorName,
          authorImage: r.authorImage,
          createdAt: r.createdAt,
          userId: r.userId,
        })));
        setCommentsNum(fresh.length);
      } catch {
        setCommentsList((prev) => prev.filter((c) => c.id !== tempId));
        setCommentsNum((prev) => Math.max(0, prev - 1));
        setCommentText(text);
      }
    });
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [commentText, finalPhotoId, currentUserId]);

  const handleDeleteComment = useCallback((commentId: string) => {
    setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
    setCommentsNum((prev) => Math.max(0, prev - 1));
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("commentId", commentId);
        await deletePhotoComment(fd);
      } catch {}
    });
  }, []);

  if (!mounted) return null;

  const viewer = (
    <div
      className="uf-photo-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <div
        className="uf-photo-viewer"
        onClick={(event) => event.stopPropagation()}
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
              className={`uf-photo-viewer-action like ${liked ? "active" : ""}`}
              onClick={handleLike}
            >
              <span className="uf-photo-viewer-action-icon">
                <UiIcon name="heart" size={18} />
              </span>
              <span className="uf-photo-viewer-action-count">{likesNum}</span>
            </button>

            <button
              type="button"
              className="uf-photo-viewer-action comment"
              onClick={() => {
                const input = document.querySelector<HTMLInputElement>(".uf-photo-viewer-comment-input input");
                input?.focus();
              }}
            >
              <span className="uf-photo-viewer-action-icon">
                <UiIcon name="comment" size={18} />
              </span>
              <span className="uf-photo-viewer-action-count">{commentsNum}</span>
            </button>

            <button
              type="button"
              className={`uf-photo-viewer-action bookmark ${saved ? "active" : ""}`}
              onClick={handleSave}
            >
              <span className="uf-photo-viewer-action-icon">
                <UiIcon name="bookmark" size={18} />
              </span>
            </button>

            <button
              type="button"
              className="uf-photo-viewer-action share"
              onClick={async () => {
                const url = `${window.location.origin}/photos#${finalPhotoId || ""}`;
                try {
                  if (navigator.share) {
                    await navigator.share({ url, title: "Campus Moment" });
                  } else if (navigator.clipboard) {
                    await navigator.clipboard.writeText(url);
                    setShareToast(true);
                    setTimeout(() => setShareToast(false), 2000);
                  }
                } catch {
                  /* user cancelled */
                }
              }}
            >
              <span className="uf-photo-viewer-action-icon">
                <UiIcon name="share" size={18} />
              </span>
            </button>

            <button
              type="button"
              className="uf-photo-viewer-action download"
              onClick={async () => {
                try {
                  const res = await fetch(activeSrc, { mode: "cors" });
                  const blob = await res.blob();
                  const ext = activeSrc.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || "jpg";
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `photo-${finalPhotoId || Date.now()}.${ext}`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                } catch {
                  window.open(activeSrc, "_blank");
                }
              }}
            >
              <span className="uf-photo-viewer-action-icon">
                <UiIcon name="download" size={18} />
              </span>
            </button>
          </div>

          <div style={{ padding: "0 0 4px", fontSize: 14, fontWeight: 800 }}>
            {likesNum} {likesNum === 1 ? "like" : "likes"}
          </div>

          {(finalCommunity || viewsNum > 0) && (
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
                <strong>{viewsNum}</strong>
              </div>
            </section>
          )}

          <section className="uf-photo-viewer-comments">
            <div className="uf-photo-viewer-comments-title">
              <strong>Comments</strong>
              <span>{commentsNum}</span>
            </div>

            <div className="uf-photo-viewer-comments-list">
              {commentsList.length > 0 ? (
                commentsList.map((comment) => (
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

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p>
                        <strong>{comment.authorName || "Student"}</strong>{" "}
                        {comment.content}
                      </p>
                      <small>{formatDate(comment.createdAt)}</small>
                    </div>

                    {currentUserId && comment.userId === currentUserId && (
                      <button
                        type="button"
                        className="uf-photo-viewer-comment-delete"
                        onClick={() => handleDeleteComment(comment.id)}
                        title="Delete comment"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="uf-photo-viewer-empty-comments">
                  No comments yet.
                </div>
              )}
              <div ref={commentsEndRef} />
            </div>

            {finalPhotoId && currentUserId && (
              <div className="uf-photo-viewer-comment-input">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  placeholder="Write a comment..."
                  disabled={isPending}
                  maxLength={500}
                />
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={isPending || !commentText.trim()}
                >
                  {isPending ? "..." : "→"}
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>

      {shareToast && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--french-navy, #0b3aa8)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          Link copied!
        </div>
      )}
    </div>
  );

  return createPortal(viewer, document.body);
}
