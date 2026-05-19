"use client";

import { useState, useRef } from "react";
import UiIcon from "@/shared/ui/UiIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/shared/i18n/i18n";

interface PhotoUploadModalProps {
  albums: Array<{ id: string; title: string }>;
  eventId?: string;
  onClose: () => void;
  onUpload: (formData: FormData) => Promise<void>;
}

export default function PhotoUploadModal({
  albums,
  eventId,
  onClose,
  onUpload,
}: PhotoUploadModalProps) {
  const { language } = useLanguage();
  const t = translations[language].photos;
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const validFiles = selectedFiles.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPreviews(previews.filter((_, i) => i !== index));
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsSubmitting(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("caption", caption);
        formData.append("location", location);
        formData.append("albumId", albumId);
        if (eventId) formData.append("eventId", eventId);
        formData.append("isPrivate", String(isPrivate));
        await onUpload(formData);
      }
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      alert(t.messages.uploadError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid var(--border-color-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "var(--bg-card)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "var(--french-blue-soft)",
                color: "var(--french-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UiIcon name="upload" size={20} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "950",
                  color: "var(--text-primary)",
                }}
              >
                {t.uploadModal.title}
              </h2>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                }}
              >
                {t.uploadModal.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "none",
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {/* File Input */}
          {previews.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed var(--border-color)",
                borderRadius: "16px",
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: "var(--bg-soft)",
                transition: "all 0.2s ease",
                marginBottom: "24px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--french-blue)";
                e.currentTarget.style.background = "var(--french-blue-soft)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.background = "var(--bg-soft)";
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: "var(--french-blue-soft)",
                  color: "var(--french-blue)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <UiIcon name="camera" size={32} />
              </div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "16px",
                  fontWeight: "800",
                  color: "var(--text-primary)",
                }}
              >
                Нажмите для выбора фото
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                }}
              >
                Поддерживаются JPG, PNG, GIF до 10MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {/* Previews */}
          {previews.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                {previews.map((preview, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from a local File picker; next/image cannot optimise unknown blob: sources */}
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "140px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        border: "1px solid var(--border-color-light)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(220, 38, 38, 0.9)",
                        color: "var(--bg-card)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
                style={{ width: "100%" }}
              >
                <UiIcon name="plus" size={16} />
                Добавить ещё фото
              </button>
            </div>
          )}

          {/* Caption */}
          {previews.length > 0 && (
            <>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "var(--text-primary)",
                  }}
                >
                  Описание
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tell your moment… use #hashtags"
                  maxLength={2200}
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid var(--border-color)",
                    fontSize: "14px",
                    resize: "none",
                  }}
                />
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    textAlign: "right",
                  }}
                >
                  {caption.length}/2200
                </p>
              </div>

              {/* Location */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "var(--text-primary)",
                  }}
                >
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="UFAR campus, library, event venue…"
                  maxLength={120}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "12px",
                    border: "1px solid var(--border-color)",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Album */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "var(--text-primary)",
                  }}
                >
                  Альбом
                </label>
                <select
                  value={albumId}
                  onChange={(e) => setAlbumId(e.target.value)}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "12px",
                    border: "1px solid var(--border-color)",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Без альбома</option>
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Privacy */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color-light)",
                  background: "var(--bg-soft)",
                  cursor: "pointer",
                  marginBottom: "24px",
                }}
              >
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "800",
                      color: "var(--text-primary)",
                      marginBottom: "2px",
                    }}
                  >
                    Приватное фото
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      fontWeight: "600",
                    }}
                  >
                    Только вы сможете видеть это фото
                  </div>
                </div>
                <UiIcon name="eye" size={18} />
              </label>

              {/* Submit */}
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
                style={{ width: "100%" }}
              >
                {isSubmitting ? (
                  <>
                    <UiIcon name="loader" size={18} />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <UiIcon name="upload" size={18} />
                    Загрузить{" "}
                    {files.length > 1 ? `${files.length} фото` : "фото"}
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
