"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { updateProfile } from "@/features/profile/server/actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";
import CoverEditorModal from "./CoverEditorModal";
import "./ProfileEditForm.css";

const editProfileText = {
  en: {
    title: "Edit profile",
    subtitle: "Update your profile details and upload real photos from your device.",
    backToProfile: "← Back to profile",
    profilePhotos: "Profile Photos",
    changeCover: "Change cover",
    changeAvatar: "Change avatar",
    coverHint: "Recommended size: 1200x400. Max 5MB.",
    avatarHint: "Recommended: Square image. Max 5MB.",
    personalInformation: "Basic Information",
    fullName: "Full name *",
    fullNamePlaceholder: "Your full name",
    username: "Username",
    usernamePlaceholder: "username",
    usernameHelper: "This will be your public profile handle.",
    email: "Email",
    emailHelper: "Email is used for login and notifications. It cannot be changed here.",
    academicInformation: "Academic Information",
    faculty: "Faculty",
    year: "Academic Year",
    studyGroup: "Study Group",
    studyGroupPlaceholder: "e.g., F1, M2",
    aboutYou: "About You",
    bio: "Bio",
    bioPlaceholder: "Write a short bio...",
    privacy: "Privacy",
    profileVisibility: "Profile visibility",
    public: "Public",
    studentsOnly: "Students only (Friends)",
    private: "Private",
    notSpecified: "Not specified",
    cancel: "Cancel",
    saving: "Saving...",
    saveChanges: "Save changes",
    onlyImages: "Only image files are allowed.",
    imageTooLarge: "Image is too large. Max size is 5MB.",
    completeness: "Profile completeness",
    profileComplete: "Your profile is complete!",
    livePreview: "Live Preview",
  },
  fr: {
    title: "Modifier le profil",
    subtitle: "Mettez à jour les détails de votre profil et importez de vraies photos depuis votre appareil.",
    backToProfile: "← Retour au profil",
    profilePhotos: "Photos de profil",
    changeCover: "Changer la couverture",
    changeAvatar: "Changer l’avatar",
    coverHint: "Taille recommandée: 1200x400. Max 5Mo.",
    avatarHint: "Recommandé: Image carrée. Max 5Mo.",
    personalInformation: "Informations de base",
    fullName: "Nom complet *",
    fullNamePlaceholder: "Votre nom complet",
    username: "Nom d’utilisateur",
    usernamePlaceholder: "nom_utilisateur",
    usernameHelper: "Ce sera votre identifiant public.",
    email: "E-mail",
    emailHelper: "L'e-mail est utilisé pour la connexion. Il ne peut pas être modifié ici.",
    academicInformation: "Informations académiques",
    faculty: "Faculté",
    year: "Année universitaire",
    studyGroup: "Groupe d'étude",
    studyGroupPlaceholder: "ex: F1, M2",
    aboutYou: "À propos de vous",
    bio: "Bio",
    bioPlaceholder: "Écrivez une courte bio...",
    privacy: "Confidentialité",
    profileVisibility: "Visibilité du profil",
    public: "Public",
    studentsOnly: "Étudiants uniquement (Amis)",
    private: "Privé",
    notSpecified: "Non indiqué",
    cancel: "Annuler",
    saving: "Enregistrement...",
    saveChanges: "Enregistrer les modifications",
    onlyImages: "Seules les images sont autorisées.",
    imageTooLarge: "L’image est trop volumineuse. Taille max : 5 Mo.",
    completeness: "Complétude du profil",
    profileComplete: "Votre profil est complet!",
    livePreview: "Aperçu en direct",
  },
  hy: {
    title: "Խմբագրել պրոֆիլը",
    subtitle: "Թարմացրեք ձեր պրոֆիլի տվյալները և վերբեռնեք իրական լուսանկարներ ձեր սարքից։",
    backToProfile: "← Վերադառնալ պրոֆիլ",
    profilePhotos: "Պրոֆիլի նկարներ",
    changeCover: "Փոխել շապիկը",
    changeAvatar: "Փոխել նկարը",
    coverHint: "Առաջարկվող չափ՝ 1200x400: Առավելագույնը 5ՄԲ:",
    avatarHint: "Առաջարկվում է քառակուսի նկար: Առավելագույնը 5ՄԲ:",
    personalInformation: "Հիմնական տեղեկություններ",
    fullName: "Անուն ազգանուն *",
    fullNamePlaceholder: "Ձեր անուն ազգանունը",
    username: "Օգտանուն",
    usernamePlaceholder: "օգտանուն",
    usernameHelper: "Սա կլինի ձեր հանրային օգտանունը։",
    email: "Էլ. փոստ",
    emailHelper: "Էլ. փոստը օգտագործվում է մուտք գործելու համար: Այն չի կարող փոխվել այստեղ:",
    academicInformation: "Ակադեմիական տեղեկություններ",
    faculty: "Ֆակուլտետ",
    year: "Ուսումնական տարի",
    studyGroup: "Ուսումնական խումբ",
    studyGroupPlaceholder: "օրինակ՝ F1, M2",
    aboutYou: "Ձեր մասին",
    bio: "Կենսագրություն",
    bioPlaceholder: "Գրեք կարճ կենսագրություն...",
    privacy: "Գաղտնիություն",
    profileVisibility: "Պրոֆիլի տեսանելիություն",
    public: "Հանրային",
    studentsOnly: "Միայն ուսանողներ (Ընկերներ)",
    private: "Մասնավոր",
    notSpecified: "Նշված չէ",
    cancel: "Չեղարկել",
    saving: "Պահպանվում է...",
    saveChanges: "Պահպանել փոփոխությունները",
    onlyImages: "Թույլատրվում են միայն պատկերներ։",
    imageTooLarge: "Պատկերը չափազանց մեծ է։ Առավելագույն չափը՝ 5 ՄԲ։",
    completeness: "Պրոֆիլի լրացվածություն",
    profileComplete: "Ձեր պրոֆիլը ամբողջական է!",
    livePreview: "Կենդանի նախադիտում",
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

export default function ProfileEditForm({ user, error }) {
  const { language } = useLanguage();
  const text = editProfileText[language] || editProfileText.en;

  const lang = translations[language] || translations.en;
  const facultyLabels = lang.onboarding?.faculty || {};
  const yearLabels = lang.onboarding?.year || {};

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(user.image || user.avatarUrl || "");
  const [coverPreview, setCoverPreview] = useState(user.coverImage || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [tempCoverFile, setTempCoverFile] = useState(null);

  // Live preview state
  const [fullName, setFullName] = useState(user.fullName || "");
  const [username, setUsername] = useState(user.username || "");
  const [faculty, setFaculty] = useState(user.faculty || "");
  const [year, setYear] = useState(user.year || "");
  const [studyGroup, setStudyGroup] = useState(user.studyGroup || "");
  const [bio, setBio] = useState(user.bio || "");
  
  // Validation errors state
  const [avatarError, setAvatarError] = useState("");
  const [coverError, setCoverError] = useState("");

  const safeInitial = fullName ? fullName.charAt(0).toUpperCase() : "U";

  // Calculate completeness
  const profileFields = [
    { key: "name", label: text.fullName.replace(" *", ""), isComplete: fullName.trim().length > 0 },
    { key: "username", label: text.username, isComplete: username.trim().length > 0 },
    { key: "avatar", label: "Avatar", isComplete: !!avatarPreview },
    { key: "cover", label: "Cover photo", isComplete: !!coverPreview },
    { key: "faculty", label: text.faculty, isComplete: !!faculty },
    { key: "year", label: text.year, isComplete: !!year },
    { key: "bio", label: text.bio, isComplete: bio.trim().length > 0 },
  ];

  const completedCount = profileFields.filter((f) => f.isComplete).length;
  const completenessPercent = Math.round((completedCount / profileFields.length) * 100);

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    setAvatarError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError(text.onlyImages);
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(text.imageTooLarge);
      event.target.value = "";
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0];
    setCoverError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCoverError(text.onlyImages);
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCoverError(text.imageTooLarge);
      event.target.value = "";
      return;
    }

    setTempCoverFile(file);
    setIsCoverModalOpen(true);
    event.target.value = "";
  }

  function handleCoverApply(file, previewUrl) {
    if (!file) return;
    
    // Create a new FileList-like object to attach to the input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    if (coverInputRef.current) {
      coverInputRef.current.files = dataTransfer.files;
    }
    
    setCoverPreview(previewUrl);
    setIsCoverModalOpen(false);
    setTempCoverFile(null);
  }

  function formatUsername(val) {
    // remove @ from beginning, make lowercase
    const formatted = val.replace(/^@/, "").toLowerCase();
    setUsername(formatted);
  }

  const bioLength = bio.length;
  const bioColor = bioLength > 290 ? "#dc2626" : bioLength > 250 ? "#d97706" : "#64748b";

  return (
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

        <div className="uf-edit-layout">
          {/* Main Form Area */}
          <form
            action={async (formData) => {
              setIsSubmitting(true);
              await updateProfile(formData);
              // reset is done by the redirect in the action
            }}
            className="uf-edit-form"
          >
            {/* 1. Profile Photos */}
            <div className="uf-edit-card">
              <h2 className="uf-edit-section-title">{text.profilePhotos}</h2>
              <div className="uf-edit-photos-wrapper">
                <div className="uf-edit-cover-zone">
                  {coverPreview && (
                    <img src={coverPreview} alt="Cover" className="uf-edit-cover-img" />
                  )}
                  <div className="uf-edit-cover-actions">
                    <button
                      type="button"
                      className="uf-edit-photo-btn"
                      onClick={() => {
                        setTempCoverFile(null);
                        setIsCoverModalOpen(true);
                      }}
                    >
                      <UiIcon name="edit-2" size={14} />
                      {text.changeCover}
                    </button>
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    name="coverFile"
                    accept="image/*"
                    onChange={handleCoverChange}
                    hidden
                  />
                </div>

                <div className="uf-edit-avatar-container">
                  <div
                    className="uf-edit-avatar-zone"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" />
                    ) : (
                      <span className="uf-edit-avatar-initial">{safeInitial}</span>
                    )}
                  </div>

                  <div className="uf-edit-avatar-actions">
                    <button
                      type="button"
                      className="uf-edit-photo-btn"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <UiIcon name="camera" size={14} />
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
                </div>
              </div>

              <div className="uf-edit-photos-hints">
                {coverError ? (
                  <div className="uf-edit-field-error" style={{ justifyContent: "center", marginBottom: 8 }}>
                    <UiIcon name="alert-circle" size={14} /> {coverError}
                  </div>
                ) : (
                  <p className="uf-edit-hint" style={{ textAlign: "center", marginBottom: 8 }}>
                    {text.coverHint}
                  </p>
                )}
                
                {avatarError ? (
                  <div className="uf-edit-field-error" style={{ justifyContent: "center" }}>
                    <UiIcon name="alert-circle" size={14} /> {avatarError}
                  </div>
                ) : (
                  <p className="uf-edit-hint" style={{ textAlign: "center" }}>
                    {text.avatarHint}
                  </p>
                )}
              </div>
            </div>

            {/* 2. Basic Information */}
            <div className="uf-edit-card">
              <h2 className="uf-edit-section-title">{text.personalInformation}</h2>
              <div className="uf-edit-grid">
                <label className="uf-edit-field uf-edit-field-full">
                  <span className="uf-edit-label">{text.fullName}</span>
                  <input
                    className="uf-edit-input"
                    name="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={text.fullNamePlaceholder}
                    required
                  />
                </label>

                <label className="uf-edit-field">
                  <span className="uf-edit-label">{text.username}</span>
                  <input
                    className="uf-edit-input"
                    name="username"
                    value={username}
                    onChange={(e) => formatUsername(e.target.value)}
                    placeholder={text.usernamePlaceholder}
                    maxLength={24}
                  />
                  <span className="uf-edit-field-hint">
                    {text.usernameHelper} {username && <strong>@{username}</strong>}
                  </span>
                </label>

                <label className="uf-edit-field">
                  <span className="uf-edit-label">{text.email}</span>
                  <input
                    className="uf-edit-input"
                    value={user.email || ""}
                    disabled
                  />
                  <span className="uf-edit-field-hint">{text.emailHelper}</span>
                </label>
              </div>
            </div>

            {/* 3. Academic Information */}
            <div className="uf-edit-card">
              <h2 className="uf-edit-section-title">{text.academicInformation}</h2>
              <div className="uf-edit-grid">
                <label className="uf-edit-field">
                  <span className="uf-edit-label">{text.faculty}</span>
                  <select
                    className="uf-edit-select"
                    name="faculty"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
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
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
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
                  <span className="uf-edit-label">{text.studyGroup}</span>
                  <input
                    className="uf-edit-input"
                    name="studyGroup"
                    value={studyGroup}
                    onChange={(e) => setStudyGroup(e.target.value)}
                    placeholder={text.studyGroupPlaceholder}
                    maxLength={100}
                  />
                </label>
              </div>
            </div>

            {/* 4. About You */}
            <div className="uf-edit-card">
              <h2 className="uf-edit-section-title">{text.aboutYou}</h2>
              <label className="uf-edit-field">
                <span className="uf-edit-label">
                  {text.bio}
                  <span style={{ color: bioColor, fontWeight: 700 }}>
                    {bioLength}/300
                  </span>
                </span>
                <textarea
                  className="uf-edit-textarea"
                  name="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={text.bioPlaceholder}
                  maxLength={300}
                />
              </label>
            </div>

            {/* 5. Privacy */}
            <div className="uf-edit-card">
              <h2 className="uf-edit-section-title">{text.privacy}</h2>
              <label className="uf-edit-field" style={{ maxWidth: 300 }}>
                <span className="uf-edit-label">{text.profileVisibility}</span>
                <select
                  className="uf-edit-select"
                  name="privacyLevel"
                  defaultValue={user.privacyLevel || "public"}
                >
                  <option value="public">{text.public}</option>
                  <option value="friends">{text.studentsOnly}</option>
                  <option value="private">{text.private}</option>
                </select>
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

          {/* Sidebar / Completeness & Preview */}
          <div className="uf-edit-sidebar">
            <div className="uf-comp-card">
              <div className="uf-comp-header">
                <h3>{text.completeness}</h3>
                <span className="uf-comp-percent">{completenessPercent}%</span>
              </div>
              <div className="uf-comp-bar-bg">
                <div className="uf-comp-bar-fill" style={{ width: `${completenessPercent}%` }} />
              </div>
              
              <div className="uf-comp-list">
                {profileFields.map((field) => (
                  <div key={field.key} className={`uf-comp-item ${field.isComplete ? "completed" : ""}`}>
                    <div className="uf-comp-icon">
                      {field.isComplete ? <UiIcon name="check" size={14} /> : <UiIcon name="more" size={14} />}
                    </div>
                    {field.label}
                  </div>
                ))}
              </div>

              {completenessPercent === 100 && (
                <div className="uf-comp-success-msg">
                  {text.profileComplete}
                </div>
              )}
            </div>

            <div className="uf-live-preview">
              <h3>{text.livePreview}</h3>
              <div className="uf-preview-card">
                <div className="uf-preview-cover">
                  {coverPreview && <img src={coverPreview} alt="Cover" />}
                </div>
                <div className="uf-preview-body">
                  <div className="uf-preview-avatar">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" />
                    ) : (
                      safeInitial
                    )}
                  </div>
                  <h4 className="uf-preview-name">{fullName || "Student"}</h4>
                  <p className="uf-preview-username">@{username || "username"}</p>
                  
                  <div className="uf-preview-badges">
                    {faculty && (
                      <span className="uf-preview-badge">
                        {facultyLabels[faculty] || faculty}
                      </span>
                    )}
                    {year && (
                      <span className="uf-preview-badge">
                        {yearLabels[year] || year}
                      </span>
                    )}
                    {studyGroup && (
                      <span className="uf-preview-badge">
                        {studyGroup}
                      </span>
                    )}
                  </div>
                  
                  {bio && <p className="uf-preview-bio">{bio}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CoverEditorModal 
        isOpen={isCoverModalOpen}
        onClose={() => {
          setIsCoverModalOpen(false);
          setTempCoverFile(null);
        }}
        initialImageFile={tempCoverFile}
        onApply={handleCoverApply}
      />
    </div>
  );
}