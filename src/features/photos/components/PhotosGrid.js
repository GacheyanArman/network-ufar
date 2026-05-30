"use client";

import { useState } from "react";
import Image from "next/image";
import MediaViewer from "@/features/photos/components/MediaViewer";
import { deletePhoto } from "@/features/photos/server/actions";

export default function PhotosGrid({ photos, currentUserId }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <>
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {photos.map((photo, index) => (
          <div key={photo.id} style={{ position: 'relative' }}>
            {photo.ownerId === currentUserId && (
              <form action={deletePhoto} style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 10 }}>
                <input type="hidden" name="photoId" value={photo.id} />
                <button type="submit" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>×</button>
              </form>
            )}
            {photo.isPrivate && (
              <span style={{ position: 'absolute', top: '5px', left: '5px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>🔒</span>
            )}
            <div
              style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '10px', border: '1px solid var(--border-color-light)', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => setSelectedIndex(index)}
            >
              <Image
                src={photo.thumbnailUrl || photo.imageUrl}
                alt={photo.caption || "Photo"}
                fill
                loading="lazy"
                style={{ objectFit: 'cover' }}
              />
            </div>
            <strong style={{ display: 'block', marginTop: '8px', fontSize: '0.9rem' }}>{photo.caption || "Untitled"}</strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>by {photo.ownerName}</p>
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <MediaViewer
          src={selectedPhoto.imageUrl}
          type="image"
          alt={selectedPhoto.caption || "Photo"}
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
