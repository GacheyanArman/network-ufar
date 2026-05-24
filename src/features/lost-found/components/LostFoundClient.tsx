"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createLostFoundItem,
  updateLostFoundStatus,
  deleteLostFoundItem,
} from "@/features/lost-found/server/actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";

type LostFoundItem = {
  id: string;
  type: "lost" | "found";
  status: "open" | "returned" | "expired";
  title: string;
  description?: string | null;
  location: string;
  itemDate: string | Date;
  contact?: string | null;
  imageUrl?: string | null;
  ownerId: string;
};

type LostFoundPageProps = {
  items: LostFoundItem[];
  currentUserId: string;
};

export default function LostFoundPage({ items, currentUserId }: LostFoundPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type") || "all";
  const { language } = useLanguage();
  const t = translations[language]?.lostFound || translations.en.lostFound;
  const es = (translations[language] || translations.en).emptyStates;

  const [showForm, setShowForm] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") setPhotoPreview(result);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const filtered = typeFilter === "all"
    ? items
    : items.filter((i: LostFoundItem) => i.type === typeFilter);

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createLostFoundItem(fd);
        setShowForm(false);
        setPhotoPreview(null);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed");
      }
    });
  };

  return (
    <div className="uf-lf-page">
      <style>{pageCSS}</style>

      <div className="uf-lf-header">
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <button
          type="button"
          className="uf-lf-create-btn"
          onClick={() => setShowForm(!showForm)}
        >
          <UiIcon name="plus" size={16} />
          {t.reportItem}
        </button>
      </div>

      <div className="uf-lf-filters">
        {["all", "lost", "found"].map((f) => (
          <Link
            key={f}
            href={`/lost-found?type=${f}`}
            className={`uf-lf-filter ${typeFilter === f ? "active" : ""}`}
          >
            {f === "all" ? t.filters.all : f === "lost" ? t.filters.lost : t.filters.found}
          </Link>
        ))}
      </div>

      {showForm && (
        <form className="uf-lf-form" onSubmit={handleCreate}>
          <div className="uf-lf-form-row">
            <div className="uf-lf-form-group" style={{ flex: 2 }}>
              <label>{t.form.title} *</label>
              <input name="title" placeholder={t.form.titlePlaceholder} required maxLength={200} />
            </div>
            <div className="uf-lf-form-group">
              <label>{t.form.type} *</label>
              <select name="type" required>
                <option value="lost">{t.filters.lost}</option>
                <option value="found">{t.filters.found}</option>
              </select>
            </div>
          </div>
          <div className="uf-lf-form-row">
            <div className="uf-lf-form-group">
              <label>{t.form.location} *</label>
              <input name="location" placeholder={t.form.locationPlaceholder} required maxLength={200} />
            </div>
            <div className="uf-lf-form-group">
              <label>{t.form.date}</label>
              <input name="itemDate" type="date" />
            </div>
          </div>
          <div className="uf-lf-form-group">
            <label>{t.form.description}</label>
            <textarea
              name="description"
              placeholder={t.form.descriptionPlaceholder}
              maxLength={1000}
              rows={2}
              style={{ resize: "none" }}
            />
          </div>
          <div className="uf-lf-form-row">
            <div className="uf-lf-form-group">
              <label>{t.form.contact}</label>
              <input name="contact" placeholder={t.form.contactPlaceholder} maxLength={200} />
            </div>
            <div className="uf-lf-form-group">
              <label>{t.form.photo}</label>
              <label className="uf-lf-upload">
                <input name="image" type="file" accept="image/*" className="uf-lf-upload-input" onChange={handlePhotoChange} />
                {photoPreview ? (
                  <div className="uf-lf-upload-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from a local File picker; next/image cannot optimise unknown blob: sources */}
                    <img src={photoPreview} alt="Preview" />
                    <span className="uf-lf-upload-change">{t.form.changePhoto}</span>
                  </div>
                ) : (
                  <div className="uf-lf-upload-placeholder">
                    <UiIcon name="camera" size={24} />
                    <span>{t.form.photoHint}</span>
                  </div>
                )}
              </label>
            </div>
          </div>
          <div className="uf-lf-form-actions">
            <button type="submit" className="uf-lf-create-btn" disabled={isPending}>
              {isPending ? t.form.submitting : t.form.submit}
            </button>
            <button type="button" className="uf-lf-cancel-btn" onClick={() => { setShowForm(false); setPhotoPreview(null); }}>
              {t.form.cancel}
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="uf-lf-empty">
          <div className="uf-lf-empty-icon">
            <UiIcon name="search" size={28} />
          </div>
          <h2>{es.lostFound.emptyTitle}</h2>
          <p>{es.lostFound.emptyHint}</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 10 }}
            onClick={() => setShowForm(true)}
          >
            {es.lostFound.reportItem}
          </button>
        </div>
      ) : (
        <div className="uf-lf-grid">
          {filtered.map((item: LostFoundItem) => {
            const isOwner = item.ownerId === currentUserId;
            return (
              <article key={item.id} className={`uf-lf-card uf-lf-card--${item.type}`}>
                <div className="uf-lf-card-header">
                  <span className={`uf-lf-type uf-lf-type--${item.type}`}>
                    {item.type === "lost" ? t.filters.lost : t.filters.found}
                  </span>
                  <span className={`uf-lf-status uf-lf-status--${item.status}`}>
                    {(t.status as Record<string, string> | undefined)?.[item.status] || item.status}
                  </span>
                </div>

                {item.imageUrl && (
                  <div className="uf-lf-card-image" style={{ position: "relative", height: 180 }}>
                    <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width: 700px) 100vw, 350px" style={{ objectFit: "cover" }} />
                  </div>
                )}

                <h3 className="uf-lf-card-title">{item.title}</h3>

                <div className="uf-lf-card-meta">
                  <UiIcon name="map-pin" size={13} />
                  {item.location}
                </div>

                <div className="uf-lf-card-meta">
                  <UiIcon name="calendar" size={13} />
                  {new Date(item.itemDate).toLocaleDateString(language, {
                    day: "numeric",
                    month: "short",
                  })}
                </div>

                {item.description && (
                  <p className="uf-lf-card-desc">
                    {item.description.length > 100
                      ? item.description.slice(0, 100) + "…"
                      : item.description}
                  </p>
                )}

                {item.contact && (
                  <div className="uf-lf-card-meta">
                    <UiIcon name="phone" size={13} />
                    {item.contact}
                  </div>
                )}

                {isOwner && (
                  <div className="uf-lf-card-owner-actions">
                    {item.status === "open" && (
                      <form
                        action={(fd) => {
                          startTransition(async () => {
                            await updateLostFoundStatus(fd);
                            router.refresh();
                          });
                        }}
                      >
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="status" value="returned" />
                        <button type="submit" className="uf-lf-action-btn uf-lf-action-btn--resolve">
                          {t.markReturned}
                        </button>
                      </form>
                    )}
                    <form
                      action={(fd) => {
                        startTransition(async () => {
                          await deleteLostFoundItem(fd);
                          router.refresh();
                        });
                      }}
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit" className="uf-lf-action-btn uf-lf-action-btn--delete">
                        {t.deleteItem}
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const pageCSS = `
.uf-lf-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 12px;
}

.uf-lf-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.uf-lf-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.uf-lf-header p {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.uf-lf-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 10px;
  background: #0b3aa8;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: background 160ms ease;
}

.uf-lf-create-btn:hover { background: #062fae; }
.uf-lf-create-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.uf-lf-cancel-btn {
  padding: 10px 18px;
  border-radius: 10px;
  background: #fff;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 800;
  border: 1px solid #d9e2ef;
  cursor: pointer;
}

.uf-lf-cancel-btn:hover { background: #f8fafc; }

.uf-lf-filters {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
}

.uf-lf-filter {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid #d9e2ef;
  background: #fff;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 160ms ease;
}

.uf-lf-filter:hover { border-color: #b0bdd0; }

.uf-lf-filter.active {
  background: #0b3aa8;
  color: #fff;
  border-color: #0b3aa8;
}

.uf-lf-form {
  background: #fff;
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.uf-lf-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.uf-lf-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.uf-lf-form-group label {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.uf-lf-form-group input,
.uf-lf-form-group select,
.uf-lf-form-group textarea {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  font-family: inherit;
}

.uf-lf-form-group input:focus,
.uf-lf-form-group select:focus,
.uf-lf-form-group textarea:focus {
  outline: none;
  border-color: #0b3aa8;
  box-shadow: 0 0 0 2px rgba(11, 58, 168, 0.1);
}

.uf-lf-upload {
  display: block;
  cursor: pointer;
}

.uf-lf-upload-input {
  display: none;
}

.uf-lf-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 16px;
  border: 2px dashed #d9e2ef;
  border-radius: 12px;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  transition: all 160ms ease;
}

.uf-lf-upload:hover .uf-lf-upload-placeholder {
  border-color: #0b3aa8;
  color: #0b3aa8;
  background: #eef4ff;
}

.uf-lf-upload-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #d9e2ef;
}

.uf-lf-upload-preview img {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  display: block;
}

.uf-lf-upload-change {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(11, 58, 168, 0.85);
  color: #fff;
  text-align: center;
  padding: 6px;
  font-size: 12px;
  font-weight: 700;
}

.uf-lf-form-actions {
  display: flex;
  gap: 8px;
}

.uf-lf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.uf-lf-card {
  background: #fff;
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 3px solid;
}

.uf-lf-card--lost { border-top-color: #dc2626; }
.uf-lf-card--found { border-top-color: #059669; }

.uf-lf-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.uf-lf-type {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 3px 8px;
  border-radius: 6px;
}

.uf-lf-type--lost { background: #fef2f2; color: #991b1b; }
.uf-lf-type--found { background: #ecfdf5; color: #065f46; }

.uf-lf-status {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}

.uf-lf-status--open { background: #fef3c7; color: #92400e; }
.uf-lf-status--returned { background: #ecfdf5; color: #065f46; }
.uf-lf-status--expired { background: var(--bg-hover); color: var(--text-secondary); }

.uf-lf-card-image {
  border-radius: 10px;
  overflow: hidden;
  max-height: 180px;
}

.uf-lf-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.uf-lf-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

.uf-lf-card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.uf-lf-card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.uf-lf-card-owner-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color-light);
}

.uf-lf-action-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid;
  transition: all 160ms ease;
}

.uf-lf-action-btn--resolve {
  background: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}

.uf-lf-action-btn--resolve:hover { background: #d1fae5; }

.uf-lf-action-btn--delete {
  background: #fff;
  color: #dc2626;
  border-color: #fecaca;
}

.uf-lf-action-btn--delete:hover { background: #fef2f2; }

.uf-lf-empty {
  background: #fff;
  border: 1px dashed #d9e2ef;
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
}

.uf-lf-empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: #eef4ff;
  color: #0b3aa8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.uf-lf-empty h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.uf-lf-empty p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 700px) {
  .uf-lf-grid { grid-template-columns: 1fr; }
  .uf-lf-form-row { grid-template-columns: 1fr; }
}
`;
