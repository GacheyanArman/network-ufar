"use client";

import Link from "next/link";
import Image from "next/image";
import { Fragment, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import MediaViewer from "@/features/photos/components/MediaViewer";
import CommentSection from "@/features/feed/components/CommentSection";
import SharePostModal from "./SharePostModal";
import { deletePost } from "@/features/feed/server/actions";
import { toggleLike, toggleSavePost } from "@/features/feed/server/interactions";

type MediaType = "image" | "video";

type CurrentUser = {
  id: string;
  fullName: string;
  faculty?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
};

type Comment = {
  id: string;
  content: string;
  createdAt?: Date | string | null;
  authorId: string;
  authorName?: string | null;
  authorImage?: string | null;
};

type PostCardPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  mediaType?: MediaType | null;
  createdAt?: Date | string | null;
  authorId: string;
  likesCount?: number | null;
  commentsCount?: number | null;
  repostsCount?: number | null;
  viewsCount?: number | null;
  authorName: string;
  authorImage?: string | null;
  likedByMe?: boolean | null;
  savedByMe?: boolean | null;
  isOptimistic?: boolean;
  communityName?: string | null;
  comments?: Comment[];
};

type PostCardProps = {
  post: PostCardPost;
  currentUser?: CurrentUser | null;
};

type OptimisticState = {
  likedByMe: boolean;
  likesCount: number;
  repostedByMe: boolean;
  repostsCount: number;
  savedByMe: boolean;
  isHidden: boolean;
};

type OptimisticAction =
  | { type: "like" }
  | { type: "repost" }
  | { type: "save" }
  | { type: "hide" };

export default function PostCard({ post, currentUser }: PostCardProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMenuOpen]);

  const [state, updateOptimistic] = useOptimistic(
    {
      likedByMe: Boolean(post.likedByMe),
      likesCount: Number(post.likesCount || 0),
      repostedByMe: false,
      repostsCount: Number(post.repostsCount || 0),
      savedByMe: Boolean(post.savedByMe),
      isHidden: false,
    } satisfies OptimisticState,
    (current: OptimisticState, action: OptimisticAction): OptimisticState => {
      if (action.type === "like") {
        const nextLiked = !current.likedByMe;

        return {
          ...current,
          likedByMe: nextLiked,
          likesCount: Math.max(0, current.likesCount + (nextLiked ? 1 : -1)),
        };
      }

      if (action.type === "repost") {
        const nextReposted = !current.repostedByMe;

        return {
          ...current,
          repostedByMe: nextReposted,
          repostsCount: Math.max(
            0,
            current.repostsCount + (nextReposted ? 1 : -1)
          ),
        };
      }

      if (action.type === "save") {
        return {
          ...current,
          savedByMe: !current.savedByMe,
        };
      }

      if (action.type === "hide") {
        return {
          ...current,
          isHidden: true,
        };
      }

      return current;
    }
  );

  if (state.isHidden) {
    return null;
  }

  const authorName = post.authorName || "User";
  const authorInitial = authorName.charAt(0).toUpperCase() || "U";
  const authorHandle = generateHandle(authorName);
  const postTime = formatPostDate(post.createdAt);
  const mediaType = getMediaType(post);
  const isOwnPost = currentUser?.id === post.authorId;
  const profileHref = `/profile/${post.authorId}`;

  function handleLike() {
    if (isPending || post.isOptimistic) return;

    const formData = new FormData();
    formData.append("postId", post.id);

    startTransition(() => {
      updateOptimistic({ type: "like" });

      void toggleLike(formData).catch(() => {
        startTransition(() => {
          updateOptimistic({ type: "like" });
        });
      });
    });
  }

  // Awaitable variant used by MediaViewer so it can manage its own
  // optimistic state and surface errors back to the user.
  async function handleLikeFromViewer() {
    if (post.isOptimistic) {
      throw new Error("Post is still being created");
    }

    const formData = new FormData();
    formData.append("postId", post.id);

    startTransition(() => updateOptimistic({ type: "like" }));

    try {
      await toggleLike(formData);
    } catch (err) {
      // Roll back PostCard's optimistic state and let MediaViewer rollback too.
      startTransition(() => updateOptimistic({ type: "like" }));
      throw err;
    }
  }

  function handleRepost() {
    startTransition(() => {
      updateOptimistic({ type: "repost" });
    });
  }

  function handleSave() {
    if (isPending || post.isOptimistic) return;

    const formData = new FormData();
    formData.append("postId", post.id);

    startTransition(() => {
      updateOptimistic({ type: "save" });

      void toggleSavePost(formData).catch(() => {
        startTransition(() => {
          updateOptimistic({ type: "save" });
        });
      });
    });
  }

  function handleToggleComments() {
    // Posts with media should open the immersive MediaViewer instead of an
    // inline comments drawer (Instagram-style).
    if (post.imageUrl) {
      setIsViewerOpen(true);
      return;
    }
    setShowComments((prev) => !prev);
  }

  async function handleShare() {
    setShowShareModal(true);
  }

  async function handleCopyLink() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/profile/${post.authorId}`
        : "";

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setIsMenuOpen(false);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setIsMenuOpen(false);
    }
  }

  return (
    <>
      <style>{postCardStyles}</style>

      <article 
        className={`uf-post ${post.isOptimistic ? "is-sending" : ""}`}
        style={{ zIndex: isMenuOpen ? 50 : 1 }}
      >
        <div className="uf-post-avatar-col">
          <Link href={profileHref} className="uf-post-avatar-link">
            {post.authorImage ? (
              <Image
                src={post.authorImage}
                alt={authorName}
                width={48}
                height={48}
                className="uf-post-avatar"
              />
            ) : (
              <div className="uf-post-avatar uf-post-avatar-fallback">
                {authorInitial}
              </div>
            )}
          </Link>
        </div>

        <div className="uf-post-body">
          <header className="uf-post-header">
            <div className="uf-post-author-line">
              <Link href={profileHref} className="uf-post-author-name">
                {authorName}
              </Link>

              <span className="uf-post-handle">{authorHandle}</span>

              {postTime ? (
                <>
                  <span className="uf-post-dot">·</span>
                  <time className="uf-post-time">{postTime}</time>
                </>
              ) : null}

              {post.communityName ? (
                <>
                  <span className="uf-post-dot">·</span>
                  <span className="uf-post-community">{post.communityName}</span>
                </>
              ) : null}
            </div>

            <div className="uf-post-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="uf-post-menu-btn"
                aria-label="Post options"
                onClick={() => setIsMenuOpen((value) => !value)}
              >
                <Icon name="more" />
              </button>

              {isMenuOpen && (
                <div className="uf-post-menu">
                  <button
                    type="button"
                    className="uf-post-menu-item"
                    onClick={handleCopyLink}
                  >
                    <Icon name="link" />
                    Copy link
                  </button>

                  {post.imageUrl ? (
                    <a
                      href={post.imageUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="uf-post-menu-item"
                      style={{ textDecoration: "none" }}
                    >
                      <Icon name="download" />
                      Download
                    </a>
                  ) : null}

                  {isOwnPost ? (
                    <form
                      action={async (formData) => {
                        startTransition(() => {
                          updateOptimistic({ type: "hide" });
                        });

                        await deletePost(formData);
                      }}
                    >
                      <input type="hidden" name="postId" value={post.id} />
                      <button
                        type="submit"
                        className="uf-post-menu-item danger"
                      >
                        <Icon name="trash" />
                        Delete post
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="uf-post-menu-item"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon name="flag" />
                      Not interested
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>

          {post.content ? (
            <div className="uf-post-text">
              <FormattedText text={post.content} />
            </div>
          ) : null}

          {post.imageUrl && (
            <>
              <button
                type="button"
                onClick={() => setIsViewerOpen(true)}
                style={{
                  width: "100%",
                  border: "none",
                  padding: 0,
                  margin: "12px 0 0",
                  background: "transparent",
                  cursor: "pointer",
                  borderRadius: "18px",
                  overflow: "hidden",
                }}
              >
                <Image
                  src={post.imageUrl}
                  alt={post.content || "Post image"}
                  width={800}
                  height={520}
                  sizes="(max-width: 700px) 100vw, 700px"
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: "520px",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "18px",
                    border: "1px solid var(--border-color)",
                  }}
                />
              </button>

              {isViewerOpen && (
                <MediaViewer
                  src={post.imageUrl}
                  type={post.mediaType || "image"}
                  alt={post.content || "Post image"}
                  title={post.content || undefined}
                  caption={post.content}
                  authorName={post.authorName}
                  authorImage={post.authorImage}
                  likesCount={state.likesCount}
                  commentsCount={post.commentsCount || 0}
                  isLiked={state.likedByMe}
                  communityName={post.communityName || null}
                  postId={post.id}
                  currentUserId={currentUser?.id || null}
                  currentUserImage={currentUser?.image || currentUser?.avatarUrl || null}
                  onLikeAction={handleLikeFromViewer}
                  onCloseAction={() => setIsViewerOpen(false)}
                />
              )}
            </>
          )}

          <footer className="uf-post-actions">
            <div className="uf-post-actions-left">
              <ActionButton
                type="like"
                label="Like"
                icon="heart"
                value={state.likesCount}
                active={state.likedByMe}
                onClick={handleLike}
                disabled={isPending || post.isOptimistic}
              />

              <ActionButton
                type="reply"
                label="Comments"
                icon="reply"
                value={Number(post.commentsCount || 0)}
                onClick={handleToggleComments}
              />
            </div>

            <div className="uf-post-actions-right">
              <ActionButton
                type="bookmark"
                label="Bookmark"
                icon="bookmark"
                active={state.savedByMe}
                onClick={handleSave}
                hideValue
              />

              <ActionButton
                type="share"
                label="Share"
                icon="send"
                onClick={handleShare}
                hideValue
              />
            </div>
          </footer>

          {showComments && (
            <CommentSection
              postId={post.id}
              initialComments={post.comments || []}
              currentUserId={currentUser?.id}
              currentUserName={currentUser?.fullName}
              currentUserImage={currentUser?.image || currentUser?.avatarUrl || undefined}
            />
          )}
        </div>

        {copied ? <div className="uf-post-toast">Link copied</div> : null}
      </article>

      {showShareModal && (
        <SharePostModal
          postUrl={
            typeof window !== "undefined"
              ? `${window.location.origin}/feed#${post.id}`
              : ""
          }
          photoUrl={post.imageUrl || null}
          currentUserId={currentUser?.id || null}
          onClose={() => setShowShareModal(false)}
          onSent={() => setShowShareModal(false)}
        />
      )}

      {isViewerOpen && post.imageUrl && (
        <MediaViewer
          src={post.imageUrl}
          type={post.mediaType || "image"}
          alt={post.content || "Post image"}
          title={post.content || undefined}
          caption={post.content}
          authorName={post.authorName}
          authorImage={post.authorImage}
          createdAt={post.createdAt}
          likesCount={state.likesCount}
          commentsCount={post.commentsCount ?? post.comments?.length ?? 0}
          viewsCount={post.viewsCount ?? 0}
          isLiked={state.likedByMe}
          communityName={post.communityName || null}
          comments={post.comments || []}
          postId={post.id}
          currentUserId={currentUser?.id || null}
          currentUserImage={currentUser?.image || currentUser?.avatarUrl || null}
          onLikeAction={handleLikeFromViewer}
          onCloseAction={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
}

function ActionButton({
  type,
  label,
  icon,
  value = 0,
  active = false,
  disabled = false,
  hideValue = false,
  style,
  onClick,
}: {
  type: "reply" | "repost" | "like" | "views" | "bookmark" | "share";
  label: string;
  icon: IconName;
  value?: number;
  active?: boolean;
  disabled?: boolean;
  hideValue?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`uf-post-action ${type} ${active ? "active" : ""}`}
      aria-label={label}
      disabled={disabled}
      style={style}
      onClick={onClick}
    >
      <span className="uf-post-action-icon">
        <Icon name={icon} filled={active} />
      </span>

      {!hideValue ? (
        <span className="uf-post-action-count">{formatCount(value)}</span>
      ) : null}
    </button>
  );
}

function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, lineIndex) => (
        <Fragment key={`line-${lineIndex}`}>
          {lineIndex > 0 ? <br /> : null}
          <RichLine text={line} lineIndex={lineIndex} />
        </Fragment>
      ))}
    </>
  );
}

function RichLine({
  text,
  lineIndex,
}: {
  text: string;
  lineIndex: number;
}) {
  if (!text) return null;

  const parts = text.split(
    /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+|#[\w\u0400-\u04FF]+|@[\w\u0400-\u04FF]+)/g
  );

  return (
    <>
      {parts.map((part, index) => {
        const key = `${lineIndex}-${index}-${part}`;

        if (!part) return null;

        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={key} className="uf-post-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }

        const markdownLink = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (markdownLink) {
          return (
            <a
              key={key}
              href={markdownLink[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="uf-post-link uf-post-source-link"
            >
              {markdownLink[1]}
            </a>
          );
        }

        if (part.match(/^https?:\/\//)) {
          return (
            <a
              key={key}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="uf-post-link"
            >
              {part}
            </a>
          );
        }

        if (part.match(/^#[\w\u0400-\u04FF]+/)) {
          return (
            <span key={key} className="uf-post-link">
              {part}
            </span>
          );
        }

        if (part.match(/^@[\w\u0400-\u04FF]+/)) {
          return (
            <span key={key} className="uf-post-link">
              {part}
            </span>
          );
        }

        return <Fragment key={key}>{part}</Fragment>;
      })}
    </>
  );
}

function generateHandle(name: string): string {
  const clean = String(name || "user")
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "")
    .slice(0, 18);

  return `@${clean || "user"}`;
}

function formatPostDate(value: Date | string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCount(value: number): string {
  const count = Number(value || 0);

  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M`;
  }

  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}K`;
  }

  return String(count);
}

function getMediaType(post: PostCardPost): MediaType {
  if (post.mediaType === "video") return "video";
  if (post.mediaType === "image") return "image";

  if (post.imageUrl?.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i)) {
    return "video";
  }

  return "image";
}

type IconName =
  | "reply"
  | "repost"
  | "heart"
  | "views"
  | "bookmark"
  | "share"
  | "more"
  | "trash"
  | "link"
  | "flag"
  | "download"
  | "send";

function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  const paths: Record<IconName, string | React.ReactNode> = {
    reply:
      "M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z",
    repost:
      "M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.9 2 2 2H13v2H7.5c-2.21 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.21 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.9-2-2-2z",
    heart: filled
      ? "M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.377-2.55-7.027-5.19-8.379-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.796 2.01 1.429-1.45 3.146-2.1 4.797-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"
      : "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.275 4.28 7.129 6.61 3.853-2.33 6.054-4.64 7.128-6.61 1.112-2.04 1.031-3.7.479-4.82-.561-1.13-1.667-1.84-2.912-1.91zm4.706 1.03c.896 1.81.846 4.17-.514 6.67-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.377-2.55-7.027-5.19-8.379-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.796 2.01 1.429-1.45 3.146-2.1 4.797-2.01 1.954.1 3.714 1.22 4.601 3.01z",
    views:
      "M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z",
    bookmark: filled
      ? "M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z"
      : "M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z",
    share:
      "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z",
    send: (
      <>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </>
    ),
    more:
      "M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm7 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm7 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z",
    trash:
      "M16 6V4.5C16 3.12 14.88 2 13.5 2h-3C9.12 2 8 3.12 8 4.5V6H3v2h1.06l1.06 12.04C5.24 21.15 6.16 22 7.28 22h9.44c1.12 0 2.04-.85 2.16-1.96L19.94 8H21V6h-5zm-6-1.5c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V6h-4V4.5zM16.89 20H7.11L6.06 8h11.88l-1.05 12z",
    link:
      "M18.36 5.64c-1.95-1.95-5.11-1.95-7.07 0L9.88 7.05l1.41 1.41 1.42-1.41c1.17-1.17 3.07-1.17 4.24 0s1.17 3.07 0 4.24l-2.83 2.83c-1.17 1.17-3.07 1.17-4.24 0l-1.41 1.41c1.95 1.95 5.11 1.95 7.07 0l2.83-2.83c1.95-1.95 1.95-5.11-.01-7.06zM7.05 16.95c-1.17-1.17-1.17-3.07 0-4.24l2.83-2.83c1.17-1.17 3.07-1.17 4.24 0l1.41-1.41c-1.95-1.95-5.11-1.95-7.07 0l-2.83 2.83c-1.95 1.95-1.95 5.11 0 7.07 1.95 1.95 5.11 1.95 7.07 0l1.41-1.41-1.41-1.41-1.41 1.41c-1.17 1.17-3.07 1.17-4.24 0z",
    flag:
      "M5 3h12.5c.83 0 1.5.67 1.5 1.5v8c0 .83-.67 1.5-1.5 1.5H7v7H5V3zm2 2v7h10V5H7z",
    download:
      "M19.36 10.46L17.95 9.05L13 14V3H11V14L6.05 9.05L4.64 10.46L12 17.82L19.36 10.46ZM20 20H4V22H20V20Z",
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      aria-hidden="true"
      style={name === "send" ? { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } : {}}
    >
      {typeof paths[name] === "string" ? <path d={paths[name] as string} /> : paths[name]}
    </svg>
  );
}

const postCardStyles = `
.uf-post {
  position: relative;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 12px;
  padding: 16px 18px;
  background: #ffffff;
  border: 1px solid #e6edf5;
  border-radius: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  color: #0f172a;
  text-align: left;
  transition: box-shadow 160ms ease;
}

.uf-post:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.uf-post.is-sending {
  opacity: 0.62;
  pointer-events: none;
}

.uf-post-avatar-col {
  min-width: 0;
}

.uf-post-avatar-link {
  width: 48px;
  height: 48px;
  display: block;
  text-decoration: none;
}

.uf-post-avatar {
  width: 48px;
  height: 48px;
  display: block;
  border-radius: 999px;
  object-fit: cover;
  background: #0b3aa8;
  color: #ffffff;
  border: 1px solid #d9e2ef;
}

.uf-post-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 900;
  border: none;
}

.uf-post-body {
  min-width: 0;
}

.uf-post-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  gap: 10px;
  align-items: start;
  margin-bottom: 6px;
}

.uf-post-author-line {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-wrap: wrap;
}

.uf-post-author-name {
  max-width: 220px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 850;
  line-height: 20px;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-post-author-name:hover {
  text-decoration: underline;
}

.uf-post-handle,
.uf-post-dot,
.uf-post-time,
.uf-post-community {
  color: #65758b;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
}

.uf-post-community {
  color: #0b3aa8;
  font-weight: 700;
}

.uf-post-menu-wrap {
  position: relative;
  display: flex;
  justify-content: flex-end;
}

.uf-post-menu-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #65758b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.uf-post-menu-btn svg {
  width: 19px;
  height: 19px;
  fill: currentColor;
}

.uf-post-menu-btn:hover {
  background: rgba(11, 58, 168, 0.08);
  color: #0b3aa8;
}

.uf-post-menu {
  position: absolute;
  top: 38px;
  right: 0;
  z-index: 30;
  min-width: 210px;
  padding: 6px;
  border: 1px solid #d9e2ef;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.14);
}

.uf-post-menu form {
  margin: 0;
}

.uf-post-menu-item {
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
}

.uf-post-menu-item svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.uf-post-menu-item:hover {
  background: #f4f7fb;
}

.uf-post-menu-item.danger {
  color: #dc2626;
}

.uf-post-text {
  color: #0f172a;
  font-size: 15.5px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}

.uf-post-bold {
  font-weight: 850;
}

.uf-post-link {
  color: #0b3aa8;
  font-weight: 700;
  text-decoration: none;
}

.uf-post-link:hover {
  text-decoration: underline;
}

.uf-post-source-link {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  margin-top: 6px;
  padding: 7px 12px;
  border: 1px solid #d9e2ef;
  border-radius: 999px;
  background: #ffffff;
  color: #0b3aa8;
  font-size: 14px;
  text-decoration: none;
}

.uf-post-source-link:hover {
  background: #f4f7fb;
  text-decoration: none;
}

.uf-post-media {
  width: 100%;
  max-height: 520px;
  margin-top: 12px;
  padding: 0;
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  overflow: hidden;
  background: #f4f7fb;
  display: block;
  cursor: pointer;
}

.uf-post-media img,
.uf-post-media video {
  width: 100%;
  height: auto;
  max-height: 520px;
  display: block;
  object-fit: cover;
}

.uf-post-actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.uf-post-actions-left {
  display: flex;
  align-items: center;
  gap: 2px;
}

.uf-post-actions-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.uf-post-action {
  min-width: 0;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #65758b;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: color 160ms ease;
}

.uf-post-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.uf-post-action-icon {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 160ms ease;
}

.uf-post-action-icon svg {
  width: 18.5px;
  height: 18.5px;
  fill: currentColor;
}

.uf-post-action-count {
  min-width: 12px;
  color: currentColor;
}

.uf-post-action.reply:hover,
.uf-post-action.views:hover,
.uf-post-action.bookmark:hover,
.uf-post-action.share:hover,
.uf-post-action.bookmark.active {
  color: #0b3aa8;
}

.uf-post-action.reply:hover .uf-post-action-icon,
.uf-post-action.views:hover .uf-post-action-icon,
.uf-post-action.bookmark:hover .uf-post-action-icon,
.uf-post-action.share:hover .uf-post-action-icon,
.uf-post-action.bookmark.active .uf-post-action-icon {
  background: rgba(11, 58, 168, 0.08);
}

.uf-post-action.repost:hover,
.uf-post-action.repost.active {
  color: #047857;
}

.uf-post-action.repost:hover .uf-post-action-icon,
.uf-post-action.repost.active .uf-post-action-icon {
  background: rgba(4, 120, 87, 0.1);
}

.uf-post-action.like:hover,
.uf-post-action.like.active {
  color: var(--danger);
}

.uf-post-action.like:hover .uf-post-action-icon,
.uf-post-action.like.active .uf-post-action-icon {
  background: rgba(225, 29, 72, 0.1);
}

.uf-post-toast {
  position: absolute;
  right: 18px;
  bottom: 14px;
  z-index: 20;
  padding: 7px 10px;
  border-radius: 999px;
  background: #0f172a;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
}

@media (max-width: 640px) {
  .uf-post {
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 10px;
    padding: 14px 14px;
  }

  .uf-post-avatar-link,
  .uf-post-avatar {
    width: 42px;
    height: 42px;
  }

  .uf-post-action-icon {
    width: 32px;
    height: 32px;
  }

  .uf-post-action-count {
    font-size: 12px;
  }

  .uf-post-author-name {
    max-width: 160px;
  }
}
`;