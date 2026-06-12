"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
      privacy: "Privacy",
      notifications: "Notifications",
      language: "Language",
      password: "Password",
      deleteAccount: "Delete account",
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
      privacy: "Confidentialité",
      notifications: "Notifications",
      language: "Langue",
      password: "Mot de passe",
      deleteAccount: "Supprimer le compte",
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
      privacy: "Գաղտնիություն",
      notifications: "Ծանուցումներ",
      language: "Լեզու",
      password: "Գաղտնաբառ",
      deleteAccount: "Ջնջել հաշիվը",
    },
  },
};

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "hy", label: "Հայերեն" },
];

const TABS = [
  { key: "account", icon: "user" },
  { key: "privacy", icon: "eye" },
  { key: "notifications", icon: "bell" },
  { key: "language", icon: "globe" },
  { key: "password", icon: "shield-check" },
  { key: "deleteAccount", icon: "alert-triangle", danger: true },
];

export default function ProfileSettingsClient({ user, prefs: initialPrefs, blocked: initialBlocked = [], initialTab = "account" }) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(initialTab);

  // Real persisted state
  const [prefs, setPrefs] = useState(initialPrefs);
  const [privacy, setPrivacy] = useState(user?.privacyLevel || "public");
  const [blockedList, setBlockedList] = useState(initialBlocked);

  // Transitions & Loading states
  const [isPendingNotif, startTransitionNotif] = useTransition();
  const [isPendingPrivacy, startTransitionPrivacy] = useTransition();
  const [isPendingPassword, startTransitionPassword] = useTransition();
  const [isPendingUnblock, startTransitionUnblock] = useTransition();
  const [isPendingDelete, startTransitionDelete] = useTransition();

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(false);

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

  const handleUnblock = (blockedId) => {
    startTransitionUnblock(async () => {
      try {
        const { unblockUser } = await import("@/features/profile/server/block");
        const fd = new FormData();
        fd.append("blockedId", blockedId);
        const res = await unblockUser(fd);
        if (res?.success) {
          setBlockedList((prev) => prev.filter((b) => b.blockedId !== blockedId));
          showToast("User unblocked.");
        } else {
          showToast(res?.error || "Failed to unblock user.", "error");
        }
      } catch (err) {
        showToast("Failed to unblock user.", "error");
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

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      showToast("Please enter your password to confirm.", "error");
      return;
    }
    if (!deleteConfirmStep) {
      setDeleteConfirmStep(true);
      return;
    }

    startTransitionDelete(async () => {
      try {
        const { deleteAccount } = await import("@/features/profile/server/actions");
        const res = await deleteAccount(deletePassword);
        if (res?.error) {
          showToast(res.error, "error");
          setDeleteConfirmStep(false);
        } else {
          router.push("/login");
        }
      } catch (err) {
        showToast("Failed to delete account.", "error");
        setDeleteConfirmStep(false);
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
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`uf-settings-tab ${activeTab === tab.key ? "active" : ""} ${tab.danger ? "uf-settings-tab-danger" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <UiIcon name={tab.icon} size={16} /> {labels.tabs[tab.key]}
          </button>
        ))}
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

            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Email Verification</h3>
              <div style={{display: "flex", alignItems: "center", gap: 8}}>
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
            </div>

            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Session</h3>
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
                Users you&apos;ve blocked can&apos;t see your content or send you messages.
              </p>

              {blockedList.length === 0 ? (
                <p style={{fontSize: 14, color: "var(--text-secondary)", margin: 0}}>
                  You haven&apos;t blocked anyone.
                </p>
              ) : (
                <div className="uf-blocked-list">
                  {blockedList.map((block) => {
                    const initial = block.blockedUserName?.charAt(0).toUpperCase() || "U";
                    return (
                      <div key={block.id} className="uf-blocked-row">
                        <Link href={`/profile/${block.blockedId}`} className="uf-blocked-user">
                          {block.blockedUserImage ? (
                            <Image
                              src={block.blockedUserImage}
                              alt={block.blockedUserName || "User"}
                              width={40}
                              height={40}
                              className="uf-blocked-avatar"
                            />
                          ) : (
                            <div className="uf-blocked-avatar uf-blocked-avatar-blank">{initial}</div>
                          )}
                          <div className="uf-blocked-user-info">
                            <span className="uf-blocked-user-name">{block.blockedUserName}</span>
                            {block.blockedUserUsername ? (
                              <span className="uf-blocked-user-username">@{block.blockedUserUsername}</span>
                            ) : null}
                          </div>
                        </Link>
                        <button
                          type="button"
                          className="uf-action-btn"
                          style={{padding: "8px 14px"}}
                          onClick={() => handleUnblock(block.blockedId)}
                          disabled={isPendingUnblock}
                        >
                          {isPendingUnblock ? "..." : "Unblock"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">Notifications</h2>
            <p className="uf-settings-desc">Choose which push notifications you want to receive.</p>

            <div className="uf-settings-group">
              <div className="uf-notif-prefs-list">
                {PREF_KEYS.map((key) => (
                  <div key={key} className="uf-notif-pref-row" onClick={() => handleToggle(key)}>
                    <div className="uf-notif-pref-info">
                      <span className="uf-notif-pref-title">{labels.prefs[key]?.title || key}</span>
                      <span className="uf-notif-pref-desc">{labels.prefs[key]?.desc}</span>
                    </div>
                    <button
                      type="button"
                      className={`uf-toggle ${prefs[key] ? "on" : "off"}`}
                      onClick={(e) => { e.stopPropagation(); handleToggle(key); }}
                      disabled={isPendingNotif}
                      aria-label={`Toggle ${labels.prefs[key]?.title || key}`}
                    >
                      <span className="uf-toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LANGUAGE TAB */}
        {activeTab === "language" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">Language</h2>
            <p className="uf-settings-desc">Choose the interface language.</p>

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
          </div>
        )}

        {/* PASSWORD TAB */}
        {activeTab === "password" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header">Password</h2>
            <p className="uf-settings-desc">Change the password you use to log in.</p>

            <div className="uf-settings-group">
              <h3 className="uf-settings-title">Change Password</h3>
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
          </div>
        )}

        {/* DELETE ACCOUNT TAB */}
        {activeTab === "deleteAccount" && (
          <div className="uf-settings-section fade-in">
            <h2 className="uf-settings-header" style={{color: "#dc2626"}}>Delete account</h2>
            <p className="uf-settings-desc">Permanently delete your UFARnet account.</p>

            <div className="uf-settings-group uf-settings-danger">
              <h3 className="uf-settings-title" style={{color: "#dc2626"}}>Delete / Deactivate account</h3>
              <p style={{fontSize: 14, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5}}>
                This will permanently delete your account, profile, posts, messages, photos, and all other data.
                This action cannot be undone.
              </p>
              <div style={{maxWidth: 400}}>
                <input
                  type="password"
                  placeholder="Enter your password to confirm"
                  className="uf-input-field"
                  value={deletePassword}
                  onChange={(e) => { setDeletePassword(e.target.value); setDeleteConfirmStep(false); }}
                  style={{marginBottom: 16}}
                />
                {deleteConfirmStep ? (
                  <p style={{fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 12}}>
                    Are you sure? This is permanent. Click again to confirm.
                  </p>
                ) : null}
                <div style={{display: "flex", gap: 12}}>
                  <button
                    type="button"
                    className="uf-delete-account-btn"
                    onClick={handleDeleteAccount}
                    disabled={isPendingDelete || !deletePassword}
                  >
                    {isPendingDelete
                      ? "Deleting..."
                      : deleteConfirmStep
                        ? "Yes, delete my account"
                        : "Delete my account"}
                  </button>
                  {deleteConfirmStep && !isPendingDelete ? (
                    <button
                      type="button"
                      className="uf-action-btn"
                      onClick={() => setDeleteConfirmStep(false)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
