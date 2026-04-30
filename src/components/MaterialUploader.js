"use client";

import { useState, useRef } from "react";
import { uploadMaterial } from "@/app/actions/material";

export default function MaterialUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert("File too large (max 25MB)");
        return;
      }
      setSelectedFile(file);
    }
  };

  return (
    <form 
      className="card"
      style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--border-color-light)' }}
      action={async (formData) => {
        setIsSubmitting(true);
        await uploadMaterial(formData);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsSubmitting(false);
      }}
    >
      <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Add Material or Photo</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input 
          name="title" 
          placeholder="Title (e.g. Math Lecture Photo or PDF)" 
          required 
          style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-main)' }}
        />
        
        <input 
          name="description" 
          placeholder="Description (optional)" 
          style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-main)' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input 
            type="file" 
            name="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            required
          />
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'var(--ufar-blue-soft)', color: 'var(--ufar-blue)', border: 'none', padding: '10px 18px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📎 Attach File or Photo
          </button>

          {selectedFile && (
            <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: '600' }}>
              ✓ {selectedFile.name}
            </span>
          )}
        </div>

        <button 
          type="submit" 
          className="btn-primary-old" 
          disabled={isSubmitting || !selectedFile}
          style={{ marginTop: '8px', alignSelf: 'flex-start' }}
        >
          {isSubmitting ? "Uploading..." : "Publish to Study Section"}
        </button>
      </div>
    </form>
  );
}