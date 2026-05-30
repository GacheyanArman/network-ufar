"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

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
    academic: " Delays / deadlines",
    events: "Իрав / Events",
    photos: "Լусанкар / Photos",
    messages: "Հdelays / Messages",
    materials: "Նdelays / Materials",
    social: "Социальdelays / Social",
  },
};

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "hy", label: "Հայeratively" },
];

export default function ProfileSettingsClient({ prefs: initialPrefs }) {
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

  return (
    <>
      <style>{settingsStyles}</style>

      {/* Language */}
      <div className="uf-card uf-settings-card">
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
      </div>

      {/* Notification preferences */}
      <div className="uf-card uf-settings-card">
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
      </div>

      {/* Danger zone */}
      <div className="uf-card uf-settings-card uf-settings-danger">
        <h3 className="uf-settings-title">Account</h3>
        <button
          type="button"
          className="uf-logout-btn"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    </>
  );
}

const settingsStyles = `
.uf-settings-card {
  padding: 24px;
}

.uf-settings-title {
  margin: 0 0 18px;
  font-size: 17px;
  font-weight: 900;
  color: #0f172a;
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
`;
