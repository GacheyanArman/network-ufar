"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { updateProfile } from "@/app/actions/profile";
import { GENDER_OPTIONS, RELATIONSHIP_STATUS_OPTIONS } from "@/lib/profile-utils";

export default function ProfileEditForm({ user, error }) {
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(user.image || "");
  const [coverPreview, setCoverPreview] = useState(user.coverImage || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeName = user.fullName || "Student";
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Max size is 5MB.");
      event.target.value = "";
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Max size is 5MB.");
      event.target.value = "";
      return;
    }

    setCoverPreview(URL.createObjectURL(file));
  }

  return (
    <div className="profile-edit-page">
      <div className="profile-edit-page-header">
        <div>
          <h1>Edit profile</h1>
          <p>Update your profile details and upload real photos from your device.</p>
        </div>

        <Link href="/profile" className="profile-edit-back">
          Back to profile
        </Link>
      </div>

      {error ? <div className="profile-edit-error">{error}</div> : null}

      <form
        action={async (formData) => {
          setIsSubmitting(true);
          await updateProfile(formData);
        }}
        className="profile-edit-form"
      >
        <div className="profile-edit-preview">
          <div
            className="profile-edit-cover-preview"
            onClick={() => coverInputRef.current?.click()}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover preview" />
            ) : (
              <div className="profile-upload-placeholder">
                <strong>Upload cover photo</strong>
                <span>Click to choose image</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="profile-cover-upload-btn"
            onClick={() => coverInputRef.current?.click()}
          >
            Change cover
          </button>

          <div
            className="profile-edit-avatar-preview"
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" />
            ) : (
              <span>{safeInitial}</span>
            )}
          </div>

          <button
            type="button"
            className="profile-avatar-upload-btn"
            onClick={() => avatarInputRef.current?.click()}
          >
            Change avatar
          </button>

          <input
            ref={coverInputRef}
            type="file"
            name="coverFile"
            accept="image/*"
            onChange={handleCoverChange}
            hidden
          />

          <input
            ref={avatarInputRef}
            type="file"
            name="avatarFile"
            accept="image/*"
            onChange={handleAvatarChange}
            hidden
          />
        </div>

        <div className="profile-edit-grid">
          <label>
            <span>Full name</span>
            <input
              name="fullName"
              defaultValue={user.fullName || ""}
              placeholder="Your full name"
              required
            />
          </label>

          <label>
            <span>Username</span>
            <input
              name="username"
              defaultValue={user.username || ""}
              placeholder="username"
            />
          </label>

          <label>
            <span>Faculty</span>
            <input
              name="faculty"
              defaultValue={user.faculty || ""}
              placeholder="Computer Science, Law, Management..."
            />
          </label>

          <label>
            <span>Gender</span>
            <select name="gender" defaultValue={user.gender || ""}>
              <option value="">Не указано</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Relationship Status</span>
            <select name="relationshipStatus" defaultValue={user.relationshipStatus || ""}>
              <option value="">Не указано</option>
              {RELATIONSHIP_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Birth Date</span>
            <input
              type="date"
              name="birthDate"
              defaultValue={user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : ""}
              max={new Date().toISOString().split('T')[0]}
            />
          </label>

          <label>
            <span>Email</span>
            <input value={user.email || ""} disabled />
          </label>

          <label>
            <span>Privacy Level</span>
            <select name="privacyLevel" defaultValue={user.privacyLevel || "public"}>
              <option value="public">Public - Everyone can see my posts</option>
              <option value="friends">Friends Only - Only friends can see my posts</option>
              <option value="private">Private - Only I can see my posts</option>
            </select>
          </label>
        </div>

        <label>
          <span>Bio</span>
          <textarea
            name="bio"
            defaultValue={user.bio || ""}
            placeholder="Write a short bio..."
            maxLength={300}
          />
        </label>

        <div className="profile-edit-actions">
          <Link href="/profile" className="profile-edit-cancel">
            Cancel
          </Link>

          <button type="submit" className="profile-edit-save" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}