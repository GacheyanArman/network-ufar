"use client";

import { useState, useTransition, useOptimistic } from "react";
import Image from "next/image";
import { createComment, deleteComment } from "@/features/feed/server/comments";

type Comment = {
  id: string;
  content: string;
  createdAt?: Date | string | null;
  authorId: string;
  authorName?: string | null;
  authorImage?: string | null;
  isOptimistic?: boolean;
};

type CommentSectionProps = {
  postId: string;
  initialComments: Comment[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserImage?: string;
};

type OptimisticAction =
  | { type: "add"; comment: Comment }
  | { type: "delete"; commentId: string };

export default function CommentSection({
  postId,
  initialComments,
  currentUserId,
  currentUserName,
  currentUserImage,
}: CommentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isPending, startTransition] = useTransition();

  const [comments, updateOptimistic] = useOptimistic(
    initialComments,
    (state: Comment[], action: OptimisticAction): Comment[] => {
      if (action.type === "add") {
        return [action.comment, ...state];
      }
      if (action.type === "delete") {
        return state.filter((c) => c.id !== action.commentId);
      }
      return state;
    }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!commentText.trim() || isPending) return;

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
      authorId: currentUserId || "",
      authorName: currentUserName || "You",
      authorImage: currentUserImage || null,
      isOptimistic: true,
    };

    const formData = new FormData();
    formData.append("postId", postId);
    formData.append("content", commentText.trim());

    setCommentText("");

    startTransition(() => {
      updateOptimistic({ type: "add", comment: optimisticComment });

      void createComment(formData).catch(() => {
        setCommentText(commentText);
      });
    });
  }

  async function handleDelete(commentId: string) {
    if (isPending) return;

    const formData = new FormData();
    formData.append("commentId", commentId);

    startTransition(() => {
      updateOptimistic({ type: "delete", commentId });

      void deleteComment(formData).catch(() => {
        // Revert on error
      });
    });
  }

  const displayedComments = isExpanded ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3;

  return (
    <>
      <style>{commentSectionStyles}</style>

      <div className="uf-comments-section">
        {comments.length > 0 && (
          <div className="uf-comments-list">
            {displayedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onDelete={handleDelete}
              />
            ))}

            {hasMore && !isExpanded && (
              <button
                type="button"
                className="uf-comments-show-more"
                onClick={() => setIsExpanded(true)}
              >
                View {comments.length - 3} more comment
                {comments.length - 3 !== 1 ? "s" : ""}
              </button>
            )}

            {hasMore && isExpanded && (
              <button
                type="button"
                className="uf-comments-show-more"
                onClick={() => setIsExpanded(false)}
              >
                Show less
              </button>
            )}
          </div>
        )}

        {currentUserId && (
          <form onSubmit={handleSubmit} className="uf-comment-form">
            <div className="uf-comment-input-wrap">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                maxLength={1000}
                disabled={isPending}
                className="uf-comment-input"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isPending}
                className="uf-comment-submit"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.504 21.866l.526-2.108C3.04 19.719 4 15.823 4 12s-.96-7.719-.97-7.757l-.527-2.109L22.236 12 2.504 21.866zM5.981 13c-.072 1.962-.34 3.833-.583 5.183L17.764 12 5.398 5.818c.242 1.349.51 3.221.583 5.183H10v2H5.981z" />
                </svg>
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
}) {
  const authorName = comment.authorName || "User";
  const authorInitial = authorName.charAt(0).toUpperCase();
  const isOwn = currentUserId === comment.authorId;
  const timeAgo = formatTimeAgo(comment.createdAt);

  return (
    <div
      className={`uf-comment-item ${comment.isOptimistic ? "is-sending" : ""}`}
    >
      <div className="uf-comment-avatar">
        {comment.authorImage ? (
          <Image src={comment.authorImage} alt={authorName} width={32} height={32} />
        ) : (
          <div className="uf-comment-avatar-fallback">{authorInitial}</div>
        )}
      </div>

      <div className="uf-comment-body">
        <div className="uf-comment-bubble">
          <div className="uf-comment-header">
            <span className="uf-comment-author">{authorName}</span>
            <span className="uf-comment-time">{timeAgo}</span>
          </div>
          <p className="uf-comment-text">{comment.content}</p>
        </div>

        {isOwn && !comment.isOptimistic && (
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            className="uf-comment-delete"
            aria-label="Delete comment"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(value: Date | string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const commentSectionStyles = `
.uf-comments-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e6edf5;
}

.uf-comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.uf-comment-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  transition: opacity 0.2s ease;
}

.uf-comment-item.is-sending {
  opacity: 0.6;
}

.uf-comment-avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 999px;
  overflow: hidden;
  background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%);
  box-shadow: 0 2px 6px rgba(44, 90, 160, 0.12);
}

.uf-comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.uf-comment-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
}

.uf-comment-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.uf-comment-bubble {
  background: #f8f9fc;
  border: 1px solid #eef2f7;
  border-radius: 14px;
  padding: 10px 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.uf-comment-bubble:hover {
  background: #f3f4f8;
  border-color: var(--border-color);
}

.uf-comment-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.uf-comment-author {
  color: #1a202e;
  font-size: 13px;
  font-weight: 850;
}

.uf-comment-time {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.uf-comment-text {
  margin: 0;
  color: #1a202e;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.uf-comment-delete {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
}

.uf-comment-delete:hover {
  background: #fff1f2;
  color: #dc2626;
}

.uf-comments-show-more {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #2c5aa0;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
}

.uf-comments-show-more:hover {
  background: #f0f4fb;
}

.uf-comment-form {
  margin-top: 8px;
}

.uf-comment-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1.5px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 4px 4px 16px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.uf-comment-input-wrap:focus-within {
  border-color: #2c5aa0;
  box-shadow: 0 0 0 3px rgba(44, 90, 160, 0.12);
}

.uf-comment-input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0;
  border: none !important;
  background: transparent !important;
  color: #1a202e;
  font-size: 14px;
  outline: none !important;
  box-shadow: none !important;
}

.uf-comment-input::placeholder {
  color: #94a3b8;
}

.uf-comment-submit {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(44, 90, 160, 0.2);
}

.uf-comment-submit:hover:not(:disabled) {
  transform: scale(1.08);
  box-shadow: 0 6px 16px rgba(44, 90, 160, 0.28);
}

.uf-comment-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.uf-comment-submit svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

@media (max-width: 640px) {
  .uf-comment-avatar {
    width: 28px;
    height: 28px;
    flex-basis: 28px;
  }

  .uf-comment-bubble {
    padding: 8px 12px;
  }

  .uf-comment-author {
    font-size: 12px;
  }

  .uf-comment-text {
    font-size: 13px;
  }
}
`;
