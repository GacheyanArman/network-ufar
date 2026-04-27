"use client";

import { useState } from "react";

export default function PhotoGallery({ photos }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (photos.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', padding: '20px' }}>You haven't uploaded any photos yet.</p>;
  }

  return (
    <>
      <div className="old-grid" style={{ padding: '16px' }}>
        {photos.map((photo) => (
          <div 
            className="card old-tile" 
            key={photo.id} 
            style={{ padding: '8px', position: 'relative', cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => setSelectedPhoto(photo)} 
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
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            backdropFilter: 'blur(5px)' 
          }}
          onClick={() => setSelectedPhoto(null)} 
        >
          <div 
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()} 
          >
            <img 
              src={selectedPhoto.imageUrl} 
              alt="Enlarged" 
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
            />
            
            <button 
              onClick={() => setSelectedPhoto(null)}
              style={{ position: 'absolute', top: '-40px', right: '-10px', background: 'none', border: 'none', color: 'white', fontSize: '2.5rem', cursor: 'pointer', lineHeight: 1 }}
            >
              &times;
            </button>

            {selectedPhoto.caption && (
              <p style={{ color: 'white', textAlign: 'center', marginTop: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                {selectedPhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}