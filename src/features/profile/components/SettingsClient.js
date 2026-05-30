"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/shared/ui/UiIcon";

const PREF_KEYS = ["academic", "events", "photos", "messages", "materials", "social"];

const PREF_LABELS = {
  en: {
    academic: "Academic deadlines",
    events: "Events",
    photos: "Photos",
    messages: "Messages",
    materials: "Materials",
    social: "Social activity",
  },
  fr: {
    academic: "Échéances académiques",
    events: "Événements",
    photos: "Photos",
    messages: "Messages",
    materials: "Matériaux",
    social: "Activité sociale",
  },
  hy: {
    academic: "Ակադեմիական ժամկետներ",
    events: "Միջոցառումներ",
    photos: "Լուսանկարներ",
    messages: "Հաղորդագրություններ",
    materials: "Նյութեր",
    social: "Սոցիալական ակտիվություն",
  },
};

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "hy", label: "Հայերեն" },
];

export default function SettingsClient({ user, prefs: initialPrefs }) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [isPending, startTransition] = useTransition();

  const labels = PREF_LABELS[language] || PREF_LABELS.en;

  const handleToggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);

    startTransition(async () => {
      const fd = new FormData();
      for (const k of PREF_KEYS) {
        fd.append(k, next[k] ? "on" : "off");
      }
      const { updateNotificationPreferences } = await import(
        "@/features/notifications/server/actions"
      );
      await updateNotificationPreferences(fd);
    });
  };

  const handleLogout = async () => {
    const { logoutUser } = await import("@/features/auth/server/actions");
    await logoutUser();
    router.push("/login");
  };

  const displayName = user?.fullName || "Student";
  const initial = displayName.charAt(0).toUpperCase() || "U";

  return (
    <div className="uf-settings-page">
      <style>{settingsStyles}</style>

      <div className="uf-settings-shell">
        <header className="uf-settings-header">
          <h1>Settings</h1>
          <p>Manage your account, preferences, and notifications.</p>
        </header>

        {/* Account */}
        <section className="uf-card uf-settings-card">
          <h3 className="uf-settings-title">Account</h3>
          <div className="uf-settings-account">
            <div className="uf-settings-avatar">
              {user?.image ? (
                <img src={user.image} alt={displayName} />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="uf-settings-account-info">
              <strong>{displayName}</strong>
              <span>{user?.email || ""}</span>
            </div>
            <Link href="/profile/edit" className="uf-settings-link-btn">
              Edit profile
            </Link>
          </div>
        </section>

        {/* Language */}
        <section className="uf-card uf-settings-card">
          <h3 className="uf-settings-title">Interface Language</h3>
          <div className="uf-lang-buttons">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`uf-lang-btn ${language === opt.value ? "active" : ""}`}
                onClick={() => setLanguage(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Notification preferences */}
        <section className="uf-card uf-settings-card">
          <h3 className="uf-settings-title">Notification Preferences</h3>
          <div className="uf-notif-prefs-list">
            {PREF_KEYS.map((key) => (
              <label key={key} className="uf-notif-pref-row">
                <span>{labels[key] || key}</span>
                <button
                  type="button"
                  className={`uf-toggle ${prefs[key] ? "on" : "off"}`}
                  onClick={() => handleToggle(key)}
                  disabled={isPending}
                >
                  <span className="uf-toggle-knob" />
                </button>
              </label>
            ))}
          </div>
        </section>

        {/* Privacy & safety */}
        <section className="uf-card uf-settings-card">
          <h3 className="uf-settings-title">Privacy & Safety</h3>
          <div className="uf-settings-links">
            <Link href="/blocked" className="uf-settings-row-link">
              <span className="uf-settings-row-icon">
                <UiIcon name="shield" size={18} />
              </span>
              <span className="uf-settings-row-text">
                <strong>Blocked users</strong>
                <small>Manage people you have blocked</small>
              </span>
              <span className="uf-settings-row-chevron">
                <UiIcon name="chevron-down" size={16} />
              </span>
            </Link>
            <Link href="/friends" className="uf-settings-row-link">
              <span className="uf-settings-row-icon">
                <UiIcon name="users" size={18} />
              </span>
              <span className="uf-settings-row-text">
                <strong>Friends & connections</strong>
                <small>Review your connections</small>
              </span>
              <span className="uf-settings-row-chevron">
                <UiIcon name="chevron-down" size={16} />
              </span>
            </Link>
          </div>
        </section>

        {/* Support */}
        <section className="uf-card uf-settings-card">
          <h3 className="uf-settings-title">Support</h3>
          <div className="uf-settings-links">
            <Link href="/help" className="uf-settings-row-link">
              <span className="uf-settings-row-icon">
                <UiIcon name="help" size={18} />
              </span>
              <span className="uf-settings-row-text">
                <strong>Help & Support</strong>
                <small>Get help and contact the UFAR team</small>
              </span>
              <span className="uf-settings-row-chevron">
                <UiIcon name="chevron-down" size={16} />
              </span>
            </Link>
          </div>
        </section>

        {/* Danger zone */}
        <section className="uf-card uf-settings-card uf-settings-danger">
          <h3 className="uf-settings-title">Account actions</h3>
          <button type="button" className="uf-logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </section>
      </div>
    </div>
  );
}

const settingsStyles = `
.uf-settings-page {
  width: 100%;
  min-width: 0;
}

.uf-settings-shell {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.uf-settings-header {
  padding: 4px 2px 4px;
}

.uf-settings-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.uf-settings-header p {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 600;
}

.uf-card {
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.uf-settings-card {
  padding: 22px 24px;
}

.uf-settings-title {
  margin: 0 0 18px;
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

/* Account block */
.uf-settings-account {
  display: flex;
  align-items: center;
  gap: 14px;
}

.uf-settings-avatar {
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  border-radius: 999px;
  overflow: hidden;
  background: #0b3aa8;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 900;
}

.uf-settings-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.uf-settings-account-info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.uf-settings-account-info strong {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-settings-account-info span {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-settings-link-btn {
  flex: 0 0 auto;
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  background: #0b3aa8;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 14px;
  font-weight: 800;
  border: 1px solid #0b3aa8;
  transition: background 0.2s ease;
}

.uf-settings-link-btn:hover {
  background: #062fae;
}

/* Language buttons */
.uf-lang-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.uf-lang-btn {
  min-height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  background: #f4f7fb;
  color: #475569;
  border: 1px solid #d9e2ef;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.uf-lang-btn:hover {
  background: #eef4ff;
  color: #0b3aa8;
  border-color: #0b3aa8;
}

.uf-lang-btn.active {
  background: #0b3aa8;
  color: #ffffff;
  border-color: #0b3aa8;
}

/* Notification toggles */
.uf-notif-prefs-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.uf-notif-pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #e7edf5;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
}

.uf-notif-pref-row:last-child {
  border-bottom: none;
}

.uf-toggle {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
  flex: 0 0 44px;
}

.uf-toggle.on {
  background: #0b3aa8;
}

.uf-toggle.off {
  background: #cbd5e1;
}

.uf-toggle-knob {
  position: absolute;
  top: 2px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: left 0.2s ease;
}

.uf-toggle.on .uf-toggle-knob {
  left: 22px;
}

.uf-toggle.off .uf-toggle-knob {
  left: 2px;
}

/* Link rows */
.uf-settings-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.uf-settings-row-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 10px;
  border-radius: 12px;
  text-decoration: none;
  color: #0f172a;
  transition: background 0.15s ease;
}

.uf-settings-row-link:hover {
  background: #f4f7fb;
}

.uf-settings-row-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 10px;
  background: #eef4ff;
  color: #0b3aa8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.uf-settings-row-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.uf-settings-row-text strong {
  font-size: 14px;
  font-weight: 800;
}

.uf-settings-row-text small {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.uf-settings-row-chevron {
  flex: 0 0 auto;
  color: var(--text-muted);
  display: inline-flex;
  transform: rotate(-90deg);
}

/* Danger zone */
.uf-settings-danger {
  border-color: #fecaca;
}

.uf-logout-btn {
  min-height: 42px;
  padding: 0 24px;
  border-radius: 10px;
  background: #ffffff;
  color: #dc2626;
  border: 1px solid #fecaca;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.uf-logout-btn:hover {
  background: #fef2f2;
  border-color: #dc2626;
}

@media (max-width: 640px) {
  .uf-settings-account {
    flex-wrap: wrap;
  }

  .uf-settings-link-btn {
    width: 100%;
  }
}
`;
