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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const [content, setContent] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<MediaType | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const [state, formAction, isPending] = useActionState(
    createPost,
    initialState
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset form on success
  const stateOk = Boolean(state?.ok);
  const [prevStateOk, setPrevStateOk] = useState(stateOk);
  if (prevStateOk !== stateOk) {
    setPrevStateOk(stateOk);
    if (stateOk) {
      setContent("");
      setPreview(null);
      setPreviewType(null);
      setIsExpanded(false);
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
      return;
    }

    const maxSize = isVideo ? 80 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(isVideo ? "Video is too large (max 80MB)" : "Image is too large (max 5MB)");
      event.target.value = "";
      return;
    }

    setPreview(URL.createObjectURL(file));
    setPreviewType(isVideo ? "video" : "image");
    setIsExpanded(true);
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

  const firstName = currentUser?.fullName?.split(" ")[0] || "";

  // Collapsed state — simple click-to-expand prompt
  if (!isExpanded && !content && !preview) {
    return (
      <div className="composer-collapsed">
        <button
          type="button"
          className="composer-prompt"
          onClick={() => {
            setIsExpanded(true);
            setTimeout(() => textareaRef.current?.focus(), 50);
          }}
        >
          <span className="composer-prompt-icon">
            <UiIcon name="message-circle" size={18} />
          </span>
          <span className="composer-prompt-text">
            {t("feed.askQuestion") || `Ask a question or share something, ${firstName}...`}
          </span>
        </button>
      </div>
    );
  }

  // Expanded state — full composer
  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="composer-expanded"
    >
      <textarea
        ref={textareaRef}
        name="content"
        value={content}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
        placeholder={t("feed.composerPlaceholder") || "What would you like to ask or share?"}
        maxLength={3000}
        className="composer-textarea"
        autoFocus
      />

      {preview && (
        <div className="composer-preview">
          {previewType === "video" ? (
            <video src={preview} controls muted playsInline className="composer-preview-media" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="composer-preview-media" />
          )}
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setPreviewType(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="composer-preview-remove"
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
        <div className="composer-error">
          {state.error}
        </div>
      )}

      <div className="composer-actions">
        <div className="composer-tools">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="composer-tool-btn"
            title={t("feed.addPhoto") || "Add photo/video"}
          >
            <UiIcon name="image" size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              setContent("");
              setPreview(null);
              setPreviewType(null);
              setIsExpanded(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="composer-tool-btn"
            title={t("common.cancel") || "Cancel"}
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        <button
          type="submit"
          className="composer-submit"
          disabled={isPending || (!content.trim() && !preview)}
        >
          {isPending
            ? (t("feed.posting") || "Posting...")
            : (t("feed.post") || "Post")}
        </button>
      </div>
    </form>
  );
}