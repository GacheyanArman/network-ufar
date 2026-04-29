"use client";

import { useRef, useState, useTransition } from "react";
import { createPost } from "@/app/actions/post";

const EMOJIS = ["😂", "❤️", "🔥", "👍", "😭", "🙏", "😎", "🤔", "🎉", "💯", "👀", "✨", "🎓", "💻"];

export default function PostComposer({ currentUser, onOptimisticPost }) {
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setPreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large (max 5MB)");
      event.target.value = "";
      return;
    }

    setPreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setContent("");
    setPreview(null);
    setShowEmojis(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    formRef.current?.reset();
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        const optimisticContent = String(formData.get("content") || "").trim();

        if (onOptimisticPost && (optimisticContent || preview)) {
          onOptimisticPost({
            id: `temp-${Date.now()}`,
            content: optimisticContent,
            imageUrl: preview,
            createdAt: new Date().toISOString(),
            authorId: currentUser?.id || "me",
            authorName: currentUser?.fullName || "You",
            authorFaculty: currentUser?.faculty || "Student",
            likesCount: 0,
            commentsCount: 0,
            likedByMe: false,
            comments: [],
            isOptimistic: true,
          });
        }

        startTransition(async () => {
          try {
            await createPost(formData);
            resetForm();
          } catch (error) {
            alert(error.message || "Failed to create post");
          }
        });
      }}
      className="card old-composer"
      style={{ padding: "16px", marginBottom: "16px" }}
    >
      <textarea
        name="content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
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
        <div style={{ position: "relative", marginTop: "10px", marginBottom: "10px", width: "fit-content" }}>
          <img src={preview} alt="Preview" style={{ maxHeight: "200px", borderRadius: "12px", border: "1px solid var(--border-color)" }} />
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            style={{ position: "absolute", top: "5px", right: "5px", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontWeight: "bold" }}
            title="Remove photo"
          >
            ×
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        name="image"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color-light)", paddingTop: "12px", position: "relative" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontWeight: "600" }}>
            🖼️ Photo
          </button>

          <button type="button" onClick={() => setShowEmojis((value) => !value)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontWeight: "600" }}>
            😊 Emoji
          </button>
        </div>

        {showEmojis && (
          <div style={{ position: "absolute", bottom: "48px", left: "0", background: "white", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "10px", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "6px", boxShadow: "var(--shadow-sm)", zIndex: 20 }}>
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setContent((value) => value + emoji)}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "1.2rem" }}
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
