"use client";

import { useState } from "react";
import Link from "next/link";
import UiIcon from "./UiIcon";
import AlbumCard from "./AlbumCard";
import PhotoCard from "./PhotoCard";
import PhotoUploadModal from "./PhotoUploadModal";
import CreateAlbumModal from "./CreateAlbumModal";
import MediaViewer from "./MediaViewer";
import { uploadPhoto } from "@/app/actions/photo";
import { createPhotoAlbum, deletePhotoAlbum } from "@/app/actions/photo";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/i18n";

interface Album {
  id: string;
  title: string;
  description?: string;
  category?: string;
  eventDate?: Date;
  coverPhotoUrl?: string;
  photoCount: number;
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

interface PhotosPageClientProps {
  featuredAlbums: Album[];
  recentPhotos: Photo[];
  allAlbums: Album[];
  userAlbums: Array<{ id: string; title: string }>;
  currentUserId: string;
  userStats: {
    uploaded: number;
    liked: number;
    saved: number;
  };
}

const categories = [
  { value: "all", label: "all", icon: "grid" },
  { value: "events", label: "events", icon: "calendar" },
  { value: "clubs", label: "clubs", icon: "users" },
  { value: "student_life", label: "studentLife", icon: "heart" },
  { value: "sports", label: "sports", icon: "heart" },
  { value: "academic", label: "academic", icon: "graduation" },
  { value: "parties", label: "parties", icon: "heart" },
  { value: "erasmus", label: "erasmus", icon: "heart" },
  { value: "graduation", label: "graduation", icon: "graduation" },
  { value: "freshmen", label: "freshmen", icon: "users" },
];

export default function PhotosPageClient({
  featuredAlbums,
  recentPhotos,
  allAlbums,
  userAlbums,
  currentUserId,
  userStats,
}: PhotosPageClientProps) {
  const { language } = useLanguage();
  const t = translations[language].photos;
  const tCommon = translations[language].common;
  const es = (translations[language] || translations.en).emptyStates;
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const handleUpload = async (formData: FormData) => {
    await uploadPhoto(formData);
    window.location.reload();
  };

  const handleCreateAlbum = async (formData: FormData) => {
    await createPhotoAlbum(formData);
    window.location.reload();
  };

  const handleDeleteAlbum = async (albumId: string) => {
    const formData = new FormData();
    formData.append("albumId", albumId);
    await deletePhotoAlbum(formData);
    window.location.reload();
  };

  const filteredAlbums = allAlbums.filter((album) => {
    const matchesSearch = searchQuery
      ? album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory === "all" || album.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Header */}
        <div className="card" style={{ padding: "32px" }}>
          <div style={{ marginBottom: "24px" }}>
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "32px",
                fontWeight: "950",
                color: "var(--text-primary)",
                letterSpacing: "-0.04em",
              }}
            >
              {t.title}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "16px",
                color: "var(--text-secondary)",
                fontWeight: "600",
                lineHeight: "1.5",
              }}
            >
              {t.description}
            </p>
          </div>

          {/* Search & Actions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              >
                <UiIcon name="search" size={18} />
              </div>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  height: "48px",
                  padding: "0 16px 0 48px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  fontSize: "15px",
                  fontWeight: "600",
                }}
              />
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary"
              style={{ height: "48px", whiteSpace: "nowrap" }}
            >
              <UiIcon name="upload" size={18} />
              {t.uploadPhoto}
            </button>

            <button
              onClick={() => setShowCreateAlbumModal(true)}
              className="btn-secondary"
              style={{ height: "48px", whiteSpace: "nowrap" }}
            >
              <UiIcon name="plus" size={18} />
              {t.createAlbum}
            </button>
          </div>
        </div>

        {/* Featured Albums */}
        {featuredAlbums.length > 0 && (
          <div>
            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: "950",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.03em",
                }}
              >
                {t.featuredAlbums}
              </h2>
              <Link
                href="/photos/albums"
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "var(--french-blue)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {t.viewAllAlbums}
                <UiIcon name="arrow-right" size={16} />
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "20px",
              }}
            >
              {featuredAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  {...album}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteAlbum}
                />
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                style={{
                  height: "40px",
                  padding: "0 18px",
                  borderRadius: "10px",
                  border: `2px solid ${selectedCategory === cat.value ? "var(--french-blue)" : "var(--border-color-light)"}`,
                  background: selectedCategory === cat.value ? "var(--french-blue-soft)" : "#ffffff",
                  color: selectedCategory === cat.value ? "var(--french-blue)" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "800",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                <UiIcon name={cat.icon as any} size={16} />
                {t.categories[cat.label as keyof typeof t.categories]}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* My Photos Stats */}
            <div className="card" style={{ padding: "20px" }}>
              <h3
                style={{
                  margin: "0 0 16px",
                  fontSize: "16px",
                  fontWeight: "950",
                  color: "var(--text-primary)",
                }}
              >
                {t.myPhotos}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Link
                  href="/photos/my-uploads"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    borderRadius: "10px",
                    background: "var(--bg-soft)",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "var(--french-blue-soft)",
                        color: "var(--french-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <UiIcon name="upload" size={16} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "800" }}>{t.uploaded}</span>
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: "950", color: "var(--french-blue)" }}>
                    {userStats.uploaded}
                  </span>
                </Link>

                <Link
                  href="/photos/liked"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    borderRadius: "10px",
                    background: "var(--bg-soft)",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "#fff1f2",
                        color: "#f43f5e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <UiIcon name="heart" size={16} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "800" }}>{t.liked}</span>
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: "950", color: "#f43f5e" }}>
                    {userStats.liked}
                  </span>
                </Link>

                <Link
                  href="/photos/saved"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    borderRadius: "10px",
                    background: "var(--bg-soft)",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "var(--french-gold-soft)",
                        color: "var(--french-gold)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <UiIcon name="bookmark" size={16} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "800" }}>{t.saved}</span>
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: "950", color: "var(--french-gold)" }}>
                    {userStats.saved}
                  </span>
                </Link>
              </div>
            </div>

            {/* Privacy Notice */}
            <div
              className="card"
              style={{
                padding: "18px",
                background: "linear-gradient(135deg, var(--french-blue-soft) 0%, var(--french-cream) 100%)",
                border: "1px solid var(--french-blue-line)",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--french-blue)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                }}
              >
                <UiIcon name="eye" size={18} />
              </div>
              <h4
                style={{
                  margin: "0 0 6px",
                  fontSize: "14px",
                  fontWeight: "900",
                  color: "var(--french-navy)",
                }}
              >
                {t.ufarOnly}
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                  lineHeight: "1.5",
                }}
              >
                All photos are visible only to verified UFAR students. Your memories are safe.
              </p>
            </div>
          </div>

          {/* Recent Photos */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: "950",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.03em",
                }}
              >
                {t.recentPhotos}
              </h2>
            </div>

            {recentPhotos.length === 0 ? (
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
                  <UiIcon name="camera" size={40} />
                </div>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: "20px",
                    fontWeight: "950",
                    color: "var(--text-primary)",
                  }}
                >
                  {es.photos.noPhotos}
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
                  {es.photos.noPhotosHint}
                </p>
                <button onClick={() => setShowUploadModal(true)} className="btn-primary">
                  <UiIcon name="upload" size={18} />
                  {es.photos.uploadPhoto}
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "20px",
                }}
              >
                {recentPhotos.map((photo, index) => (
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
        </div>

        {/* All Albums Section */}
        {filteredAlbums.length > 0 && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: "950",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.03em",
                }}
              >
                {selectedCategory === "all" ? t.allAlbums : `${t.categories[categories.find((c) => c.value === selectedCategory)?.label as keyof typeof t.categories]}`}
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              {filteredAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  {...album}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteAlbum}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showUploadModal && (
        <PhotoUploadModal albums={userAlbums} onClose={() => setShowUploadModal(false)} onUpload={handleUpload} />
      )}

      {showCreateAlbumModal && (
        <CreateAlbumModal onClose={() => setShowCreateAlbumModal(false)} onCreate={handleCreateAlbum} />
      )}

      {/* Media Viewer */}
      {selectedPhotoIndex !== null && (
        <MediaViewer
          src={recentPhotos[selectedPhotoIndex].imageUrl}
          type="image"
          alt={recentPhotos[selectedPhotoIndex].caption || "Photo"}
          title={recentPhotos[selectedPhotoIndex].caption}
          photoId={recentPhotos[selectedPhotoIndex].id}
          currentUserId={currentUserId}
          likesCount={recentPhotos[selectedPhotoIndex].likesCount}
          commentsCount={recentPhotos[selectedPhotoIndex].commentsCount}
          isLiked={recentPhotos[selectedPhotoIndex].isLiked}
          isSaved={recentPhotos[selectedPhotoIndex].isSaved}
          viewsCount={recentPhotos[selectedPhotoIndex].viewCount}
          authorName={recentPhotos[selectedPhotoIndex].ownerName}
          onClose={() => setSelectedPhotoIndex(null)}
          items={recentPhotos}
          currentIndex={selectedPhotoIndex}
          onNavigate={setSelectedPhotoIndex}
        />
      )}
    </>
  );
}
