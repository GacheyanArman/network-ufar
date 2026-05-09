"use client";

import { useState } from "react";
import { createCommunityPost } from "@/app/actions/community";
import UiIcon from "@/components/UiIcon";

type PostTypeId =
  | "discussion"
  | "question"
  | "study_group"
  | "material"
  | "event"
  | "announcement";

type CommunityPostComposerProps = {
  communityId: string;
  currentUser: {
    id: string;
    fullName: string;
    image?: string | null;
  };
  canAnnounce?: boolean;
  defaultPostType?: PostTypeId;
};

const POST_TYPE_OPTIONS: Array<{
  id: PostTypeId;
  label: string;
  icon: string;
  placeholder: string;
  requiresMod?: boolean;
}> = [
  {
    id: "discussion",
    label: "Discussion",
    icon: "news",
    placeholder: "Start a discussion...",
  },
  {
    id: "question",
    label: "Question",
    icon: "message",
    placeholder: "Ask a question — your peers will help!",
  },
  {
    id: "study_group",
    label: "Study group",
    icon: "users",
    placeholder: "Looking for people to study with? Share subject, time, place.",
  },
  {
    id: "material",
    label: "Material",
    icon: "book",
    placeholder: "Share a useful material, link, or resource.",
  },
  {
    id: "event",
    label: "Event",
    icon: "calendar",
    placeholder: "Announce an event — date, place, details.",
  },
  {
    id: "announcement",
    label: "Announcement",
    icon: "bell",
    placeholder: "Write an official announcement for members.",
    requiresMod: true,
  },
];

export default function CommunityPostComposer({
  communityId,
  currentUser,
  canAnnounce = false,
  defaultPostType = "discussion",
}: CommunityPostComposerProps) {
  const [postType, setPostType] = useState<PostTypeId>(defaultPostType);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initial = currentUser.fullName.charAt(0).toUpperCase();
  const placeholder =
    POST_TYPE_OPTIONS.find((t) => t.id === postType)?.placeholder ||
    "What's on your mind?";

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    try {
      formData.set("postType", postType);
      const result = await createCommunityPost(formData);
      if (result?.ok === false) {
        setError(result.error || "Failed to post");
      } else {
        setContent("");
        setTags("");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to post. Try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--border-color-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "var(--text-primary)",
            fontSize: "16px",
            fontWeight: 900,
          }}
        >
          Create a post
        </h3>
      </div>

      <form action={handleSubmit} style={{ padding: "18px" }}>
        <input type="hidden" name="communityId" value={communityId} />
        <input type="hidden" name="postType" value={postType} />

        <div className="uf-community-post-type-picker">
          {POST_TYPE_OPTIONS.map((option) => {
            const disabled = option.requiresMod && !canAnnounce;
            const isActive = postType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={`uf-post-type-chip ${isActive ? "is-active" : ""}`}
                disabled={disabled}
                title={
                  disabled
                    ? "Only moderators and the owner can post announcements"
                    : option.label
                }
                onClick={() => setPostType(option.id)}
              >
                <UiIcon name={option.icon} size={14} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px minmax(0, 1fr)",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              overflow: "hidden",
              background:
                "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            {currentUser.image ? (
              <img
                src={currentUser.image}
                alt={currentUser.fullName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initial
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              maxLength={3000}
              required
              style={{
                width: "100%",
                minHeight: postType === "announcement" ? 140 : 96,
                padding: "12px 14px",
                border: "1px solid var(--border-color)",
                borderRadius: 12,
                background: "#ffffff",
                color: "var(--text-primary)",
                fontSize: 15,
                lineHeight: 1.5,
                fontFamily: "inherit",
                resize: "none",
              }}
            />

            <input
              type="text"
              name="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Add tags (comma separated, e.g. exam, law, term1)"
              maxLength={200}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                background: "#ffffff",
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              color: "#991b1b",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <label
            style={{
              minHeight: 38,
              padding: "0 14px",
              border: "1px solid var(--border-color)",
              borderRadius: 999,
              background: "#ffffff",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <UiIcon name="image" size={18} />
            <span>Photo</span>
            <input
              type="file"
              name="image"
              accept="image/*"
              style={{ display: "none" }}
            />
          </label>

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
