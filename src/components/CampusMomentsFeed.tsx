"use client";

import { useState } from "react";
import Link from "next/link";
import StoriesBar, { StoryAuthorSummary } from "./StoriesBar";
import { translations } from "@/lib/i18n";
import PhotoFeedCard, { PhotoFeedItem } from "./PhotoFeedCard";
import PhotoUploadModal from "./PhotoUploadModal";
import UiIcon from "./UiIcon";
import { createPhotoPost } from "@/app/actions/photo";

interface CampusMomentsFeedProps {
  photos: PhotoFeedItem[];
  storyAuthors: StoryAuthorSummary[];
  hasOwnStory: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  userAlbums: Array<{ id: string; title: string }>;
  isStaff: boolean;
}

export default function CampusMomentsFeed({
  photos,
  storyAuthors,
  hasOwnStory,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  userAlbums,
  isStaff,
}: CampusMomentsFeedProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const lang = typeof window !== "undefined" ? (localStorage.getItem("language") || "en") : "en";
  const es = (translations[lang as keyof typeof translations] || translations.en).emptyStates;

  const handleUpload = async (formData: FormData) => {
    await createPhotoPost(formData);
    setUploadOpen(false);
    // refresh server data
    window.location.reload();
  };

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "0 12px",
      }}
    >
      {/* Top bar with title + upload */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 4px 8px",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 28px)",
              margin: 0,
              fontWeight: 900,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Campus Moments
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            UFAR student life, captured by the community.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/photos/explore" style={navPillStyle}>
            <UiIcon name="grid" size={14} /> Explore
          </Link>
          <Link href="/photos/saved" style={navPillStyle}>
            <UiIcon name="bookmark" size={14} /> Saved
          </Link>
          <Link href="/photos/albums" style={navPillStyle}>
            <UiIcon name="image" size={14} /> Albums
          </Link>
          <button
            onClick={() => setUploadOpen(true)}
            style={{
              ...navPillStyle,
              background: "var(--french-blue, #2c5aa0)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            <UiIcon name="plus" size={14} /> Share moment
          </button>
        </div>
      </div>

      {/* Stories bar */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border-color-light)",
          borderRadius: 16,
          padding: "8px 12px",
          marginBottom: 16,
        }}
      >
        <StoriesBar
          authors={storyAuthors}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          hasOwnStory={hasOwnStory}
        />
      </div>

      {/* Feed */}
      {photos.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px dashed var(--border-color)",
            borderRadius: 16,
            padding: "48px 16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--french-blue-soft, #e8eef9)",
              color: "var(--french-blue, #2c5aa0)",
              margin: "0 auto 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UiIcon name="camera" size={26} />
          </div>
          <h2 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 18 }}>
            {es.photos.noPhotos}
          </h2>
          <p
            style={{
              margin: "0 0 16px",
              color: "var(--text-secondary)",
              fontSize: 14,
            }}
          >
            {es.photos.noPhotosHint}
          </p>
          <button onClick={() => setUploadOpen(true)} style={primaryBtn}>
            {es.photos.uploadPhoto}
          </button>
        </div>
      ) : (
        photos.map((p) => (
          <PhotoFeedCard
            key={p.id}
            photo={p}
            currentUserId={currentUserId}
            canModerate={isStaff}
          />
        ))
      )}

      {uploadOpen && (
        <PhotoUploadModal
          onClose={() => setUploadOpen(false)}
          onUpload={handleUpload}
          albums={userAlbums}
        />
      )}
    </div>
  );
}

const navPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 999,
  background: "#fff",
  border: "1px solid var(--border-color-light)",
  color: "var(--text-primary)",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 13,
};

const primaryBtn: React.CSSProperties = {
  background: "var(--french-blue, #2c5aa0)",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: 10,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};
