import { cookies } from "next/headers";
import { getPendingCommunities, approveCommunity, rejectCommunity } from "@/features/admin/server/actions";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";

export default async function AdminCommunitiesPage() {
  const communities = await getPendingCommunities();
  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = (translations[lang] || translations.en).admin || translations.en.admin;

  return (
    <div>
      <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 900 }}>
        {t?.nav?.communities || "Pending Communities"}
      </h1>

      {communities.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
          <UiIcon name="check" size={32} />
          <p style={{ margin: "12px 0 0" }}>{t?.empty?.noPending || "All communities have been reviewed"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {communities.map((c) => (
            <div
              key={c.id}
              style={{
                background: "var(--bg-card)",
                borderRadius: 10,
                padding: 16,
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {c.isPrivate ? "Private" : "Public"} · {c.facultyTag || "No faculty"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  by {c.creatorName || "Unknown"} · {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <form action={approveCommunity}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
                    {t?.actions?.approve || "Approve"}
                  </button>
                </form>
                <form action={rejectCommunity}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px", color: "var(--danger)" }}>
                    {t?.actions?.reject || "Reject"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
