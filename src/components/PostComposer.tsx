"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createPost, type CreatePostState } from "@/app/actions/post";

const EMOJIS = [
  "😂",
  "❤️",
  "🔥",
  "👍",
  "😭",
  "🙏",
  "😎",
  "🤔",
  "🎉",
  "💯",
  "👀",
  "✨",
  "🎓",
  "💻",
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

  useEffect(() => {
    if (state?.ok) {
      resetForm();
    }
  }, [state]);

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

  function resetForm() {
    setContent("");
    setPreview(null);
    setPreviewType(null);
    setShowEmojis(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    formRef.current?.reset();
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
            background: "#fef3f2",
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
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontWeight: "600",
            }}
          >
            🖼️ Photo / Video
          </button>

          <button
            type="button"
            onClick={() => setShowEmojis((value) => !value)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontWeight: "600",
            }}
          >
            😊 Emoji
          </button>
        </div>

        {showEmojis && (
          <div
            style={{
              position: "absolute",
              bottom: "48px",
              left: "0",
              background: "white",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "10px",
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: "6px",
              boxShadow: "var(--shadow-sm)",
              zIndex: 20,
            }}
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setContent((value) => value + emoji)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}