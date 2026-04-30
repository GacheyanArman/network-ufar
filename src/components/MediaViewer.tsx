"use client";

import { useEffect } from "react";

type MediaType = "image" | "video";

type MediaViewerProps = {
  src: string;
  type: MediaType;
  alt?: string;
  title?: string;
  onClose: () => void;
};

export default function MediaViewer({
  src,
  type,
  alt = "Media",
  title,
  onClose,
}: MediaViewerProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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
        }}
      >
        ×
      </button>

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