"use client";

import Image from "next/image";
import { useState } from "react";
import UiIcon from "./UiIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/i18n";

interface PhotoCardProps {
  id: string;
  imageUrl: string;
  caption?: string;
  ownerName: string;
  ownerId: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  viewCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isPrivate: boolean;
  currentUserId?: string;
  onLike?: (photoId: string) => void;
  onSave?: (photoId: string) => void;
  onComment?: (photoId: string) => void;
  onReport?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  onClick?: () => void;
}

export default function PhotoCard({
  id,
  imageUrl,
  caption,
  ownerName,
  ownerId,
  createdAt,
  likesCount,
  commentsCount,
  viewCount,
  isLiked,
  isSaved,
  isPrivate,
  currentUserId,
  onLike,
  onSave,
  onComment,
  onReport,
  onDelete,
  onClick,
}: PhotoCardProps) {
  const { language } = useLanguage();
  const t = translations[language].photos;
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);
  const [likes, setLikes] = useState(likesCount);
  const [showActions, setShowActions] = useState(false);

  const canDelete = currentUserId === ownerId;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
    onLike?.(id);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(!saved);
    onSave?.(id);
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComment?.(id);
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReport?.(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t.messages.confirmDelete)) {
      onDelete?.(id);
    }
  };

  return (
    <div
      className="card"
      style={{
        overflow: "hidden",
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.3s var(--transition-smooth)",
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Image */}
      <div
        onClick={onClick}
        style={{
          width: "100%",
          height: "280px",
          background: `url(${imageUrl}) center/cover`,
          position: "relative",
        }}
      >
        {/* Private Badge */}
        {isPrivate && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              padding: "6px 10px",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(8px)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <UiIcon name="eye" size={13} />
            {t.photoCard.private}
          </div>
        )}

        {/* Quick Actions Overlay */}
        {showActions && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              display: "flex",
              gap: "8px",
            }}
          >
            {canDelete && (
              <button
                onClick={handleDelete}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(220, 38, 38, 0.9)",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                }}
              >
                <UiIcon name="trash" size={16} />
              </button>
            )}
            {!canDelete && (
              <button
                onClick={handleReport}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(0, 0, 0, 0.7)",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                }}
              >
                <UiIcon name="flag" size={16} />
              </button>
            )}
          </div>
        )}

        {/* View Count */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            padding: "6px 10px",
            borderRadius: "8px",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <UiIcon name="eye" size={13} />
          {viewCount}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "16px" }}>
        {/* Caption */}
        {caption && (
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              color: "var(--text-primary)",
              lineHeight: "1.5",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {caption}
          </p>
        )}

        {/* Owner & Date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border-color-light)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: "700" }}>
            <UiIcon name="user" size={14} />
            {ownerName}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
            {new Date(createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
          }}
        >
          {/* Like */}
          <button
            onClick={handleLike}
            style={{
              height: "38px",
              border: "1px solid var(--border-color-light)",
              borderRadius: "10px",
              background: liked ? "var(--french-blue-soft)" : "#ffffff",
              color: liked ? "var(--french-blue)" : "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: "800",
              transition: "all 0.2s ease",
            }}
          >
            <UiIcon name="heart" size={16} />
            {likes}
          </button>

          {/* Comment */}
          <button
            onClick={handleComment}
            style={{
              height: "38px",
              border: "1px solid var(--border-color-light)",
              borderRadius: "10px",
              background: "#ffffff",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: "800",
              transition: "all 0.2s ease",
            }}
          >
            <UiIcon name="comment" size={16} />
            {commentsCount}
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            style={{
              height: "38px",
              border: "1px solid var(--border-color-light)",
              borderRadius: "10px",
              background: saved ? "var(--french-gold-soft)" : "#ffffff",
              color: saved ? "var(--french-gold)" : "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: "800",
              transition: "all 0.2s ease",
            }}
          >
            <UiIcon name="bookmark" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
