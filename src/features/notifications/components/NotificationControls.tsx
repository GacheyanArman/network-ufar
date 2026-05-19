"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";

const CATEGORIES = [
  { key: "all", icon: "bell" },
  { key: "social", icon: "heart" },
  { key: "academic", icon: "graduation" },
  { key: "events", icon: "calendar" },
  { key: "materials", icon: "file" },
  { key: "photos", icon: "camera" },
  { key: "messages", icon: "mail" },
] as const;

const PREF_KEYS = ["academic", "events", "photos", "messages", "materials", "social"] as const;

type PrefKey = typeof PREF_KEYS[number];
type Prefs = Record<PrefKey, boolean>;

export default function NotificationControls({ prefs }: { prefs: Prefs }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("cat") || "all";
  const { language } = useLanguage();
  const t = translations[language]?.notifications || translations.en.notifications;
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "all") params.delete("cat");
    else params.set("cat", cat);
    const qs = params.toString();
    router.push(`/notifications${qs ? `?${qs}` : ""}`);
  };

  const handleToggle = (key: PrefKey) => {
    startTransition(async () => {
      const fd = new FormData();
      for (const k of PREF_KEYS) {
        if (k === key) {
          fd.append(k, prefs[k] ? "off" : "on");
        } else {
          fd.append(k, prefs[k] ? "on" : "off");
        }
      }
      const { updateNotificationPreferences } = await import("@/features/notifications/server/actions");
      await updateNotificationPreferences(fd);
    });
  };

  return (
    <div className="uf-notif-controls">
      <div className="uf-notif-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            className={`uf-notif-filter ${activeFilter === cat.key ? "active" : ""}`}
            onClick={() => handleFilterChange(cat.key)}
          >
            <UiIcon name={cat.icon} size={14} />
            <span>{(t.categories as Record<string, string> | undefined)?.[cat.key] || cat.key}</span>
          </button>
        ))}
      </div>

      <div className="uf-notif-prefs">
        <div className="uf-notif-prefs-title">
          <UiIcon name="settings" size={14} />
          <span>{t.prefsTitle}</span>
        </div>
        <div className="uf-notif-prefs-grid">
          {PREF_KEYS.map((key) => (
            <label key={key} className="uf-notif-pref-item">
              <span className="uf-notif-pref-label">
                {(t.prefs as Record<string, string> | undefined)?.[key] || key}
              </span>
              <button
                type="button"
                className={`uf-notif-toggle ${prefs[key] ? "on" : "off"}`}
                onClick={() => handleToggle(key)}
                disabled={isPending}
              >
                <span className="uf-notif-toggle-knob" />
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
