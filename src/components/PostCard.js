"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { deletePost } from "@/app/actions/post";
import { addComment, toggleLike } from "@/app/actions/interactions";

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

export default function PostCard({ post, currentUser }) {
  const commentFormRef = useRef(null);
  const [isPending, startTransition] = useTransition();

  const [state, updateOptimistic] = useOptimistic(
    {
      likedByMe: Boolean(post.likedByMe),
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      comments: post.comments || [],
    },
    (current, action) => {
      if (action.type === "like") {
        const nextLiked = !current.likedByMe;
        return {
          ...current,
          likedByMe: nextLiked,
          likesCount: Math.max(0, current.likesCount + (nextLiked ? 1 : -1)),
        };
      }

      if (action.type === "comment") {
        return {
          ...current,
          commentsCount: current.commentsCount + 1,
          comments: [...current.comments, action.comment],
        };
      }

      return current;
    }
  );

  return (
    <article className="card old-post" style={{ padding: "16px", position: "relative", opacity: post.isOptimistic ? 0.75 : 1 }}>
      {currentUser?.id === post.authorId && !post.isOptimistic && (
        <form action={deletePost} style={{ position: "absolute", top: "12px", right: "12px" }}>
          <input type="hidden" name="postId" value={post.id} />
          <button
            type="submit"
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem" }}
            title="Delete post"
          >
            ×
          </button>
        </form>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <div className="avatar-blank-sm" style={{ backgroundColor: "var(--ufar-blue)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", borderRadius: "50%", width: "40px", height: "40px", overflow: "hidden" }}>
          {post.authorImage ? <img src={post.authorImage} alt={post.authorName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : post.authorName?.[0] || "U"}
        </div>
        <div>
          <h4 style={{ margin: 0 }}>{post.authorName}</h4>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {post.authorFaculty || "Student"} · {formatDate(post.createdAt)}
            {post.communityName ? ` · ${post.communityName}` : ""}
            {post.isOptimistic ? " · Sending..." : ""}
          </span>
        </div>
      </div>

      <div className="post-content" style={{ marginTop: "12px" }}>
        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{post.content}</p>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post attachment"
            style={{ marginTop: "12px", borderRadius: "14px", maxHeight: "400px", maxWidth: "100%", objectFit: "cover", border: "1px solid var(--border-color)" }}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: "16px", marginTop: "16px", borderTop: "1px solid var(--border-color-light)", paddingTop: "12px" }}>
        <form
          action={(formData) => {
            updateOptimistic({ type: "like" });
            startTransition(async () => {
              try {
                await toggleLike(formData);
              } catch (error) {
                alert(error.message || "Failed to update like");
              }
            });
          }}
        >
          <input type="hidden" name="postId" value={post.id} />
          <button
            type="submit"
            disabled={isPending || post.isOptimistic}
            style={{ background: "none", border: "none", color: state.likedByMe ? "var(--ufar-blue)" : "var(--text-secondary)", cursor: "pointer", fontWeight: "bold" }}
          >
            👍 Like ({state.likesCount})
          </button>
        </form>

        <span style={{ color: "var(--text-secondary)", fontWeight: "bold" }}>
          💬 Comment ({state.commentsCount})
        </span>
      </div>

      {state.comments.length > 0 && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {state.comments.map((comment) => (
            <div key={comment.id} style={{ background: "var(--bg-main)", padding: "10px 12px", borderRadius: "12px" }}>
              <strong style={{ fontSize: "0.9rem" }}>{comment.authorName || "Student"}</strong>
              <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", fontSize: "0.92rem" }}>{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {!post.isOptimistic && (
        <form
          ref={commentFormRef}
          action={(formData) => {
            const content = String(formData.get("content") || "").trim();
            if (!content) return;

            updateOptimistic({
              type: "comment",
              comment: {
                id: `temp-comment-${Date.now()}`,
                content,
                authorName: currentUser?.fullName || "You",
                createdAt: new Date().toISOString(),
              },
            });

            commentFormRef.current?.reset();

            startTransition(async () => {
              try {
                await addComment(formData);
              } catch (error) {
                alert(error.message || "Failed to add comment");
              }
            });
          }}
          style={{ marginTop: "12px", display: "flex", gap: "8px" }}
        >
          <input type="hidden" name="postId" value={post.id} />
          <input
            name="content"
            placeholder="Write a comment..."
            maxLength={1000}
            style={{ flex: 1, border: "1px solid var(--border-color-light)", borderRadius: "999px", padding: "10px 14px", outline: "none" }}
          />
          <button type="submit" className="btn btn-secondary" disabled={isPending}>
            Send
          </button>
        </form>
      )}
    </article>
  );
}
