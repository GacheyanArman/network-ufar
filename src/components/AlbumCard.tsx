"use client";

import Image from "next/image";
import Link from "next/link";
import UiIcon from "./UiIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/i18n";

interface AlbumCardProps {
  id: string;
  title: string;
  description?: string;
  category?: string;
  eventDate?: Date;
  coverPhotoUrl?: string;
  photoCount: number;
  ownerName: string;
  ownerId: string;
  currentUserId?: string;
  onDelete?: (albumId: string) => void;
}

export default function AlbumCard({
  id,
  title,
  description,
  category = "other",
  eventDate,
  coverPhotoUrl,
  photoCount,
  ownerName,
  ownerId,
  currentUserId,
  onDelete,
}: AlbumCardProps) {
  const { language } = useLanguage();
  const t = translations[language].photos;
  const canDelete = currentUserId === ownerId;

  const getCategoryLabel = (cat: string) => {
    const categoryMap: Record<string, keyof typeof t.categories> = {
      events: "events",
      clubs: "clubs",
      student_life: "studentLife",
      sports: "sports",
      academic: "academic",
      parties: "parties",
      erasmus: "erasmus",
      graduation: "graduation",
      freshmen: "freshmen",
      other: "other",
    };
    return t.categories[categoryMap[cat] || "other"];
  };

  return (
    <div className="card" style={{ overflow: "hidden", position: "relative" }}>
      {canDelete && onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            if (confirm(t.messages.confirmDelete)) {
              onDelete(id);
            }
          }}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 10,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(220, 38, 38, 0.9)",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "bold",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(185, 28, 28, 1)";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(220, 38, 38, 0.9)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          ×
        </button>
      )}

      <Link href={`/photos/albums/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
        {/* Cover Photo */}
        <div
          style={{
            width: "100%",
            height: "200px",
            background: coverPhotoUrl
              ? `url(${coverPhotoUrl}) center/cover`
              : "linear-gradient(135deg, var(--french-blue-soft) 0%, var(--french-cream) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {!coverPhotoUrl && (
            <div style={{ color: "var(--french-blue)", opacity: 0.4 }}>
              <UiIcon name="camera" size={48} />
            </div>
          )}

          {/* Category Badge */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(8px)",
              fontSize: "12px",
              fontWeight: "800",
              color: "var(--french-blue)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <UiIcon name="folder" size={14} />
            {getCategoryLabel(category)}
          </div>

          {/* Photo Count */}
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(8px)",
              fontSize: "13px",
              fontWeight: "800",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <UiIcon name="image" size={14} />
            {photoCount}
          </div>
        </div>

        {/* Album Info */}
        <div style={{ padding: "18px" }}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "17px",
              fontWeight: "950",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: "1.3",
            }}
          >
            {title}
          </h3>

          {description && (
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </p>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border-color-light)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: "700" }}>
              <UiIcon name="user" size={14} />
              {ownerName}
            </div>

            {eventDate && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", fontWeight: "700" }}>
                <UiIcon name="calendar" size={13} />
                {new Date(eventDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
