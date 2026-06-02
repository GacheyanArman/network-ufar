"use client";

import { useState, useTransition } from "react";
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
    academic: "Ուսումնական ժամկետներ",
    events: "Իրադարձություններ",
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

export default function ProfileSettingsClient({ prefs: initialPrefs }) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("preferences");
  
  // Placeholder local state for display purposes
  const [theme, setTheme] = useState("system");
  const [privacy, setPrivacy] = useState("public");

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
    <div className="uf-settings-container">
      <style>{settingsStyles}</style>

      <div className="uf-settings-sidebar">
        <button
          className={`uf-settings-tab ${activeTab === "preferences" ? "active" : ""}`}
          onClick={() => setActiveTab("preferences")}
        >
          <UiIcon name="settings" size={16} /> Preferences
        </button>
        <button
          className={`uf-settings-tab ${activeTab === "appearance" ? "active" : ""}`}
          onClick={() => setActiveTab("appearance")}
        >
          <UiIcon name="eye" size={16} /> Appearance
        </button>
        <button
          className={`uf-settings-tab ${activeTab === "privacy" ? "active" : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          <UiIcon name="shield-check" size={16} /> Privacy & Security
        </button>
        <button
          className={`uf-settings-tab ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}
        >
          <UiIcon name="user" size={16} /> Account Data
        </button>
      </div>

      <div className="uf-settings-content">
        {activeTab === "preferences" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">General Preferences</h2>
            <p className="uf-settings-desc">Manage your language and notifications.</p>
            
            <div className="uf-settings-group">
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

            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Push Notifications</h3>
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
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">Appearance</h2>
            <p className="uf-settings-desc">Customize how UFARnet looks on your device.</p>
            
            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Theme</h3>
              <div className="uf-theme-options">
                {['light', 'dark', 'system'].map((t) => (
                  <label key={t} className={`uf-theme-card ${theme === t ? "active" : ""}`}>
                    <input type="radio" name="theme" checked={theme === t} onChange={() => setTheme(t)} hidden />
                    <div className={`uf-theme-preview ${t}`}></div>
                    <span className="uf-theme-name">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Accessibility</h3>
              <label className="uf-notif-pref-row">
                <span>Reduce motion (animations)</span>
                <button type="button" className="uf-toggle off">
                  <span className="uf-toggle-knob" />
                </button>
              </label>
              <label className="uf-notif-pref-row">
                <span>High contrast text</span>
                <button type="button" className="uf-toggle off">
                  <span className="uf-toggle-knob" />
                </button>
              </label>
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">Privacy & Security</h2>
            <p className="uf-settings-desc">Control who can see your information and keep your account secure.</p>
            
            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Profile Visibility</h3>
              <select 
                className="uf-select-input" 
                value={privacy} 
                onChange={(e) => setPrivacy(e.target.value)}
              >
                <option value="public">Public (Everyone on UFARnet)</option>
                <option value="friends">Only My Connections</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Activity Status</h3>
              <label className="uf-notif-pref-row">
                <div>
                  <span style={{display:"block", marginBottom: 4}}>Show when you're online</span>
                  <span style={{fontSize: 12, color: "var(--text-muted)", fontWeight: "normal"}}>Allow friends to see your active status in messages.</span>
                </div>
                <button type="button" className="uf-toggle on">
                  <span className="uf-toggle-knob" />
                </button>
              </label>
            </div>

            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Security</h3>
              <button className="uf-action-btn">Change Password</button>
              <button className="uf-action-btn" style={{marginLeft: 12}}>Enable Two-Factor Auth</button>
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">Account Data</h2>
            <p className="uf-settings-desc">Manage your personal data and account status.</p>
            
            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Your Data</h3>
              <p style={{fontSize: 14, color: "var(--text-secondary)", marginBottom: 16}}>
                You can request a copy of your personal data, posts, and messages.
              </p>
              <button className="uf-action-btn">Download Archive</button>
            </div>
            
            <div className="uf-settings-group uf-settings-danger">
              <h3 className="uf-settings-title" style={{color: "#dc2626"}}>Danger Zone</h3>
              <p style={{fontSize: 14, color: "var(--text-secondary)", marginBottom: 16}}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <div style={{display: "flex", gap: 12, alignItems: "center"}}>
                <button
                  type="button"
                  className="uf-logout-btn"
                  onClick={handleLogout}
                >
                  Log out
                </button>
                <button className="uf-logout-btn" style={{background: "#dc2626", color: "#fff", border: "none"}}>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const settingsStyles = `
.uf-settings-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 768px) {
  .uf-settings-container {
    flex-direction: row;
    align-items: flex-start;
  }
}

.uf-settings-sidebar {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  gap: 8px;
  width: 100%;
  border-bottom: 1px solid #e7edf5;
  padding-bottom: 12px;
}

@media (min-width: 768px) {
  .uf-settings-sidebar {
    flex-direction: column;
    width: 220px;
    flex-shrink: 0;
    border-bottom: none;
    border-right: 1px solid #e7edf5;
    padding-bottom: 0;
    padding-right: 20px;
  }
}

.uf-settings-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.uf-settings-tab:hover {
  background: #f4f7fb;
  color: #334155;
}

.uf-settings-tab.active {
  background: #eef4ff;
  color: #0b3aa8;
}

.uf-settings-content {
  flex: 1;
  min-width: 0;
}

.uf-settings-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.uf-settings-header {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.uf-settings-desc {
  margin: 6px 0 0;
  font-size: 14px;
  color: #64748b;
}

.uf-settings-group {
  background: #ffffff;
}

.uf-settings-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 800;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Language buttons */
.uf-lang-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.uf-lang-btn {
  min-height: 42px;
  padding: 0 24px;
  border-radius: 12px;
  background: #f8fafc;
  color: #475569;
  border: 2px solid transparent;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.uf-lang-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.uf-lang-btn.active {
  background: #eef4ff;
  color: #0b3aa8;
  border-color: #0b3aa8;
}

/* Notification toggles */
.uf-notif-prefs-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.uf-notif-pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 15px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  background: #fff;
  transition: background 0.15s;
}

.uf-notif-pref-row:hover {
  background: #f8fafc;
}

.uf-notif-pref-row:last-child {
  border-bottom: none;
}

.uf-toggle {
  position: relative;
  width: 48px;
  height: 26px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
  flex: 0 0 48px;
}

.uf-toggle.on {
  background: #0b3aa8;
}

.uf-toggle.off {
  background: #cbd5e1;
}

.uf-toggle-knob {
  position: absolute;
  top: 3px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: left 0.2s ease;
}

.uf-toggle.on .uf-toggle-knob {
  left: 25px;
}

.uf-toggle.off .uf-toggle-knob {
  left: 3px;
}

/* Form inputs */
.uf-select-input {
  width: 100%;
  max-width: 400px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  font-size: 15px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.2s;
}

.uf-select-input:focus {
  border-color: #0b3aa8;
}

.uf-action-btn {
  padding: 12px 20px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #0f172a;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.uf-action-btn:hover {
  background: #e2e8f0;
}

/* Theme previews */
.uf-theme-options {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.uf-theme-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}

.uf-theme-preview {
  width: 100px;
  height: 70px;
  border-radius: 12px;
  border: 2px solid transparent;
  background-size: cover;
  transition: all 0.2s;
}

.uf-theme-preview.light { background: #f8fafc; border: 1px solid #e2e8f0; }
.uf-theme-preview.dark { background: #0f172a; }
.uf-theme-preview.system { background: linear-gradient(135deg, #f8fafc 50%, #0f172a 50%); border: 1px solid #e2e8f0; }

.uf-theme-card.active .uf-theme-preview {
  border-color: #0b3aa8;
  box-shadow: 0 0 0 2px rgba(11, 58, 168, 0.2);
}

.uf-theme-name {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.uf-theme-card.active .uf-theme-name {
  color: #0b3aa8;
}

/* Danger zone */
.uf-settings-danger {
  border-top: 1px solid #fecaca;
  padding-top: 24px;
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
