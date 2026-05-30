"use client";

import { useState, useRef } from "react";
import { uploadPhoto } from "@/features/photos/server/actions";

export default function PhotoUploader({ albums }) {
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { 
        alert("File too large (max 10MB)");
        return;
      }
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
      <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Upload New Photo</h2>
      
      <form 
        action={async (formData) => {
          setIsSubmitting(true);
          formData.append("isPrivate", isPrivate); 
          await uploadPhoto(formData);
          setPreview(null);
          setIsPrivate(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setIsSubmitting(false);
        }}
      >
        {!preview && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-main)', color: 'var(--text-secondary)', fontWeight: 'bold' }}
          >
            📸 Click here to select a photo from your device
          </div>
        )}

        <input 
          type="file" 
          name="image" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
        />

        {preview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative', width: 'fit-content' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from a local File picker; next/image cannot optimise unknown blob: sources */}
              <img src={preview} alt="Upload preview" style={{ maxHeight: '300px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
              <button 
                type="button" 
                onClick={() => { setPreview(null); fileInputRef.current.value = ""; }}
                style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ×
              </button>
            </div>

            <input 
              name="caption" 
              placeholder="Add a caption..." 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }} 
            />

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select name="albumId" style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}>
                <option value="">No album</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>{album.title}</option>
                ))}
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                <input 
                  type="checkbox" 
                  checked={isPrivate} 
                  onChange={(e) => setIsPrivate(e.target.checked)} 
                  style={{ width: '18px', height: '18px' }}
                />
                🔒 Private (Only me)
              </label>

              <button type="submit" className="btn-primary-old" disabled={isSubmitting} style={{ marginLeft: 'auto' }}>
                {isSubmitting ? "Uploading..." : "Upload Photo"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}