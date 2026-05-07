"use client";

import { useState } from "react";
import { createCommunityPost } from "@/app/actions/community";
import UiIcon from "@/components/UiIcon";

type CommunityPostComposerProps = {
  communityId: string;
  currentUser: {
    id: string;
    fullName: string;
    image?: string | null;
  };
};

export default function CommunityPostComposer({
  communityId,
  currentUser,
}: CommunityPostComposerProps) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initial = currentUser.fullName.charAt(0).toUpperCase();

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await createCommunityPost(formData);
      setContent("");
      setTags("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-color)" }}>
        <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "16px", fontWeight: "900" }}>
          Create Post
        </h3>
      </div>

      <form action={handleSubmit} style={{ padding: "18px" }}>
        <input type="hidden" name="communityId" value={communityId} />

        <div style={{ display: "grid", gridTemplateColumns: "48px minmax(0, 1fr)", gap: "12px", marginBottom: "14px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "999px",
            overflow: "hidden",
            background: "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {currentUser.image ? (
              <img src={currentUser.image} alt={currentUser.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ color: "#ffffff", fontSize: "18px", fontWeight: "900" }}>{initial}</div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <textarea
              name="content"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={3000}
              required
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "14px 16px",
                border: "1px solid var(--border-color)",
                borderRadius: "14px",
                background: "var(--bg-soft)",
                color: "var(--text-primary)",
                fontSize: "15px",
                lineHeight: "1.5",
                fontFamily: "inherit",
                resize: "none",
                transition: "all 0.2s ease"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--french-blue)";
                e.target.style.background = "#ffffff";
                e.target.style.boxShadow = "0 0 0 3px rgba(11, 58, 168, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border-color)";
                e.target.style.background = "var(--bg-soft)";
                e.target.style.boxShadow = "none";
              }}
            />

            <input
              type="text"
              name="tags"
              placeholder="Add tags (e.g., #exam #homework #internship)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                background: "#ffffff",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontFamily: "inherit",
                transition: "all 0.2s ease"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--french-blue)";
                e.target.style.boxShadow = "0 0 0 3px rgba(11, 58, 168, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border-color)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{
              minHeight: "38px",
              padding: "0 14px",
              border: "1px solid var(--border-color)",
              borderRadius: "999px",
              background: "#ffffff",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "14px",
              fontWeight: "800",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-soft)";
              e.currentTarget.style.borderColor = "var(--french-blue)";
              e.currentTarget.style.color = "var(--french-blue)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}>
              <input
                type="file"
                name="image"
                accept="image/*,video/*"
                style={{ display: "none" }}
              />
              <UiIcon name="image" size={18} />
              <span>Photo/Video</span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
