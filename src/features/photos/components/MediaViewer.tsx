"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import UiIcon from "@/shared/ui/UiIcon";
import {
  likePhoto,
  savePhoto,
  commentPhoto,
  getPhotoComments,
  deletePhotoComment,
  togglePhotoCommentLike,
  reportPhotoComment,
} from "@/features/photos/server/actions";
import {
  addComment as addPostComment,
  togglePostCommentLike,
  getPostCommentsForViewer,
  deleteComment as deletePostComment,
  toggleLike as togglePostLike,
  toggleSavePost,
} from "@/features/feed/server/interactions";
import { reportContent } from "@/features/admin/server/reports";
import { sendMessage } from "@/features/messages/server/actions";
import SharePostModal from "@/features/feed/components/SharePostModal";
import { useLanguage } from "@/contexts/LanguageContext";
import "./MediaViewer.css";
type MediaType = "image" | "video";

type MediaComment = {
  id: string;
  content: string;
  authorName?: string | null;
  authorImage?: string | null;
  createdAt?: Date | string | null;
  userId?: string | null;
  // Instagram-style threading metadata
  parentId?: string | null;
  likesCount?: number;
  isLikedByMe?: boolean;
  replies?: MediaComment[];
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
  // When set, MediaViewer dispatches comment / reply / like / report actions
  // to the post-comment server actions instead of the photo-comment ones.
  postId?: string | null;
  currentUserId?: string | null;
  currentUserImage?: string | null;
  onCloseAction?: () => void;
  onClose?: () => void;
  items?: MediaItem[];
  currentIndex?: number;
  onNavigateAction?: (index: number) => void;
  onNavigate?: (index: number) => void;
  // Optional handlers — if provided, override the built-in photo-specific
  // server actions. Useful when MediaViewer is opened for a post / story /
  // any non-photo entity. The handler is responsible for performing the
  // server mutation; MediaViewer manages its own optimistic UI state.
  onLikeAction?: () => void | Promise<void>;
  onSaveAction?: () => void | Promise<void>;
  onSubmitCommentAction?: (content: string) => void | Promise<void>;
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

// Recursively count all comments (top-level + replies).
function countCommentsDeep(list: MediaComment[]): number {
  return list.reduce((acc, c) => acc + 1 + countCommentsDeep(c.replies || []), 0);
}

// Map a server-returned comment row into our internal MediaComment shape.
function normalizeServerComment(r: any): MediaComment {
  return {
    id: r.id,
    content: r.content,
    authorName: r.authorName ?? r.userName ?? r.name ?? null,
    authorImage:
      r.authorImage ??
      r.userAvatar ??
      r.userImage ??
      r.authorAvatar ??
      r.image ??
      r.avatarUrl ??
      null,
    createdAt: r.createdAt,
    userId: r.userId ?? r.authorId ?? null,
    parentId: r.parentId ?? null,
    likesCount: Number(r.likesCount || 0),
    isLikedByMe: Boolean(r.isLikedByMe),
    replies: Array.isArray(r.replies)
      ? r.replies.map(normalizeServerComment)
      : [],
  };
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
  postId,
  currentUserId,
  currentUserImage,
  onCloseAction,
  onClose,
  items = [],
  currentIndex = 0,
  onNavigateAction,
  onNavigate,
  onLikeAction,
  onSaveAction,
  onSubmitCommentAction,
}: MediaViewerProps) {
  const { t } = useLanguage();

  // Track hydration without an effect: returns false on the server / initial
  // hydration tick, then flips to true once the client takes over.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const finalOnClose = useCallback(() => {
    if (onCloseAction) onCloseAction();
    else if (onClose) onClose();
  }, [onCloseAction, onClose]);

  const finalOnNavigate = onNavigateAction || onNavigate;

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
    activeItem?.authorImage || activeItem?.ownerImage || authorImage || null;

  const finalCreatedAt = activeItem?.createdAt || createdAt;

  const finalPhotoId = activeItem?.id || photoId || null;

  const finalCommunity = activeItem?.communityName || communityName;

  const hashtags = useMemo(() => extractHashtags(finalCaption), [finalCaption]);

  const canNavigate =
    items.length > 1 &&
    typeof currentIndex === "number" &&
    typeof finalOnNavigate === "function";

  const goPrev = useCallback(() => {
    if (!canNavigate || !finalOnNavigate) return;
    finalOnNavigate(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
  }, [canNavigate, finalOnNavigate, currentIndex, items.length]);

  const goNext = useCallback(() => {
    if (!canNavigate || !finalOnNavigate) return;
    finalOnNavigate(currentIndex === items.length - 1 ? 0 : currentIndex + 1);
  }, [canNavigate, finalOnNavigate, currentIndex, items.length]);

  // Interactive state
  const [liked, setLiked] = useState(activeItem?.isLiked ?? isLiked ?? false);
  const [likesNum, setLikesNum] = useState(
    activeItem?.likesCount ?? likesCount ?? 0,
  );
  const [saved, setSaved] = useState(activeItem?.isSaved ?? isSaved ?? false);
  const [viewsNum, setViewsNum] = useState(
    activeItem?.viewsCount ?? activeItem?.viewCount ?? viewsCount ?? 0,
  );
  const [commentsList, setCommentsList] =
    useState<MediaComment[]>(initialComments);
  const [commentsNum, setCommentsNum] = useState(
    activeItem?.commentsCount ?? commentsCount ?? initialComments.length ?? 0,
  );
  const [commentText, setCommentText] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    authorName: string;
    threadRootId: string;
  } | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set(),
  );
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    text: string;
    tone: "ok" | "err";
  } | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const showToast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 2200);
  }, []);



  // Reset state when navigating to a different photo.
  // Uses the "store previous prop" pattern instead of an effect.
  const [prevIndex, setPrevIndex] = useState(currentIndex);
  if (prevIndex !== currentIndex) {
    setPrevIndex(currentIndex);
    setLiked(activeItem?.isLiked ?? isLiked ?? false);
    setLikesNum(activeItem?.likesCount ?? likesCount ?? 0);
    setSaved(activeItem?.isSaved ?? isSaved ?? false);
    setViewsNum(
      activeItem?.viewsCount ?? activeItem?.viewCount ?? viewsCount ?? 0,
    );
    setCommentsNum(activeItem?.commentsCount ?? commentsCount ?? 0);
    setCommentsList(initialComments);
    setCommentText("");
    setShowCommentInput(false);
    setReplyingTo(null);
    setExpandedThreads(new Set());
  }

  // Fetch comments tree when photoId / postId changes.
  useEffect(() => {
    if (!finalPhotoId && !postId) return;
    let cancelled = false;

    const loader = postId
      ? getPostCommentsForViewer(postId)
      : finalPhotoId
        ? getPhotoComments(finalPhotoId)
        : null;
    if (!loader) return;

    loader
      .then((rows) => {
        if (cancelled) return;
        const tree = (rows as any[]).map(normalizeServerComment);
        setCommentsList(tree);
        setCommentsNum(countCommentsDeep(tree));
      })
      .catch(() => {
        // Keep whatever initialComments were passed in if fetching fails.
      });
    return () => {
      cancelled = true;
    };
  }, [finalPhotoId, postId]);

  // --------------------------------------------------------------------------
  // Scroll Lock Effect
  useEffect(() => {
    // Capture original state only once on mount
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      // Restore original state on unmount
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []); // Empty dependency array ensures this only runs once!

  // Keyboard Listener Effect
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (event.key === "Escape") finalOnClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [finalOnClose, goPrev, goNext]);

  const handleLike = useCallback(() => {
    if (!currentUserId) {
      showToast(t("photos.viewer.signInToLike"), "err");
      return;
    }
    // No way to perform a like — neither a custom handler nor a photoId or postId.
    if (!onLikeAction && !finalPhotoId && !postId) {
      showToast("Liking isn't available for this item yet", "err");
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesNum((n) => n + (wasLiked ? -1 : 1));
    startTransition(async () => {
      try {
        if (onLikeAction) {
          await onLikeAction();
        } else if (postId) {
          const fd = new FormData();
          fd.append("postId", postId);
          await togglePostLike(fd);
        } else if (finalPhotoId) {
          const fd = new FormData();
          fd.append("photoId", finalPhotoId);
          await likePhoto(fd);
        }
      } catch (err) {
        setLiked(wasLiked);
        setLikesNum((n) => n + (wasLiked ? 1 : -1));
        showToast((err as Error)?.message || t("photos.viewer.couldNotLike"), "err");
      }
    });
  }, [finalPhotoId, liked, showToast, currentUserId, onLikeAction]);

  const handleSave = useCallback(() => {
    if (!currentUserId) {
      showToast(t("photos.viewer.signInToSave"), "err");
      return;
    }
    if (!onSaveAction && !finalPhotoId && !postId) {
      showToast("Saving isn't available for this item yet", "err");
      return;
    }
    const wasSaved = saved;
    setSaved(!wasSaved);
    startTransition(async () => {
      try {
        if (onSaveAction) {
          await onSaveAction();
        } else if (postId) {
          const fd = new FormData();
          fd.append("postId", postId);
          await toggleSavePost(fd);
        } else if (finalPhotoId) {
          const fd = new FormData();
          fd.append("photoId", finalPhotoId);
          await savePhoto(fd);
        }
        showToast(wasSaved ? t("photos.viewer.removedSaved") : t("photos.viewer.saved"));
      } catch (err) {
        setSaved(wasSaved);
        showToast((err as Error)?.message || t("photos.viewer.couldNotSave"), "err");
      }
    });
  }, [finalPhotoId, saved, showToast, currentUserId, onSaveAction]);

  const refreshCommentTree = useCallback(async () => {
    try {
      const rows = postId
        ? await getPostCommentsForViewer(postId)
        : finalPhotoId
          ? await getPhotoComments(finalPhotoId)
          : null;
      if (!rows) return;
      const tree = (rows as any[]).map(normalizeServerComment);
      setCommentsList(tree);
      setCommentsNum(countCommentsDeep(tree));
    } catch {
      // If the refresh fails just leave the optimistic state in place.
    }
  }, [postId, finalPhotoId]);

  const handleSubmitComment = useCallback(() => {
    const text = commentText.trim();
    if (!text) return;
    if (!currentUserId) {
      showToast(t("photos.viewer.signInToComment"), "err");
      return;
    }
    if (!onSubmitCommentAction && !finalPhotoId && !postId) {
      showToast("Comments aren't available here yet", "err");
      return;
    }

    const replyTargetId = replyingTo?.id || null;
    // The server flattens replies-to-replies into the same thread, so we know
    // ahead of time which top-level comment the new reply belongs under.
    const threadRootId = replyingTo?.threadRootId || null;

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: MediaComment = {
      id: tempId,
      content: text,
      authorName: "You",
      authorImage: currentUserImage || null,
      createdAt: new Date().toISOString(),
      userId: currentUserId || undefined,
      parentId: threadRootId,
      likesCount: 0,
      isLikedByMe: false,
      replies: [],
    };

    // Insert optimistically into the right place in the tree.
    setCommentsList((prev) => {
      if (!threadRootId) return [...prev, optimisticComment];
      return prev.map((c) =>
        c.id === threadRootId
          ? { ...c, replies: [...(c.replies || []), optimisticComment] }
          : c,
      );
    });
    setCommentsNum((prev) => prev + 1);
    if (threadRootId) {
      setExpandedThreads((prev) => {
        const next = new Set(prev);
        next.add(threadRootId);
        return next;
      });
    }
    setCommentText("");
    setReplyingTo(null);

    startTransition(async () => {
      try {
        if (onSubmitCommentAction) {
          await onSubmitCommentAction(text);
        } else if (postId) {
          const fd = new FormData();
          fd.append("postId", postId);
          fd.append("content", text);
          if (replyTargetId) fd.append("parentId", replyTargetId);
          await addPostComment(fd);
        } else if (finalPhotoId) {
          const fd = new FormData();
          fd.append("photoId", finalPhotoId);
          fd.append("content", text);
          if (replyTargetId) fd.append("parentId", replyTargetId);
          await commentPhoto(fd);
        }
        await refreshCommentTree();
      } catch (err) {
        // Roll back the optimistic comment.
        setCommentsList((prev) => {
          if (!threadRootId) return prev.filter((c) => c.id !== tempId);
          return prev.map((c) =>
            c.id === threadRootId
              ? {
                  ...c,
                  replies: (c.replies || []).filter((r) => r.id !== tempId),
                }
              : c,
          );
        });
        setCommentsNum((prev) => Math.max(0, prev - 1));
        setCommentText(text);
        showToast((err as Error)?.message || t("photos.viewer.couldNotPost"), "err");
      }
    });
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [
    commentText,
    finalPhotoId,
    postId,
    currentUserId,
    currentUserImage,
    showToast,
    onSubmitCommentAction,
    replyingTo,
    refreshCommentTree,
  ]);

  // Find a comment in the tree (either top-level or in replies).
  const findComment = useCallback(
    (id: string): MediaComment | null => {
      for (const c of commentsList) {
        if (c.id === id) return c;
        const inside = (c.replies || []).find((r) => r.id === id);
        if (inside) return inside;
      }
      return null;
    },
    [commentsList],
  );

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      const target = findComment(commentId);
      if (!target) return;

      // Remove from tree (and any replies if it's a top-level comment).
      const removedCount = 1 + (target.replies?.length || 0);
      setCommentsList((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r) => r.id !== commentId),
          })),
      );
      setCommentsNum((prev) => Math.max(0, prev - removedCount));

      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.append("commentId", commentId);
          if (postId) {
            await deletePostComment(fd);
          } else {
            await deletePhotoComment(fd);
          }
          await refreshCommentTree();
        } catch (err) {
          showToast((err as Error)?.message || t("photos.viewer.couldNotDelete"), "err");
          await refreshCommentTree();
        }
      });
    },
    [findComment, postId, refreshCommentTree, showToast],
  );

  const handleToggleCommentLike = useCallback(
    (commentId: string) => {
      if (!currentUserId) {
        showToast(t("photos.viewer.signInToLike"), "err");
        return;
      }

      // Optimistically flip the like state in the tree.
      const flipLike = (c: MediaComment): MediaComment => {
        if (c.id === commentId) {
          const wasLiked = Boolean(c.isLikedByMe);
          return {
            ...c,
            isLikedByMe: !wasLiked,
            likesCount: Math.max(0, (c.likesCount || 0) + (wasLiked ? -1 : 1)),
          };
        }
        if (c.replies?.length) {
          return { ...c, replies: c.replies.map(flipLike) };
        }
        return c;
      };
      setCommentsList((prev) => prev.map(flipLike));

      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.append("commentId", commentId);
          if (postId) {
            await togglePostCommentLike(fd);
          } else {
            await togglePhotoCommentLike(fd);
          }
        } catch (err) {
          // Revert on failure.
          setCommentsList((prev) => prev.map(flipLike));
          showToast((err as Error)?.message || t("photos.viewer.couldNotLike"), "err");
        }
      });
    },
    [currentUserId, postId, showToast],
  );

  const handleStartReply = useCallback(
    (comment: MediaComment) => {
      if (!currentUserId) {
        showToast(t("photos.viewer.signInToComment"), "err");
        return;
      }
      // Determine the top-level thread root: if the comment is itself a
      // reply, use its parent (replies are at most one level deep).
      const threadRootId = comment.parentId || comment.id;
      setReplyingTo({
        id: comment.id,
        authorName: comment.authorName || "Student",
        threadRootId,
      });
      setShowCommentInput(true);
      setExpandedThreads((prev) => {
        const next = new Set(prev);
        next.add(threadRootId);
        return next;
      });
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 50);
    },
    [currentUserId, showToast],
  );

  const handleReportComment = useCallback(
    (commentId: string) => {
      if (!currentUserId) {
        showToast(t("photos.viewer.signInToReport"), "err");
        return;
      }
      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.append("commentId", commentId);
          fd.append("reason", "inappropriate_content");
          if (postId) {
            const result = await reportContent(fd);
            if (result?.error) throw new Error(result.error);
          } else {
            await reportPhotoComment(fd);
          }
          showToast(t("photos.viewer.reported"));
        } catch (err) {
          showToast((err as Error)?.message || t("photos.viewer.couldNotReport"), "err");
        }
      });
    },
    [currentUserId, postId, showToast],
  );

  const toggleThread = useCallback((commentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  if (!mounted) return null;
  if (!activeSrc && !items.length) return null;

  const viewer = (
    <div
      className="uf-media-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={(e) => {
        if (e.target === e.currentTarget) finalOnClose();
      }}
    >
      <button
        type="button"
        className="uf-media-viewer-close"
        onClick={finalOnClose}
        aria-label="Close"
      >
        ×
      </button>
      <div
        className="uf-media-viewer-shell"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="uf-media-viewer-body">
          <section className="uf-media-viewer-stage">
          {items.length > 1 && (
            <div className="uf-media-viewer-counter">
              {currentIndex + 1} / {items.length}
            </div>
          )}

          {canNavigate && (
            <button
              type="button"
              className="uf-media-viewer-nav uf-media-viewer-nav-left"
              onClick={goPrev}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <div className="uf-media-viewer-stage-inner">
            {activeType === "video" ? (
              <video
                key={activeSrc}
                src={activeSrc}
                controls
                autoPlay
                className="uf-media-viewer-media"
              />
            ) : (
              <Image
                src={activeSrc}
                alt={alt}
                fill
                sizes="(max-width: 900px) 100vw, 70vw"
                className="uf-media-viewer-media"
                priority
              />
            )}
          </div>

          {canNavigate && (
            <button
              type="button"
              className="uf-media-viewer-nav uf-media-viewer-nav-right"
              onClick={goNext}
              aria-label="Next photo"
            >
              ›
            </button>
          )}
        </section>

        <aside className="uf-media-viewer-side">
          <div className="uf-media-viewer-side-scrollable">
            <header className="uf-media-viewer-author">
              <div className="uf-media-viewer-avatar">
              {finalAuthorImage ? (
                <Image
                  src={finalAuthorImage}
                  alt={finalAuthorName}
                  width={46}
                  height={46}
                />
              ) : (
                <span>{getInitial(finalAuthorName)}</span>
              )}
            </div>

            <div className="uf-media-viewer-author-meta">
              <strong>{finalAuthorName}</strong>
              <span>{formatDate(finalCreatedAt)}</span>
            </div>
          </header>

          <div className="uf-media-viewer-caption">
            {finalCaption ? (
              <p>{finalCaption}</p>
            ) : (
              <p className="uf-media-viewer-muted">{t("photos.viewer.noCaption")}</p>
            )}

            {hashtags.length > 0 && (
              <div className="uf-media-viewer-tags">
                {hashtags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="uf-media-viewer-actions">
            <button
              type="button"
              className={`uf-media-viewer-action like ${liked ? "active" : ""}`}
              onClick={handleLike}
              disabled={isPending}
              aria-label={liked ? "Unlike" : "Like"}
              aria-pressed={liked}
            >
              <span className="uf-media-viewer-action-icon">
                <UiIcon name="heart" size={18} />
              </span>
              <span className="uf-media-viewer-action-count">{likesNum}</span>
            </button>

            <button
              type="button"
              className="uf-media-viewer-action comment"
              aria-label="Write a comment"
              onClick={() => {
                setShowCommentInput(true);
                // Focus on next tick so the freshly-mounted input gets focus.
                setTimeout(() => {
                  commentInputRef.current?.focus();
                  commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 50);
              }}
            >
              <span className="uf-media-viewer-action-icon">
                <UiIcon name="comment" size={18} />
              </span>
              <span className="uf-media-viewer-action-count">{commentsNum}</span>
            </button>

            <button
              type="button"
              className={`uf-media-viewer-action bookmark ${saved ? "active" : ""}`}
              onClick={handleSave}
              disabled={isPending}
              aria-label={saved ? "Remove from saved" : "Save"}
              aria-pressed={saved}
            >
              <span className="uf-media-viewer-action-icon">
                <UiIcon name="bookmark" size={18} />
              </span>
            </button>

            <button
              type="button"
              className="uf-media-viewer-action share"
              onClick={() => setShowShareModal(true)}
            >
              <span className="uf-media-viewer-action-icon">
                <UiIcon name="send" size={18} />
              </span>
            </button>

            <button
              type="button"
              className="uf-media-viewer-action download"
              onClick={async () => {
                try {
                  const res = await fetch(activeSrc, { mode: "cors" });
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const blob = await res.blob();
                  const ext =
                    activeSrc.match(
                      /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)/i,
                    )?.[1] || (activeType === "video" ? "mp4" : "jpg");
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = blobUrl;
                  a.download = `${activeType === "video" ? "video" : "photo"}-${finalPhotoId || Date.now()}.${ext}`;
                  a.style.display = "none";
                  document.body.appendChild(a);
                  a.click();
                  // Revoke after a tick so the browser has time to start the download.
                  setTimeout(() => {
                    a.remove();
                    URL.revokeObjectURL(blobUrl);
                  }, 1000);
                } catch {
                  // CORS or network failure — fall back to opening the asset directly.
                  window.open(activeSrc, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <span className="uf-media-viewer-action-icon">
                <UiIcon name="download" size={18} />
              </span>
            </button>
          </div>

          {(finalCommunity || viewsNum > 0) && (
            <section className="uf-media-viewer-student-box">
              <h3>{t("photos.viewer.studentContext")}</h3>

              {finalCommunity && (
                <div>
                  <span>{t("photos.viewer.community")}</span>
                  <strong>{finalCommunity}</strong>
                </div>
              )}

              {viewsNum > 0 && (
                <div>
                  <span>{t("photos.viewer.views")}</span>
                  <strong>{viewsNum}</strong>
                </div>
              )}
            </section>
          )}

          <section className="uf-media-viewer-comments">
            <div className="uf-media-viewer-comments-title">
              <strong>{t("photos.viewer.comments")}</strong>
            </div>

            <div className="uf-media-viewer-comments-list">
              {commentsList.length > 0 ? (
                commentsList.map((comment) => (
                  <ThreadedComment
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId || null}
                    isExpanded={expandedThreads.has(comment.id)}
                    onToggleExpand={() => toggleThread(comment.id)}
                    onLike={handleToggleCommentLike}
                    onReply={handleStartReply}
                    onDelete={handleDeleteComment}
                    onReport={handleReportComment}
                    t={t}
                  />
                ))
              ) : (
                <div className="uf-media-viewer-empty-comments">
                  {t("photos.viewer.noCommentsYet")}
                </div>
              )}
              <div ref={commentsEndRef} />
            </div>

            {(showCommentInput ||
              (currentUserId &&
                (finalPhotoId || postId || onSubmitCommentAction))) && (
              <div className="uf-media-viewer-comment-input-wrap">
                {replyingTo && (
                  <div className="uf-media-viewer-replying-banner">
                    <span>
                      {t("photos.viewer.replyingTo")} <strong>@{replyingTo.authorName}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      aria-label="Cancel reply"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="uf-media-viewer-comment-input">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                      if (e.key === "Escape" && replyingTo) {
                        e.preventDefault();
                        setReplyingTo(null);
                      }
                    }}
                    placeholder={
                      !currentUserId
                        ? t("photos.viewer.signInToComment")
                        : replyingTo
                          ? t("photos.viewer.replyTo").replace("{name}", replyingTo.authorName || "")
                          : t("photos.viewer.addComment")
                    }
                    disabled={isPending || !currentUserId}
                    maxLength={500}
                  />
                  <button
                    type="button"
                    onClick={handleSubmitComment}
                    disabled={
                      isPending || !commentText.trim() || !currentUserId
                    }
                    aria-label="Send comment"
                    className="uf-media-viewer-comment-send"
                  >
                    {isPending ? "…" : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
          </div>
        </aside>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              toast.tone === "err"
                ? "var(--danger)"
                : "var(--french-navy, #0b3aa8)",
            color: "var(--bg-card)",
            padding: "10px 20px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            zIndex: 2147483647,
            pointerEvents: "none",
            boxShadow: "0 12px 28px rgba(2, 6, 23, 0.32)",
          }}
        >
          {toast.text}
        </div>
      )}

      {showShareModal && (
        <SharePostModal
          postUrl={
            postId
              ? `${window.location.origin}/feed#${postId}`
              : finalPhotoId
              ? `${window.location.origin}/photos#${finalPhotoId}`
              : window.location.href
          }
          photoUrl={activeSrc}
          currentUserId={currentUserId ?? null}
          onClose={() => setShowShareModal(false)}
          onSent={() => {
            setShowShareModal(false);
            showToast("Sent!");
          }}
        />
      )}
    </div>
  );

  return createPortal(viewer, document.body);
}

// ----------------------------------------------------------------------------
// ThreadedComment — Instagram-style comment block with like / reply / report.
// ----------------------------------------------------------------------------

type ThreadedCommentProps = {
  comment: MediaComment;
  currentUserId: string | null;
  isExpanded: boolean;
  isReply?: boolean;
  onToggleExpand: () => void;
  onLike: (commentId: string) => void;
  onReply: (comment: MediaComment) => void;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string) => void;
  t: (key: string) => string;
};

function ThreadedComment({
  comment,
  currentUserId,
  isExpanded,
  isReply = false,
  onToggleExpand,
  onLike,
  onReply,
  onDelete,
  onReport,
  t,
}: ThreadedCommentProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isOwn = Boolean(currentUserId && comment.userId === currentUserId);
  const replies = comment.replies || [];
  const likesCount = comment.likesCount || 0;
  const isLikedByMe = Boolean(comment.isLikedByMe);
  const isOptimistic = comment.id.startsWith("temp-");

  return (
    <div
      className={`uf-ig-comment ${isReply ? "is-reply" : ""} ${
        isOptimistic ? "is-sending" : ""
      }`}
    >
      <div className="uf-ig-comment-row">
        <div className="uf-ig-comment-avatar">
          {comment.authorImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.authorImage}
              alt={comment.authorName || "User"}
            />
          ) : (
            <span>{getInitial(comment.authorName)}</span>
          )}
        </div>

        <div className="uf-ig-comment-body">
          <div className="uf-ig-comment-text">
            <strong>{comment.authorName || "Student"}</strong> 
            <span style={{ marginLeft: 6 }}>{comment.content}</span>
          </div>

          <div className="uf-ig-comment-meta">
            <span className="uf-ig-comment-time">
              {formatDate(comment.createdAt)}
            </span>
            <button
              type="button"
              className="uf-ig-comment-meta-btn"
              onClick={() => onReply(comment)}
              disabled={isOptimistic}
            >
              {t("photos.viewer.reply")}
            </button>
          </div>
        </div>

        <div className="uf-ig-comment-actions">
          <button
            type="button"
            className={`uf-ig-comment-like-btn ${isLikedByMe ? "active" : ""}`}
            onClick={() => onLike(comment.id)}
            disabled={isOptimistic}
            aria-label={isLikedByMe ? "Unlike" : "Like"}
            aria-pressed={isLikedByMe}
          >
            <UiIcon name="heart" size={14} />
          </button>

          <div className="uf-ig-comment-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="uf-ig-comment-menu-trigger"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More actions"
              disabled={isOptimistic}
            >
              <UiIcon name="more" size={14} />
            </button>
            {menuOpen && (
              <div className="uf-ig-comment-menu" role="menu">
                {isOwn ? (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(comment.id);
                    }}
                  >
                    {t("photos.viewer.delete")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onReport(comment.id);
                    }}
                  >
                    {t("photos.viewer.report")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isReply && replies.length > 0 && (
        <div className="uf-ig-comment-replies">
          <button
            type="button"
            className="uf-ig-comment-thread-toggle"
            onClick={onToggleExpand}
          >
            <span className="uf-ig-comment-thread-line" aria-hidden />
            {isExpanded
              ? t("photos.viewer.hideReplies")
              : t("photos.viewer.viewReplies")
                  .replace("{n}", replies.length.toString())
                  .replace("{replyText}", replies.length === 1 ? t("photos.viewer.replyTextSingle") : t("photos.viewer.replyTextPlural"))}
          </button>

          {isExpanded &&
            replies.map((reply) => (
              <ThreadedComment
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isExpanded={false}
                isReply
                onToggleExpand={() => {}}
                onLike={onLike}
                onReply={onReply}
                onDelete={onDelete}
                onReport={onReport}
                t={t}
              />
            ))}
        </div>
      )}
    </div>
  );
}
