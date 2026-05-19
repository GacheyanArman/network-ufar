"use client";

import { useState } from "react";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import PhotoCard from "@/features/photos/components/PhotoCard";
import MediaViewer from "@/features/photos/components/MediaViewer";
import PhotoUploadModal from "@/features/photos/components/PhotoUploadModal";
import { uploadPhoto } from "@/features/photos/server/actions";

interface Album {
  id: string;
  title: string;
  description?: string;
  category?: string;
  eventDate?: Date;
  coverPhotoUrl?: string;
  isPrivate: boolean;
  ownerName: string;
  ownerId: string;
  createdAt: Date;
}

interface Photo {
  id: string;
  imageUrl: string;
  caption?: string;
  isPrivate: boolean;
  viewCount: number;
  ownerName: string;
  ownerId: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

interface AlbumPageClientProps {
  album: Album;
  photos: Photo[];
  currentUserId: string;
}

const categoryLabels: Record<string, string> = {
  events: "События",
  clubs: "Клубы",
  student_life: "Студенческая жизнь",
  sports: "Спорт",
  academic: "Учёба",
  parties: "Вечеринки",
  erasmus: "Erasmus",
  graduation: "Выпускной",
  freshmen: "Первокурсники",
  other: "Другое",
};

const tabs = [
  { id: "all", label: "Все фото", icon: "grid" },
  { id: "recent", label: "Недавние", icon: "clock" },
  { id: "popular", label: "Популярные", icon: "heart" },
];

export default function AlbumPageClient({ album, photos, currentUserId }: AlbumPageClientProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const isOwner = album.ownerId === currentUserId;

  const handleUpload = async (formData: FormData) => {
    formData.set("albumId", album.id);
    await uploadPhoto(formData);
    window.location.reload();
  };

  // Sort photos based on active tab
  const sortedPhotos = [...photos].sort((a, b) => {
    if (activeTab === "recent") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (activeTab === "popular") {
      return b.likesCount - a.likesCount;
    }
    return 0;
  });

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Back Button */}
        <Link
          href="/photos"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: "800",
            color: "var(--french-blue)",
            textDecoration: "none",
            width: "fit-content",
          }}
        >
          <UiIcon name="arrow-left" size={16} />
          Назад к фото
        </Link>

        {/* Album Header */}
        <div className="card" style={{ overflow: "hidden" }}>
          {/* Cover Image */}
          <div
            style={{
              width: "100%",
              height: "280px",
              background: album.coverPhotoUrl
                ? `url(${album.coverPhotoUrl}) center/cover`
                : "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!album.coverPhotoUrl && (
              <div style={{ color: "rgba(255, 255, 255, 0.3)" }}>
                <UiIcon name="camera" size={64} />
              </div>
            )}

            {/* Category Badge */}
            {album.category && (
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  left: "20px",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(8px)",
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "var(--french-blue)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
              >
                <UiIcon name="folder" size={16} />
                {categoryLabels[album.category] || album.category}
              </div>
            )}

            {/* Privacy Badge */}
            {album.isPrivate && (
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(0, 0, 0, 0.8)",
                  backdropFilter: "blur(8px)",
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "var(--bg-card)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <UiIcon name="eye" size={16} />
                Приватный
              </div>
            )}
          </div>

          {/* Album Info */}
          <div style={{ padding: "32px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "24px",
                marginBottom: "20px",
              }}
            >
              <div style={{ flex: 1 }}>
                <h1
                  style={{
                    margin: "0 0 12px",
                    fontSize: "32px",
                    fontWeight: "950",
                    color: "var(--text-primary)",
                    letterSpacing: "-0.04em",
                    lineHeight: "1.2",
                  }}
                >
                  {album.title}
                </h1>

                {album.description && (
                  <p
                    style={{
                      margin: "0 0 16px",
                      fontSize: "16px",
                      color: "var(--text-secondary)",
                      lineHeight: "1.6",
                    }}
                  >
                    {album.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "24px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "700" }}>
                    <UiIcon name="user" size={16} />
                    {album.ownerName}
                  </div>

                  {album.eventDate && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "700" }}>
                      <UiIcon name="calendar" size={16} />
                      {new Date(album.eventDate).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "700" }}>
                    <UiIcon name="image" size={16} />
                    {photos.length} {photos.length === 1 ? "фото" : "фото"}
                  </div>
                </div>
              </div>

              {isOwner && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary"
                  style={{ whiteSpace: "nowrap" }}
                >
                  <UiIcon name="upload" size={18} />
                  Добавить фото
                </button>
              )}
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                borderBottom: "2px solid var(--border-color-light)",
                marginTop: "24px",
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    height: "48px",
                    padding: "0 20px",
                    border: "none",
                    borderBottom: `3px solid ${activeTab === tab.id ? "var(--french-blue)" : "transparent"}`,
                    background: "transparent",
                    color: activeTab === tab.id ? "var(--french-blue)" : "var(--text-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "15px",
                    fontWeight: "850",
                    transition: "all 0.2s ease",
                    marginBottom: "-2px",
                  }}
                >
                  <UiIcon name={tab.icon as any} size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        {sortedPhotos.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "80px 40px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: "var(--french-blue-soft)",
                color: "var(--french-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <UiIcon name="image" size={40} />
            </div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "20px",
                fontWeight: "950",
                color: "var(--text-primary)",
              }}
            >
              В этом альбоме пока нет фото
            </h3>
            <p
              style={{
                margin: "0 auto 24px",
                maxWidth: "400px",
                fontSize: "15px",
                color: "var(--text-secondary)",
                lineHeight: "1.6",
              }}
            >
              {isOwner ? "Загрузите первое фото в этот альбом" : "Фото появятся здесь, когда владелец их добавит"}
            </p>
            {isOwner && (
              <button onClick={() => setShowUploadModal(true)} className="btn-primary">
                <UiIcon name="upload" size={18} />
                Загрузить фото
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {sortedPhotos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                {...photo}
                currentUserId={currentUserId}
                onClick={() => setSelectedPhotoIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <PhotoUploadModal
          albums={[{ id: album.id, title: album.title }]}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}

      {/* Media Viewer */}
      {/* Media Viewer */}
      {selectedPhotoIndex !== null && sortedPhotos[selectedPhotoIndex] && (
        <MediaViewer
          src={sortedPhotos[selectedPhotoIndex].imageUrl}
          type="image"
          alt={sortedPhotos[selectedPhotoIndex].caption || "Photo"}
          title={sortedPhotos[selectedPhotoIndex].caption || undefined}
          caption={sortedPhotos[selectedPhotoIndex].caption || null}
          authorName={sortedPhotos[selectedPhotoIndex].ownerName}
          createdAt={sortedPhotos[selectedPhotoIndex].createdAt}
          likesCount={sortedPhotos[selectedPhotoIndex].likesCount ?? 0}
          commentsCount={sortedPhotos[selectedPhotoIndex].commentsCount ?? 0}
          viewsCount={sortedPhotos[selectedPhotoIndex].viewCount ?? 0}
          isLiked={sortedPhotos[selectedPhotoIndex].isLiked}
          isSaved={sortedPhotos[selectedPhotoIndex].isSaved}
          photoId={sortedPhotos[selectedPhotoIndex].id}
          currentUserId={currentUserId}
          onCloseAction={() => setSelectedPhotoIndex(null)}
          items={sortedPhotos}
          currentIndex={selectedPhotoIndex}
          onNavigateAction={(index) => setSelectedPhotoIndex(index)}
        />
      )}
    </>
  );
}
