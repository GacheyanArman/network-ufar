"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { updateProfile } from "@/features/profile/server/actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/shared/i18n/i18n";

const editProfileText = {
  en: {
    title: "Edit profile",
    subtitle: "Update your profile details and upload real photos from your device.",
    backToProfile: "← Back to profile",
    changeAvatar: "Change avatar",
    personalInformation: "Personal Information",
    fullName: "Full name *",
    fullNamePlaceholder: "Your full name",
    username: "Username",
    usernamePlaceholder: "username",
    faculty: "Faculty",
    year: "Academic Year",
    email: "Email",
    bio: "Bio",
    bioPlaceholder: "Write a short bio...",
    notSpecified: "Not specified",
    cancel: "Cancel",
    saving: "Saving...",
    saveChanges: "Save changes",
    onlyImages: "Only image files are allowed.",
    imageTooLarge: "Image is too large. Max size is 5MB.",
  },

  fr: {
    title: "Modifier le profil",
    subtitle: "Mettez à jour les détails de votre profil et importez de vraies photos depuis votre appareil.",
    backToProfile: "← Retour au profil",
    uploadCoverPhoto: "Importer une photo de couverture",
    uploadHint: "Cliquez pour choisir une image (max 5 Mo)",
    changeCover: "Changer la couverture",
    changeAvatar: "Changer l’avatar",
    personalInformation: "Informations personnelles",
    fullName: "Nom complet *",
    fullNamePlaceholder: "Votre nom complet",
    username: "Nom d’utilisateur",
    usernamePlaceholder: "nom_utilisateur",
    faculty: "Faculté",
    year: "Année universitaire",
    email: "E-mail",
    bio: "Bio",
    bioPlaceholder: "Écrivez une courte bio...",
    notSpecified: "Non indiqué",
    cancel: "Annuler",
    saving: "Enregistrement...",
    saveChanges: "Enregistrer les modifications",
    onlyImages: "Seules les images sont autorisées.",
    imageTooLarge: "L’image est trop volumineuse. Taille max : 5 Mo.",
  },

  hy: {
    title: "Խմբագրել պրոֆիլը",
    subtitle: "Թարմացրեք ձեր պրոֆիլի տվյալները և վերբեռնեք իրական լուսանկարներ ձեր սարքից։",
    backToProfile: "← Վերադառնալ պրոֆիլ",
    uploadCoverPhoto: "Վերբեռնել շապիկի լուսանկար",
    uploadHint: "Սեղմեք՝ պատկեր ընտրելու համար (առավելագույնը 5 ՄԲ)",
    changeCover: "Փոխել շապիկը",
    changeAvatar: "Փոխել նկարը",
    personalInformation: "Անձնական տվյալներ",
    fullName: "Անուն ազգանուն *",
    fullNamePlaceholder: "Ձեր անուն ազգանունը",
    username: "Օգտանուն",
    usernamePlaceholder: "օգտանուն",
    faculty: "Ֆակուլտետ",
    year: "Ուսումնական տարի",
    email: "Էլ. փոստ",
    bio: "Կենսագրություն",
    bioPlaceholder: "Գրեք կարճ կենսագրություն...",
    notSpecified: "Նշված չէ",
    cancel: "Չեղարկել",
    saving: "Պահպանվում է...",
    saveChanges: "Պահպանել փոփոխությունները",
    onlyImages: "Թույլատրվում են միայն պատկերներ։",
    imageTooLarge: "Պատկերը չափազանց մեծ է։ Առավելագույն չափը՝ 5 ՄԲ։",
  },
};

const FACULTIES = [
  "management",
  "marketing",
  "finance",
  "computerScience",
  "law",
  "internationalRelations",
  "languages",
  "economics",
  "other",
];

const YEARS = [
  "y1",
  "y2",
  "y3",
  "y4",
  "master",
  "phd",
];

const editProfileStyles = `
.uf-edit-page {
  width: 100%;
  min-width: 0;
  background: transparent;
}

.uf-edit-shell {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 22px 48px;
}

.uf-edit-header {
  margin-bottom: 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.uf-edit-header-text h1 {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 950;
  letter-spacing: -0.04em;
  color: #0f172a;
  line-height: 1.1;
}

.uf-edit-header-text p {
  margin: 0;
  font-size: 15px;
  color: var(--text-secondary);
  font-weight: 600;
  line-height: 1.5;
}

.uf-edit-back-btn {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 10px;
  background: #ffffff;
  color: #475569;
  border: 1px solid #d9e2ef;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 14px;
  font-weight: 800;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}

.uf-edit-back-btn:hover {
  background: #f8fafc;
  border-color: #0b3aa8;
  color: #0b3aa8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.uf-edit-error {
  margin-bottom: 24px;
  padding: 16px 18px;
  border-radius: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 700;
}

.uf-edit-error span {
  font-size: 20px;
  flex: 0 0 auto;
}

.uf-edit-error p {
  margin: 0;
  flex: 1;
}

.uf-edit-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.uf-card {
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.uf-edit-preview-card {
  position: relative;
  padding: 32px 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.uf-edit-avatar-zone {
  width: 140px;
  height: 140px;
  border-radius: 999px;
  background: #0b3aa8;
  color: #ffffff;
  border: 6px solid #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  z-index: 50;
}

.uf-edit-avatar-zone:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.24);
}

.uf-edit-avatar-zone img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.uf-edit-avatar-initial {
  font-size: 52px;
  font-weight: 950;
}

.uf-edit-avatar-btn {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #d9e2ef;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  transition: all 0.2s ease;
  z-index: 50;
}

.uf-edit-avatar-btn:hover {
  background: #f8fafc;
  border-color: #0b3aa8;
  color: #0b3aa8;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
}

.uf-edit-fields-card {
  padding: 32px;
}

.uf-edit-section-title {
  margin: 0 0 28px;
  font-size: 20px;
  font-weight: 950;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.uf-edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.uf-edit-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uf-edit-field-full {
  grid-column: 1 / -1;
}

.uf-edit-label {
  font-size: 14px;
  font-weight: 800;
  color: #334155;
  letter-spacing: -0.01em;
}

.uf-edit-input,
.uf-edit-select,
.uf-edit-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d9e2ef;
  border-radius: 12px;
  background: #ffffff;
  color: #0f172a;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.2s ease;
  outline: none;
}

.uf-edit-input:focus,
.uf-edit-select:focus,
.uf-edit-textarea:focus {
  border-color: #0b3aa8;
  box-shadow: 0 0 0 3px rgba(11, 58, 168, 0.1);
  background: #ffffff;
}

.uf-edit-input:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

.uf-edit-textarea {
  resize: none;
  min-height: 100px;
  line-height: 1.6;
}

.uf-edit-select {
  cursor: pointer;
}

.uf-edit-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding-top: 8px;
}

.uf-edit-cancel-btn {
  min-height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  background: #ffffff;
  color: #475569;
  border: 1px solid #d9e2ef;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 15px;
  font-weight: 800;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}

.uf-edit-cancel-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #334155;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.uf-edit-save-btn {
  min-height: 48px;
  padding: 0 32px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0b3aa8 0%, #062fae 100%);
  color: #ffffff;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(11, 58, 168, 0.24);
  position: relative;
  overflow: hidden;
}

.uf-edit-save-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.uf-edit-save-btn:hover::before {
  left: 100%;
}

.uf-edit-save-btn:hover {
  background: linear-gradient(135deg, #062fae 0%, #041f7a 100%);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(11, 58, 168, 0.32);
}

.uf-edit-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.uf-edit-save-btn:disabled:hover {
  transform: none;
  box-shadow: 0 8px 20px rgba(11, 58, 168, 0.24);
}

@media (max-width: 768px) {
  .uf-edit-shell {
    padding: 16px 16px 36px;
  }

  .uf-edit-header {
    flex-direction: column;
    gap: 16px;
  }

  .uf-edit-header-text h1 {
    font-size: 26px;
  }

  .uf-edit-back-btn {
    width: 100%;
  }

  .uf-edit-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .uf-edit-fields-card {
    padding: 24px 20px;
  }

  .uf-edit-avatar-zone {
    width: 120px;
    height: 120px;
  }

  .uf-edit-avatar-initial {
    font-size: 44px;
  }

  .uf-edit-actions {
    flex-direction: column-reverse;
    gap: 12px;
  }

  .uf-edit-cancel-btn,
  .uf-edit-save-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .uf-edit-avatar-zone {
    width: 100px;
    height: 100px;
    border-width: 4px;
  }

  .uf-edit-avatar-initial {
    font-size: 36px;
  }

  .uf-edit-avatar-btn {
    min-height: 34px;
    padding: 0 12px;
    font-size: 12px;
  }

  .uf-edit-fields-card {
    padding: 20px 16px;
  }
}
`;

export default function ProfileEditForm({ user, error }) {
  const { language } = useLanguage();
  const text = editProfileText[language] || editProfileText.en;

  const lang = translations[language] || translations.en;
  const facultyLabels = lang.onboarding?.faculty || {};
  const yearLabels = lang.onboarding?.year || {};

  const avatarInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(user.image || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeName = user.fullName || "Student";
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(text.onlyImages);
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(text.imageTooLarge);
      event.target.value = "";
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
  }

   return (
    <>
      <style>{editProfileStyles}</style>
      <div className="uf-edit-page">
        <div className="uf-edit-shell">
          <div className="uf-edit-header">
            <div className="uf-edit-header-text">
              <h1>{text.title}</h1>
              <p>{text.subtitle}</p>
            </div>

            <Link href="/profile" className="uf-edit-back-btn">
              {text.backToProfile}
            </Link>
          </div>

          {error ? (
            <div className="uf-edit-error">
              <span>⚠</span>
              <p>{error}</p>
            </div>
          ) : null}

          <form
            action={async (formData) => {
              setIsSubmitting(true);
              await updateProfile(formData);
            }}
            className="uf-edit-form"
          >
            <div className="uf-card uf-edit-preview-card">
              <div
                className="uf-edit-avatar-zone"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- avatarPreview is either a remote URL (initial state) or a blob: URL (after picking a new file); next/image cannot handle dynamic blob: sources
                  <img src={avatarPreview} alt={text.changeAvatar} />
                ) : (
                  <span className="uf-edit-avatar-initial">{safeInitial}</span>
                )}
              </div>

              <button
                type="button"
                className="uf-edit-avatar-btn"
                onClick={() => avatarInputRef.current?.click()}
              >
                {text.changeAvatar}
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                name="avatarFile"
                accept="image/*"
                onChange={handleAvatarChange}
                hidden
              />
            </div>

            <div className="uf-card uf-edit-fields-card">
              <h2 className="uf-edit-section-title">
                {text.personalInformation}
              </h2>

              <div className="uf-edit-grid">
                <label className="uf-edit-field">
                  <span className="uf-edit-label">{text.fullName}</span>
                  <input
                    className="uf-edit-input"
                    name="fullName"
                    defaultValue={user.fullName || ""}
                    placeholder={text.fullNamePlaceholder}
                    required
                  />
                </label>

                <label className="uf-edit-field">
                  <span className="uf-edit-label">{text.username}</span>
                  <input
                    className="uf-edit-input"
                    name="username"
                    defaultValue={user.username || ""}
                    placeholder={text.usernamePlaceholder}
                  />
                </label>

                <label className="uf-edit-field">
                  <span className="uf-edit-label">{text.faculty}</span>
                  <select
                    className="uf-edit-select"
                    name="faculty"
                    defaultValue={user.faculty || ""}
                  >
                    <option value="">{text.notSpecified}</option>
                    {FACULTIES.map((f) => (
                      <option key={f} value={f}>
                        {facultyLabels[f] || f}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="uf-edit-field">
                  <span className="uf-edit-label">{text.year}</span>
                  <select
                    className="uf-edit-select"
                    name="year"
                    defaultValue={user.year || ""}
                  >
                    <option value="">{text.notSpecified}</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {yearLabels[y] || y}
                      </option>
                    ))}
                  </select>
                </label>


                <label className="uf-edit-field">
                  <span className="uf-edit-label">{text.email}</span>
                  <input
                    className="uf-edit-input"
                    value={user.email || ""}
                    disabled
                  />
                </label>
              </div>

              <label className="uf-edit-field uf-edit-field-full">
                <span className="uf-edit-label">{text.bio}</span>
                <textarea
                  className="uf-edit-textarea"
                  name="bio"
                  defaultValue={user.bio || ""}
                  placeholder={text.bioPlaceholder}
                  maxLength={300}
                  rows={4}
                />
              </label>
            </div>

            <div className="uf-edit-actions">
              <Link href="/profile" className="uf-edit-cancel-btn">
                {text.cancel}
              </Link>

              <button
                type="submit"
                className="uf-edit-save-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? text.saving : text.saveChanges}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}