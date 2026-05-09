"use client";

import { useState } from "react";
import MediaViewer from "@/components/MediaViewer";

export default function PhotoGallery({ photos, currentUserId }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (photos.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', padding: '20px' }}>You haven't uploaded any photos yet.</p>;
  }

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <>
      <div className="old-grid" style={{ padding: '16px' }}>
        {photos.map((photo, index) => (
          <div
            className="card old-tile"
            key={photo.id}
            style={{ padding: '8px', position: 'relative', cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => setSelectedIndex(index)}
            title="Click to view"
          >
            <img
              src={photo.imageUrl}
              alt={photo.caption || "Gallery photo"}
              style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px' }}
            />
            {photo.isPrivate && (
              <span style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                🔒
              </span>
            )}
            {photo.caption && (
              <p style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>{photo.caption}</p>
            )}
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <MediaViewer
          src={selectedPhoto.imageUrl}
          type="image"
          alt={selectedPhoto.caption || "Gallery photo"}
          title={selectedPhoto.caption || undefined}
          photoId={selectedPhoto.id}
          currentUserId={currentUserId}
          likesCount={selectedPhoto.likesCount}
          commentsCount={selectedPhoto.commentsCount}
          isLiked={selectedPhoto.isLiked}
          isSaved={selectedPhoto.isSaved}
          authorName={selectedPhoto.ownerName}
          onClose={() => setSelectedIndex(null)}
          items={photos}
          currentIndex={selectedIndex}
          onNavigate={setSelectedIndex}
        />
      )}
    </>
  );
}