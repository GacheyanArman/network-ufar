"use client";

import { useEffect } from "react";

type MediaType = "image" | "video";

type MediaItem = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  mediaType?: MediaType | null;
};

type MediaViewerProps = {
  src: string;
  type: MediaType;
  alt?: string;
  title?: string;
  onClose: () => void;
  items?: MediaItem[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
};

export default function MediaViewer({
  src,
  type,
  alt = "Media",
  title,
  onClose,
  items,
  currentIndex,
  onNavigate,
}: MediaViewerProps) {
  const hasNavigation = items && items.length > 1 && currentIndex !== undefined && onNavigate;
  const canGoPrev = hasNavigation && currentIndex > 0;
  const canGoNext = hasNavigation && currentIndex < items.length - 1;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (hasNavigation && event.key === "ArrowLeft" && canGoPrev) {
        onNavigate(currentIndex - 1);
      }

      if (hasNavigation && event.key === "ArrowRight" && canGoNext) {
        onNavigate(currentIndex + 1);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, hasNavigation, canGoPrev, canGoNext, currentIndex, onNavigate]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || alt}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.92), rgba(0,0,0,0.96))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close media viewer"
        style={{
          position: "fixed",
          top: "18px",
          right: "18px",
          zIndex: 10001,
          width: "42px",
          height: "42px",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.22)",
          background: "rgba(15,23,42,0.72)",
          color: "white",
          fontSize: "26px",
          lineHeight: "38px",
          cursor: "pointer",
          boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(15,23,42,0.9)";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(15,23,42,0.72)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        ×
      </button>

      {canGoPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate!(currentIndex - 1);
          }}
          aria-label="Previous media"
          style={{
            position: "fixed",
            left: "18px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10001,
            width: "48px",
            height: "48px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(15,23,42,0.72)",
            color: "white",
            fontSize: "28px",
            lineHeight: "44px",
            cursor: "pointer",
            boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(15,23,42,0.9)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(15,23,42,0.72)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          ‹
        </button>
      )}

      {canGoNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate!(currentIndex + 1);
          }}
          aria-label="Next media"
          style={{
            position: "fixed",
            right: "18px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10001,
            width: "48px",
            height: "48px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(15,23,42,0.72)",
            color: "white",
            fontSize: "28px",
            lineHeight: "44px",
            cursor: "pointer",
            boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(15,23,42,0.9)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(15,23,42,0.72)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          ›
        </button>
      )}

      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(1180px, 100%)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {title && (
          <div
            style={{
              alignSelf: "flex-start",
              color: "white",
              fontWeight: 800,
              fontSize: "0.95rem",
              textShadow: "0 2px 20px rgba(0,0,0,0.55)",
              maxWidth: "900px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        )}

        {hasNavigation && (
          <div
            style={{
              alignSelf: "flex-start",
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            {currentIndex + 1} / {items.length}
          </div>
        )}

        <div
          style={{
            width: "100%",
            maxHeight: "86vh",
            borderRadius: "22px",
            overflow: "hidden",
            background: "rgba(2,6,23,0.88)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {type === "video" ? (
            <video
              src={src}
              controls
              autoPlay
              playsInline
              style={{
                width: "100%",
                maxHeight: "86vh",
                background: "black",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            <img
              src={src}
              alt={alt}
              style={{
                width: "100%",
                maxHeight: "86vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}