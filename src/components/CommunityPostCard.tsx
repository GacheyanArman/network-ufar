"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import UiIcon from "@/components/UiIcon";
import {
  deleteCommunityPost,
  markQuestionSolved,
  togglePinPost,
  unmarkQuestionSolved,
} from "@/app/actions/community";

export type CommunityPostType =
  | "discussion"
  | "question"
  | "study_group"
  | "material"
  | "event"
  | "announcement";

export type CommunityPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  tags?: string | null;
  postType: CommunityPostType;
  createdAt?: Date | string | null;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  authorRole?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  likedByMe?: boolean | null;
  isPinned?: boolean | null;
  isSolved?: boolean | null;
  bestCommentId?: string | null;
  communityName?: string | null;
  comments?: Array<{
    id: string;
    content: string;
    createdAt?: Date | string | null;
    authorId: string;
    authorName?: string | null;
    authorImage?: string | null;
  }>;
};

type Props = {
  post: CommunityPost;
  currentUser: {
    id: string;
    fullName: string;
    faculty?: string | null;
    image?: string | null;
    avatarUrl?: string | null;
  };
  canModerate: boolean;
  canMarkSolved?: boolean;
};

const TYPE_LABELS: Record<CommunityPostType, string> = {
  discussion: "Discussion",
  question: "Question",
  study_group: "Study group",
  material: "Material",
  event: "Event",
  announcement: "Announcement",
};

export default function CommunityPostCard({
  post,
  currentUser,
  canModerate,
  canMarkSolved = false,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [pickingBest, setPickingBest] = useState(false);

  const bestAnswer = post.bestCommentId
    ? post.comments?.find((c) => c.id === post.bestCommentId)
    : null;

  const showBestAnswerHint =
    post.postType === "question" && post.isSolved && !bestAnswer;

  const canSolve = canMarkSolved || canModerate;

  return (
    <article className="card" style={{ padding: 0, overflow: "hidden" }}>
      {(post.isPinned || post.postType !== "discussion" || post.isSolved) && (
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            borderBottom: "1px solid var(--border-color-light)",
            background:
              post.postType === "announcement"
                ? "#fff7ed"
                : post.isPinned
                  ? "#fffbeb"
                  : "var(--bg-soft)",
          }}
        >
          {post.isPinned ? (
            <span className="uf-pinned-banner">
              <UiIcon name="bookmark" size={12} />
              Pinned
            </span>
          ) : null}

          {post.postType && post.postType !== "discussion" ? (
            <span
              className={`uf-post-type-badge ${post.postType}`}
              title={TYPE_LABELS[post.postType]}
            >
              {TYPE_LABELS[post.postType]}
            </span>
          ) : null}

          {post.postType === "question" && post.isSolved ? (
            <span className="uf-solved-banner">
              <UiIcon name="check" size={12} />
              Solved
            </span>
          ) : null}
        </div>
      )}

      <PostCard post={post} currentUser={currentUser} />

      {bestAnswer ? (
        <div style={{ padding: "0 16px 16px 16px" }}>
          <div className="uf-best-answer">
            <span className="uf-best-answer-title">
              <UiIcon name="check" size={14} />
              Best answer
            </span>
            <p className="uf-best-answer-text">{bestAnswer.content}</p>
            <Link
              href={`/profile/${bestAnswer.authorId}`}
              className="uf-best-answer-author"
              style={{ textDecoration: "none" }}
            >
              — {bestAnswer.authorName || "Student"}
            </Link>
          </div>
        </div>
      ) : null}

      {showBestAnswerHint ? (
        <div style={{ padding: "0 16px 16px 16px" }}>
          <div
            style={{
              padding: "10px 12px",
              background: "#ecfdf5",
              color: "#065f46",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            This question is solved.
          </div>
        </div>
      ) : null}

      {(canModerate || canSolve) && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--border-color-light)",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            background: "var(--bg-soft)",
          }}
        >
          {canModerate ? (
            <button
              type="button"
              className="uf-chip-btn"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const fd = new FormData();
                  fd.append("postId", post.id);
                  await togglePinPost(fd);
                })
              }
            >
              <UiIcon name="bookmark" size={14} />
              {post.isPinned ? "Unpin" : "Pin to top"}
            </button>
          ) : null}

          {post.postType === "question" && canSolve && !post.isSolved ? (
            <>
              {(post.comments?.length ?? 0) > 0 ? (
                <button
                  type="button"
                  className="uf-chip-btn"
                  disabled={isPending}
                  onClick={() => setPickingBest((v) => !v)}
                >
                  <UiIcon name="check" size={14} />
                  {pickingBest ? "Cancel" : "Mark solved + best answer"}
                </button>
              ) : null}
              <form
                action={(fd) =>
                  startTransition(async () => {
                    fd.append("postId", post.id);
                    await markQuestionSolved(fd);
                  })
                }
              >
                <button
                  type="submit"
                  className="uf-chip-btn primary"
                  disabled={isPending}
                >
                  <UiIcon name="check" size={14} />
                  Mark as solved
                </button>
              </form>
            </>
          ) : null}

          {post.postType === "question" && canSolve && post.isSolved ? (
            <form
              action={(fd) =>
                startTransition(async () => {
                  fd.append("postId", post.id);
                  await unmarkQuestionSolved(fd);
                })
              }
            >
              <button
                type="submit"
                className="uf-chip-btn"
                disabled={isPending}
              >
                Reopen question
              </button>
            </form>
          ) : null}

          {canModerate && post.authorId !== currentUser.id ? (
            <form
              action={(fd) =>
                startTransition(async () => {
                  fd.append("postId", post.id);
                  await deleteCommunityPost(fd);
                })
              }
            >
              <button
                type="submit"
                className="uf-chip-btn danger"
                disabled={isPending}
              >
                <UiIcon name="trash" size={14} />
                Remove
              </button>
            </form>
          ) : null}
        </div>
      )}

      {pickingBest && canSolve && post.comments?.length ? (
        <div
          style={{
            padding: "10px 14px 14px",
            borderTop: "1px solid var(--border-color-light)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "var(--text-secondary)",
            }}
          >
            Pick the best answer to mark this question as solved:
          </div>
          {post.comments.map((c) => (
            <form
              key={c.id}
              action={(fd) =>
                startTransition(async () => {
                  fd.append("postId", post.id);
                  fd.append("bestCommentId", c.id);
                  await markQuestionSolved(fd);
                  setPickingBest(false);
                })
              }
            >
              <button
                type="submit"
                className="uf-chip-btn"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  padding: "10px 12px",
                  height: "auto",
                  whiteSpace: "normal",
                }}
                disabled={isPending}
              >
                <strong style={{ marginRight: 6 }}>{c.authorName}:</strong>
                <span>{c.content}</span>
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </article>
  );
}
