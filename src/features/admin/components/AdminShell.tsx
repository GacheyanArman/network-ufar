"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UiIcon from "@/shared/ui/UiIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/shared/i18n/i18n";

type AdminNavProps = {
  stats: {
    pendingMaterials: number;
    pendingPhotos: number;
    openReports: number;
    pendingEvents: number;
    pendingBookRequests: number;
    pendingResources: number;
    pendingCommunities: number;
    totalUsers: number;
    bannedUsers: number;
  };
};

const NAV_ITEMS: Array<{ href: string; icon: string; labelKey: string; badgeKey?: string }> = [
  { href: "/admin", icon: "grid", labelKey: "admin.nav.dashboard" },
  { href: "/admin/materials", icon: "folder", labelKey: "admin.nav.materials", badgeKey: "pendingMaterials" },
  { href: "/admin/photos", icon: "image", labelKey: "admin.nav.photos", badgeKey: "pendingPhotos" },
  { href: "/admin/reports", icon: "flag", labelKey: "admin.nav.reports", badgeKey: "openReports" },
  { href: "/admin/events", icon: "calendar", labelKey: "admin.nav.events", badgeKey: "pendingEvents" },
  { href: "/admin/library", icon: "book", labelKey: "admin.nav.library" },
  { href: "/admin/communities", icon: "group", labelKey: "admin.nav.communities", badgeKey: "pendingCommunities" },
  { href: "/admin/users", icon: "user", labelKey: "admin.nav.users" },
  { href: "/admin/audit", icon: "shield", labelKey: "admin.nav.audit" },
];

export default function AdminShell({ children, stats }: { children: React.ReactNode; stats: AdminNavProps["stats"] }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = (translations[language] || translations.en).admin || translations.en.admin;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-hover)" }}>
      <aside
        style={{
          width: 240,
          background: "var(--text-primary)",
          color: "var(--border-color)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid #1e293b",
        }}
      >
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #0b3aa8, #062fae)",
              color: "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            U
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: "var(--bg-card)" }}>UFARnet</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
              Admin
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "8px 0" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const badge = item.badgeKey ? stats[item.badgeKey as keyof typeof stats] || 0 : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  textDecoration: "none",
                  color: isActive ? "var(--bg-card)" : "var(--text-muted)",
                  background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                  borderRight: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  transition: "all 0.15s",
                }}
              >
                <UiIcon name={item.icon} size={16} />
                <span style={{ flex: 1 }}>{(t?.nav as Record<string, string> | undefined)?.[item.labelKey.split(".")[2]] || item.labelKey.split(".")[2]}</span>
                {badge > 0 && (
                  <span
                    style={{
                      background: badge > 0 ? "var(--danger)" : "var(--text-secondary)",
                      color: "var(--bg-card)",
                      borderRadius: 999,
                      padding: "2px 7px",
                      fontSize: 11,
                      fontWeight: 700,
                      minWidth: 20,
                      textAlign: "center",
                    }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-muted)",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            <UiIcon name="arrow-left" size={14} />
            {t?.backToSite || "Back to site"}
          </Link>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "24px 32px", overflowY: "auto", maxHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
