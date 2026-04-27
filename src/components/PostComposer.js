"use client";

import { useState, useRef } from "react";
import { createPost } from "@/app/actions/post";

const EMOJIS = ["😂", "❤️", "🔥", "👍", "😭", "🙏", "😎", "🤔", "🎉", "💀", "💯", "👀", "✨", "🥲", "🎓", "💻"];

export default function PostComposer() {
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false); 

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large (max 5MB)");
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const addEmoji = (emoji) => {
    setContent((prev) => prev + emoji);
  };

  return (
    <form 
      action={async (formData) => {
        setIsSubmitting(true);
        await createPost(formData);

        setContent("");
        setPreview(null);
        setShowEmojis(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        setIsSubmitting(false);
      }} 
      className="card"
      style={{ padding: '16px', marginBottom: '16px' }}
    >
      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's new?"
        style={{
          width: '100%',
          minHeight: '80px',
          border: 'none',
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: '1.05rem',
          background: 'transparent'
        }}
      />

      {preview && (
        <div style={{ position: 'relative', marginTop: '10px', marginBottom: '10px', width: 'fit-content' }}>
          <img src={preview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
          <button 
            type="button" 
            onClick={() => { setPreview(null); fileInputRef.current.value = ""; }}
            style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
            title="Remove photo"
          >
            ×
          </button>
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

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color-light)', margin: '12px 0' }} />

      {showEmojis && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px', marginBottom: '12px', border: '1px solid var(--border-color-light)' }}>
          {EMOJIS.map(emoji => (
            <button 
              type="button" 
              key={emoji} 
              onClick={() => addEmoji(emoji)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', padding: '4px', borderRadius: '8px' }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--ufar-blue)', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            📷 Photo
          </button>
          
          <button 
            type="button" 
            onClick={() => setShowEmojis(!showEmojis)} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            😀 Emoji
          </button>
        </div>

        <button type="submit" className="btn-primary-old" disabled={isSubmitting || (!content && !preview)}>
          {isSubmitting ? "Posting..." : "Share"}
        </button>
      </div>
    </form>
  );
}