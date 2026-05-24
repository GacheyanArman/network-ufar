"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createPost, type CreatePostState } from "@/features/feed/server/actions";
import UiIcon from "@/shared/ui/UiIcon";

const EMOJI_CATEGORIES = [
  {
    label: "Frequently Used",
    emojis: ["😂", "❤️", "🔥", "👍", "😭", "🙏", "😎", "🤔", "🎉", "💯", "👀", "✨"],
  },
  {
    label: "Academic",
    emojis: ["🎓", "📚", "💻", "📝", "🧠", "📖", "✏️", "🏫", "📐", "🔬", "📊", "🎯"],
  },
  {
    label: "Reactions",
    emojis: ["😍", "🥳", "😢", "😤", "🤣", "😴", "🤩", "🫡", "👏", "🙌", "💪", "🤝"],
  },
];

type MediaType = "image" | "video";

type CurrentUser = {
  id: string;
  fullName: string;
  faculty?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
};

type OptimisticPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  mediaType?: MediaType | null;
  createdAt?: Date | string | null;
  authorId: string;
  authorName: string;
  authorFaculty?: string | null;
  authorImage?: string | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  comments: [];
  isOptimistic?: boolean;
};

type PostComposerProps = {
  currentUser?: CurrentUser | null;
  onOptimisticPost?: (post: OptimisticPost) => void;
};

const initialState: CreatePostState = {
  error: null,
  ok: false,
};

export default function PostComposer({
  currentUser,
  onOptimisticPost,
}: PostComposerProps) {
  const [content, setContent] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<MediaType | null>(null);
  const [showEmojis, setShowEmojis] = useState<boolean>(false);

  const [state, formAction, isPending] = useActionState(
    createPost,
    initialState
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const emojiRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showEmojis) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojis(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojis]);

  // Reset the form when the server action returns success.
  // Split into two parts so we satisfy React's purity rules:
  //   1. State reset is done in render via the "store previous prop" pattern.
  //   2. DOM/ref reset is done in an effect (refs must not be touched in render).
  const stateOk = Boolean(state?.ok);
  const [prevStateOk, setPrevStateOk] = useState(stateOk);
  if (prevStateOk !== stateOk) {
    setPrevStateOk(stateOk);
    if (stateOk) {
      setContent("");
      setPreview(null);
      setPreviewType(null);
      setShowEmojis(false);
    }
  }

  useEffect(() => {
    if (!stateOk) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    formRef.current?.reset();
  }, [stateOk]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setPreview(null);
      setPreviewType(null);
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      alert("Only image and video files are allowed");
      event.target.value = "";
      setPreview(null);
      setPreviewType(null);
      return;
    }

    const maxSize = isVideo ? 80 * 1024 * 1024 : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        isVideo
          ? "Video is too large (max 80MB)"
          : "Image is too large (max 5MB)"
      );

      event.target.value = "";
      setPreview(null);
      setPreviewType(null);
      return;
    }

    setPreview(URL.createObjectURL(file));
    setPreviewType(isVideo ? "video" : "image");
  }

  async function handleSubmit(formData: FormData) {
    const optimisticContent = String(formData.get("content") || "").trim();

    if (onOptimisticPost && (optimisticContent || preview)) {
      onOptimisticPost({
        id: `temp-${Date.now()}`,
        content: optimisticContent,
        imageUrl: preview,
        mediaType: previewType,
        createdAt: new Date().toISOString(),
        authorId: currentUser?.id || "me",
        authorName: currentUser?.fullName || "You",
        authorFaculty: currentUser?.faculty || "Student",
        authorImage: currentUser?.image || null,
        likesCount: 0,
        commentsCount: 0,
        likedByMe: false,
        comments: [],
        isOptimistic: true,
      });
    }

    formAction(formData);
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="card old-composer"
      style={{ padding: "16px", marginBottom: "16px" }}
    >
      <textarea
        name="content"
        value={content}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          setContent(event.target.value)
        }
        placeholder="What's new?"
        maxLength={3000}
        style={{
          width: "100%",
          minHeight: "80px",
          border: "none",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          fontSize: "1.05rem",
          background: "transparent",
          color: "var(--text-primary)",
        }}
      />

      {preview && (
        <div
          style={{
            position: "relative",
            marginTop: "10px",
            marginBottom: "10px",
            width: "fit-content",
            maxWidth: "100%",
          }}
        >
          {previewType === "video" ? (
            <video
              src={preview}
              controls
              muted
              playsInline
              style={{
                maxHeight: "240px",
                maxWidth: "100%",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                background: "black",
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- blob: URL from a local File picker; next/image cannot optimise unknown blob: sources
            <img
              src={preview}
              alt="Preview"
              style={{
                maxHeight: "240px",
                maxWidth: "100%",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
              }}
            />
          )}

          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setPreviewType(null);

              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            style={{
              position: "absolute",
              top: "5px",
              right: "5px",
              background: "rgba(0,0,0,0.6)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ×
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        name="image"
        accept="image/*,video/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {state?.error && (
        <div
          style={{
            color: "#b42318",
            background: "var(--danger-soft)",
            padding: "8px 12px",
            borderRadius: "8px",
            marginBottom: "12px",
            fontSize: "0.9rem",
            border: "1px solid #fecdca",
          }}
        >
          {state.error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid var(--border-color-light)",
          paddingTop: "12px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {/* Photo / Video button — styled like CommunityPostComposer */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              minHeight: 38,
              padding: "0 14px",
              border: "1px solid var(--border-color)",
              borderRadius: 999,
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.16s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--french-blue-soft)";
              e.currentTarget.style.color = "var(--french-blue)";
              e.currentTarget.style.borderColor = "var(--french-blue)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-card)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border-color)";
            }}
          >
            <UiIcon name="image" size={18} />
            <span>Photo / Video</span>
          </button>

          {/* Emoji button — styled like CommunityPostComposer */}
          <button
            type="button"
            onClick={() => setShowEmojis((value) => !value)}
            style={{
              minHeight: 38,
              padding: "0 14px",
              border: "1px solid var(--border-color)",
              borderRadius: 999,
              background: showEmojis ? "var(--french-blue-soft)" : "var(--bg-card)",
              color: showEmojis ? "var(--french-blue)" : "var(--text-secondary)",
              borderColor: showEmojis ? "var(--french-blue)" : undefined,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.16s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--french-blue-soft)";
              e.currentTarget.style.color = "var(--french-blue)";
              e.currentTarget.style.borderColor = "var(--french-blue)";
            }}
            onMouseLeave={(e) => {
              if (!showEmojis) {
                e.currentTarget.style.background = "var(--bg-card)";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.borderColor = "var(--border-color)";
              }
            }}
          >
            <UiIcon name="smile" size={18} />
            <span>Emoji</span>
          </button>
        </div>

        {/* Premium emoji picker panel */}
        {showEmojis && (
          <div
            ref={emojiRef}
            style={{
              position: "absolute",
              bottom: "52px",
              left: "0",
              width: "min(380px, calc(100vw - 48px))",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              padding: "0",
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.06)",
              zIndex: 50,
              overflow: "hidden",
            }}
          >
            {/* Picker header */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border-color-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UiIcon name="smile" size={16} color="var(--french-gold)" />
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--french-navy)",
                  }}
                >
                  Emoji
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowEmojis(false)}
                style={{
                  width: 28,
                  height: 28,
                  border: "none",
                  background: "var(--bg-hover)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  transition: "all 0.16s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--danger-soft)";
                  e.currentTarget.style.color = "var(--danger)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <UiIcon name="x" size={14} />
              </button>
            </div>

            {/* Emoji categories */}
            <div style={{ padding: "8px 12px 12px", maxHeight: "280px", overflowY: "auto" }}>
              {EMOJI_CATEGORIES.map((category) => (
                <div key={category.label} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-muted)",
                      padding: "6px 4px 4px",
                    }}
                  >
                    {category.label}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(8, 1fr)",
                      gap: "2px",
                    }}
                  >
                    {category.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setContent((value) => value + emoji)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "1.35rem",
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.12s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--french-blue-soft)";
                          e.currentTarget.style.transform = "scale(1.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}