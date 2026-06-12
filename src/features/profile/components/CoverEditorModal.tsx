"use client";

import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import UiIcon from "@/shared/ui/UiIcon";
import "./CoverEditorModal.css";

const PRESET_COLORS = [
  "#2c5aa0", // French Blue
  "#1e3a5f", // French Navy
  "#e8b4b8", // French Rose
  "#9b9fce", // French Lavender
  "#059669", // Success Green
  "#f59e0b", // Warning Orange
  "#7c3aed", // Purple
  "#333333", // Dark Gray
];

type CoverEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialImageFile?: File | null;
  onApply: (file: File, previewUrl: string) => void;
};

type CoverTab = "image" | "color";

export default function CoverEditorModal({
  isOpen,
  onClose,
  initialImageFile,
  onApply,
}: CoverEditorModalProps) {
  const [activeTab, setActiveTab] = useState<CoverTab>(initialImageFile ? "image" : "color");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  
  // Image crop state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialImageFile) {
      const url = URL.createObjectURL(initialImageFile);
      setImageSrc(url);
      setActiveTab("image");
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return () => URL.revokeObjectURL(url);
    }
  }, [initialImageFile]);

  if (!isOpen) return null;

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const generateColorBlob = async (color: string): Promise<File> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not generate cover image"));
          return;
        }
        resolve(new File([blob], "cover_color.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.9);
    });
  };

  const generateImageBlob = async (): Promise<File | null> => {
    if (!imageRef.current || !containerRef.current) return null;
    
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const img = imageRef.current;
    const container = containerRef.current;
    
    // Scale from DOM to Canvas (Canvas is 1200x400)
    const scaleX = 1200 / container.clientWidth;
    const scaleY = 400 / container.clientHeight;

    const imgDrawWidth = img.clientWidth * zoom * scaleX;
    const imgDrawHeight = img.clientHeight * zoom * scaleY;
    
    // Center initially, then add offset
    const dx = (1200 - imgDrawWidth) / 2 + offset.x * scaleX;
    const dy = (400 - imgDrawHeight) / 2 + offset.y * scaleY;

    // Background fill (in case image doesn't cover)
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, 1200, 400);

    ctx.drawImage(img, dx, dy, imgDrawWidth, imgDrawHeight);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not generate cover image"));
          return;
        }
        resolve(new File([blob], "cover_image.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.9);
    });
  };

  const handleApply = async () => {
    let file: File | null = null;
    let preview = "";

    if (activeTab === "color") {
      file = await generateColorBlob(selectedColor);
      preview = URL.createObjectURL(file);
    } else {
      if (!imageSrc) return;
      file = await generateImageBlob();
      if (!file) return;
      preview = URL.createObjectURL(file);
    }

    onApply(file, preview);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  };

  return (
    <div className="cover-modal-overlay">
      <div className="cover-modal">
        <div className="cover-modal-header">
          <h3>Edit Cover</h3>
          <button className="cover-close-btn" onClick={onClose}>
            <UiIcon name="x" size={20} />
          </button>
        </div>

        <div className="cover-modal-tabs">
          <button 
            className={`cover-tab ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            Image
          </button>
          <button 
            className={`cover-tab ${activeTab === 'color' ? 'active' : ''}`}
            onClick={() => setActiveTab('color')}
          >
            Colors
          </button>
        </div>

        <div className="cover-modal-body">
          {activeTab === "image" && (
            <div className="cover-image-editor">
              {imageSrc ? (
                <>
                  <div 
                    className="cover-crop-container"
                    ref={containerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  >
                    <img 
                      ref={imageRef}
                      src={imageSrc} 
                      alt="Crop target" 
                      className="cover-crop-img"
                      style={{
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                      }}
                      draggable="false"
                    />
                    <div className="cover-crop-guide"></div>
                  </div>
                  <div className="cover-zoom-control">
                    <UiIcon name="minus" size={16} />
                    <input 
                      type="range" 
                      min="0.5" 
                      max="3" 
                      step="0.05" 
                      value={zoom} 
                      onChange={(e) => setZoom(parseFloat(e.target.value))} 
                    />
                    <UiIcon name="plus" size={16} />
                  </div>
                  <div style={{textAlign: "center", marginTop: 8}}>
                    <label className="cover-upload-new-btn">
                      Upload New Image
                      <input type="file" accept="image/*" hidden onChange={handleFileSelect} />
                    </label>
                  </div>
                </>
              ) : (
                <div className="cover-empty-state">
                  <label className="cover-upload-new-btn">
                    Select an Image
                    <input type="file" accept="image/*" hidden onChange={handleFileSelect} />
                  </label>
                </div>
              )}
            </div>
          )}

          {activeTab === "color" && (
            <div className="cover-color-editor">
              <div 
                className="cover-color-preview"
                style={{ backgroundColor: selectedColor }}
              />
              <p className="cover-color-label">Choose a background color:</p>
              <div className="cover-color-grid">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    className={`cover-color-swatch ${selectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="cover-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
