"use client";

import { useState } from "react";
import UiIcon from "@/shared/ui/UiIcon";

interface CreateAlbumModalProps {
  onClose: () => void;
  onCreate: (formData: FormData) => Promise<void>;
}

const categories = [
  { value: "events", label: "События", icon: "calendar" },
  { value: "clubs", label: "Клубы", icon: "users" },
  { value: "student_life", label: "Студенческая жизнь", icon: "heart" },
  { value: "sports", label: "Спорт", icon: "heart" },
  { value: "academic", label: "Учёба", icon: "graduation" },
  { value: "parties", label: "Вечеринки", icon: "heart" },
  { value: "erasmus", label: "Erasmus", icon: "heart" },
  { value: "graduation", label: "Выпускной", icon: "graduation" },
  { value: "freshmen", label: "Первокурсники", icon: "users" },
  { value: "other", label: "Другое", icon: "folder" },
];

export default function CreateAlbumModal({ onClose, onCreate }: CreateAlbumModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [eventDate, setEventDate] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Введите название альбома");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      if (eventDate) formData.append("eventDate", eventDate);
      formData.append("isPrivate", String(isPrivate));
      await onCreate(formData);
      onClose();
    } catch (error) {
      console.error("Create album error:", error);
      alert("Ошибка при создании альбома");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid var(--border-color-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "var(--bg-card)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "var(--french-blue-soft)",
                color: "var(--french-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UiIcon name="folder" size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "950", color: "var(--text-primary)" }}>
                Создать альбом
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>
                Организуйте фото по событиям
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "none",
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {/* Title */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "800",
                color: "var(--text-primary)",
              }}
            >
              Название альбома *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Francophonie Night 2026"
              maxLength={120}
              required
              style={{
                width: "100%",
                height: "44px",
                padding: "0 14px",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                fontSize: "14px",
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "800",
                color: "var(--text-primary)",
              }}
            >
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажите об этом событии..."
              maxLength={400}
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                fontSize: "14px",
                resize: "none",
              }}
            />
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--text-muted)", textAlign: "right" }}>
              {description.length}/400
            </p>
          </div>

          {/* Category */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "12px",
                fontSize: "14px",
                fontWeight: "800",
                color: "var(--text-primary)",
              }}
            >
              Категория
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
              }}
            >
              {categories.map((cat) => (
                <label
                  key={cat.value}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    border: `2px solid ${category === cat.value ? "var(--french-blue)" : "var(--border-color-light)"}`,
                    background: category === cat.value ? "var(--french-blue-soft)" : "var(--bg-card)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s ease",
                    fontSize: "13px",
                    fontWeight: "800",
                    color: category === cat.value ? "var(--french-blue)" : "var(--text-secondary)",
                  }}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={category === cat.value}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ display: "none" }}
                  />
                  <UiIcon name={cat.icon as any} size={18} />
                  {cat.label}
                </label>
              ))}
            </div>
          </div>

          {/* Event Date */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "800",
                color: "var(--text-primary)",
              }}
            >
              Дата события
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              style={{
                width: "100%",
                height: "44px",
                padding: "0 14px",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                fontSize: "14px",
              }}
            />
          </div>

          {/* Privacy */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid var(--border-color-light)",
              background: "var(--bg-soft)",
              cursor: "pointer",
              marginBottom: "24px",
            }}
          >
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "2px" }}>
                Приватный альбом
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
                Только вы сможете видеть этот альбом
              </div>
            </div>
            <UiIcon name="eye" size={18} />
          </label>

          {/* Submit */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? (
                <>
                  <UiIcon name="loader" size={18} />
                  Создание...
                </>
              ) : (
                <>
                  <UiIcon name="plus" size={18} />
                  Создать
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
