import Link from "next/link";
import { cookies } from "next/headers";
import { getAdminStats } from "@/features/admin/server/actions";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";

const CARDS = [
  { key: "pendingMaterials", href: "/admin/materials", icon: "folder", color: "var(--warning)" },
  { key: "pendingPhotos", href: "/admin/photos", icon: "image", color: "var(--warning)" },
  { key: "openReports", href: "/admin/reports", icon: "flag", color: "var(--danger)" },
  { key: "pendingEvents", href: "/admin/events", icon: "calendar", color: "var(--warning)" },
  { key: "pendingBookRequests", href: "/admin/library", icon: "book", color: "var(--warning)" },
  { key: "pendingResources", href: "/admin/library", icon: "bookmark", color: "var(--warning)" },
  { key: "pendingCommunities", href: "/admin/communities", icon: "group", color: "var(--warning)" },
  { key: "totalUsers", href: "/admin/users", icon: "user", color: "var(--french-blue)" },
  { key: "bannedUsers", href: "/admin/users", icon: "ban", color: "var(--danger)" },
];

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = (translations[lang] || translations.en).admin || translations.en.admin;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 900 }}>
          {t?.title || "Admin Dashboard"}
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>
          {t?.subtitle || "Moderation and management center"}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {CARDS.map((card) => {
          const value = stats[card.key] ?? 0;
          const label = t?.stats?.[card.key] || card.key;
          return (
            <Link
              key={card.key}
              href={card.href}
              style={{
                textDecoration: "none",
                background: "var(--bg-card)",
                borderRadius: 12,
                padding: 20,
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "box-shadow 0.15s, transform 0.15s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `${card.color}15`,
                  color: card.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <UiIcon name={card.icon} size={22} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {label}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
