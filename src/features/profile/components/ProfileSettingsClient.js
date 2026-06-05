"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/shared/ui/UiIcon";
import "./ProfileSettings.css";

const PREF_KEYS = ["academic", "events", "photos", "messages", "materials", "social"];

const SETTINGS_LABELS = {
  en: {
    prefs: {
      academic: { title: "Academic deadlines", desc: "Get notified about upcoming assignments, exams, and important academic dates." },
      events: { title: "Events", desc: "Receive alerts for new campus events, club meetings, and activities." },
      photos: { title: "Photos", desc: "Get notified when someone tags you in a photo or uploads a new gallery." },
      messages: { title: "Messages", desc: "Receive push notifications for new direct messages and group chats." },
      materials: { title: "Materials", desc: "Know when new study materials, notes, or resources are uploaded to your courses." },
      social: { title: "Social activity", desc: "Get alerts for likes, comments, mentions, and new followers." },
    },
    tabs: {
      account: "Account",
      preferences: "Preferences",
      privacy: "Privacy",
      security: "Security",
    },
  },
  fr: {
    prefs: {
      academic: { title: "Échéances académiques", desc: "Soyez informé des devoirs à venir, des examens et des dates importantes." },
      events: { title: "Événements", desc: "Recevez des alertes pour les nouveaux événements du campus et les réunions de club." },
      photos: { title: "Photos", desc: "Soyez informé lorsque quelqu'un vous identifie sur une photo." },
      messages: { title: "Messages", desc: "Recevez des notifications pour les nouveaux messages directs et groupes." },
      materials: { title: "Matériaux", desc: "Sachez quand de nouveaux supports d'étude sont téléchargés." },
      social: { title: "Activité sociale", desc: "Recevez des alertes pour les mentions j'aime, les commentaires et les abonnés." },
    },
    tabs: {
      account: "Compte",
      preferences: "Préférences",
      privacy: "Confidentialité",
      security: "Sécurité",
    },
  },
  hy: {
    prefs: {
      academic: { title: "Ուսումնական ժամկետներ", desc: "Ստացեք ծանուցումներ առաջիկա հանձնարարությունների, քննությունների և կարևոր ժամկետների մասին:" },
      events: { title: "Իրադարձություններ", desc: "Ստացեք ծանուցումներ համալսարանական նոր իրադարձությունների վերաբերյալ:" },
      photos: { title: "Լուսանկարներ", desc: "Ստացեք ծանուցումներ, երբ որևէ մեկը նշում է ձեզ լուսանկարում:" },
      messages: { title: "Հաղորդագրություններ", desc: "Ստացեք ծանուցումներ նոր անձնական և խմբային հաղորդագրությունների համար:" },
      materials: { title: "Նյութեր", desc: "Իմացեք, երբ նոր ուսումնական նյութեր կամ ռեսուրսներ են վերբեռնվում:" },
      social: { title: "Սոցիալական ակտիվություն", desc: "Ստացեք ծանուցումներ հավանումների, մեկնաբանությունների և նոր հետևորդների մասին:" },
    },
    tabs: {
      account: "Հաշիվ",
      preferences: "Նախընտրություններ",
      privacy: "Գաղտնիություն",
      security: "Անվտանգություն",
    },
  },
};

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "hy", label: "Հայերեն" },
];

export default function ProfileSettingsClient({ user, prefs: initialPrefs }) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("account");
  
  // Real persisted state
  const [prefs, setPrefs] = useState(initialPrefs);
  const [privacy, setPrivacy] = useState(user?.privacyLevel || "public");
  
  // Transitions & Loading states
  const [isPendingNotif, startTransitionNotif] = useTransition();
  const [isPendingPrivacy, startTransitionPrivacy] = useTransition();
  const [isPendingPassword, startTransitionPassword] = useTransition();
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const labels = SETTINGS_LABELS[language] || SETTINGS_LABELS.en;

  const handleToggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);

    startTransitionNotif(async () => {
      const fd = new FormData();
      for (const k of PREF_KEYS) {
        fd.append(k, next[k] ? "on" : "off");
      }
      try {
        const { updateNotificationPreferences } = await import("@/features/notifications/server/actions");
        await updateNotificationPreferences(fd);
        showToast("Preferences saved.");
      } catch (err) {
        showToast("Failed to save preferences.", "error");
        setPrefs(initialPrefs); // revert on error
      }
    });
  };

  const handlePrivacyChange = (e) => {
    const newPrivacy = e.target.value;
    setPrivacy(newPrivacy);

    startTransitionPrivacy(async () => {
      try {
        const { updatePrivacySettings } = await import("@/features/profile/server/actions");
        const res = await updatePrivacySettings(newPrivacy);
        if (res?.error) {
          showToast(res.error, "error");
          setPrivacy(user?.privacyLevel || "public");
        } else {
          showToast("Privacy settings saved.");
        }
      } catch (err) {
        showToast("Failed to save privacy.", "error");
        setPrivacy(user?.privacyLevel || "public");
      }
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast("Please fill all password fields.", "error");
      return;
    }

    startTransitionPassword(async () => {
      try {
        const { changePassword } = await import("@/features/profile/server/actions");
        const res = await changePassword(currentPassword, newPassword);
        if (res?.error) {
          showToast(res.error, "error");
        } else {
          showToast("Password updated successfully.");
          setCurrentPassword("");
          setNewPassword("");
        }
      } catch (err) {
        showToast("Failed to change password.", "error");
      }
    });
  };

  const handleLogout = async () => {
    const { logoutUser } = await import("@/features/auth/server/actions");
    await logoutUser();
    router.push("/login");
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return "Unknown";
    return new Date(dateInput).toLocaleDateString(language, {
      year: "numeric", month: "long", day: "numeric"
    });
  };

  return (
    <div className="uf-settings-container">
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <UiIcon name={t.type === "success" ? "check-circle" : "x-circle"} size={18} />
            {t.message}
          </div>
        ))}
      </div>

      <div className="uf-settings-sidebar">
        <button
          className={`uf-settings-tab ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}
        >
          <UiIcon name="user" size={16} /> {labels.tabs.account}
        </button>
        <button
          className={`uf-settings-tab ${activeTab === "preferences" ? "active" : ""}`}
          onClick={() => setActiveTab("preferences")}
        >
          <UiIcon name="settings" size={16} /> {labels.tabs.preferences}
        </button>
        <button
          className={`uf-settings-tab ${activeTab === "privacy" ? "active" : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          <UiIcon name="eye" size={16} /> {labels.tabs.privacy}
        </button>
        <button
          className={`uf-settings-tab ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <UiIcon name="shield-check" size={16} /> {labels.tabs.security}
        </button>
      </div>

      <div className="uf-settings-content">
        {/* ACCOUNT TAB */}
        {activeTab === "account" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">Account Information</h2>
            <p className="uf-settings-desc">Basic details about your UFARnet account.</p>
            
            <div className="uf-settings-group">
              <div className="uf-account-info-grid">
                <div className="uf-account-info-label">Full Name</div>
                <div>{user?.fullName || "Not set"}</div>
                
                <div className="uf-account-info-label">Username</div>
                <div>@{user?.username || "unknown"}</div>
                
                <div className="uf-account-info-label">Email</div>
                <div>{user?.email}</div>
                
                <div className="uf-account-info-label">Role</div>
                <div style={{textTransform: "capitalize"}}>{user?.role || "user"}</div>
                
                <div className="uf-account-info-label">Joined</div>
                <div>{formatDate(user?.createdAt)}</div>
              </div>

              <Link href="/profile/edit" className="uf-action-btn">
                Edit Profile
              </Link>
            </div>
          </div>
        )}

        {/* PREFERENCES TAB */}
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
                  <div key={key} className="uf-notif-pref-row" onClick={() => handleToggle(key)}>
                    <button
                      type="button"
                      className={`uf-toggle ${prefs[key] ? "on" : "off"}`}
                      onClick={(e) => { e.stopPropagation(); handleToggle(key); }}
                      disabled={isPendingNotif}
                      aria-label={`Toggle ${labels.prefs[key]?.title || key}`}
                    >
                      <span className="uf-toggle-knob" />
                    </button>
                    <div className="uf-notif-pref-info">
                      <span className="uf-notif-pref-title">{labels.prefs[key]?.title || key}</span>
                      <span className="uf-notif-pref-desc">{labels.prefs[key]?.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PRIVACY TAB */}
        {activeTab === "privacy" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">Privacy</h2>
            <p className="uf-settings-desc">Control who can see your profile and manage blocked users.</p>
            
            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Profile Visibility</h3>
              <p style={{fontSize: 14, color: "var(--text-secondary)", marginBottom: 12}}>
                Choose who can view your posts, courses, and full profile.
              </p>
              <select 
                className="uf-select-input" 
                value={privacy} 
                onChange={handlePrivacyChange}
                disabled={isPendingPrivacy}
              >
                <option value="public">Public (Everyone on UFARnet)</option>
                <option value="friends">Only My Connections / Friends</option>
                <option value="private">Private (Only me)</option>
              </select>
              {isPendingPrivacy && <span style={{fontSize: 13, color: "#64748b", marginLeft: 12}}>Saving...</span>}
            </div>

            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Blocked Users</h3>
              <p style={{fontSize: 14, color: "var(--text-secondary)", marginBottom: 16}}>
                Manage users you've blocked. They cannot see your content or send you messages.
              </p>
              <Link href="/blocked" className="uf-action-btn">
                Manage Blocked Users
              </Link>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === "security" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">Security</h2>
            <p className="uf-settings-desc">Protect your account and manage authentication.</p>
            
            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Email Verification</h3>
              <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 24}}>
                {user?.emailVerified ? (
                  <>
                    <UiIcon name="check-circle" size={20} color="#10b981" />
                    <span style={{fontWeight: 600, color: "#0f172a"}}>Verified</span>
                  </>
                ) : (
                  <>
                    <UiIcon name="alert-triangle" size={20} color="#f59e0b" />
                    <span style={{fontWeight: 600, color: "#f59e0b"}}>Not Verified</span>
                    <button className="uf-action-btn" style={{padding: "6px 12px", marginLeft: "auto"}}>
                      Verify Now
                    </button>
                  </>
                )}
              </div>

              <h3 className="uf-settings-title" style={{marginTop: 32}}>Change Password</h3>
              <form onSubmit={handlePasswordSubmit} style={{maxWidth: 400}}>
                <div style={{marginBottom: 16}}>
                  <input
                    type="password"
                    placeholder="Current Password"
                    className="uf-input-field"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="New Password (min 8 chars)"
                    className="uf-input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <button 
                  type="submit" 
                  className="uf-action-btn uf-action-btn-primary"
                  disabled={isPendingPassword || !currentPassword || !newPassword}
                >
                  {isPendingPassword ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>

            <div className="uf-settings-group uf-settings-danger">
              <h3 className="uf-settings-title" style={{color: "#dc2626"}}>Session Management</h3>
              <p style={{fontSize: 14, color: "var(--text-secondary)", marginBottom: 16}}>
                Log out of your account on this device.
              </p>
              <button
                type="button"
                className="uf-logout-btn"
                onClick={handleLogout}
              >
                <UiIcon name="log-out" size={16} /> Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
