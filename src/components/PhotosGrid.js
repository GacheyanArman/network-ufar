"use client";

import { useState } from "react";
import MediaViewer from "@/components/MediaViewer";
import { deletePhoto } from "@/app/actions/photo";

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
            <img
              src={photo.imageUrl}
              alt={photo.caption || "Photo"}
              style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border-color-light)', cursor: 'pointer' }}
              onClick={() => setSelectedIndex(index)}
            />
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
          onClose={() => setSelectedIndex(null)}
          items={photos}
          currentIndex={selectedIndex}
          onNavigate={setSelectedIndex}
        />
      )}
    </>
  );
}
