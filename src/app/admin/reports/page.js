import { cookies } from "next/headers";
import { getAdminReports, resolveReport, dismissReport } from "@/features/admin/server/actions";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
];

export default async function AdminReportsPage({ searchParams }) {
  const params = await searchParams;
  const statusFilter = params.status || "pending";

  const result = await getAdminReports(statusFilter || null);
  const reports = Array.isArray(result) ? result : ("reports" in result ? result.reports : []);
  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = (translations[lang] || translations.en).admin || translations.en.admin;

  const targetLabel = (r) => {
    if (r.reportedUserId) return "User";
    if (r.postId) return "Post";
    if (r.photoId) return "Photo";
    if (r.commentId) return "Comment";
    if (r.photoCommentId) return "Photo comment";
    return "Other";
  };

  const targetIcon = (r) => {
    if (r.reportedUserId) return "user";
    if (r.postId) return "news";
    if (r.photoId) return "image";
    if (r.commentId) return "message";
    return "flag";
  };

  const targetColor = (r) => {
    if (r.reportedUserId) return { bg: "var(--danger-soft)", fg: "var(--danger)" };
    if (r.postId) return { bg: "var(--french-blue-soft)", fg: "var(--french-blue)" };
    if (r.photoId) return { bg: "#faf5ff", fg: "#8b5cf6" };
    return { bg: "#fefce8", fg: "var(--warning)" };
  };

  return (
    <div>
      <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 900 }}>
        {t?.nav?.reports || "Reports"}
      </h1>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {STATUS_FILTERS.map((f) => (
          <a
            key={f.key}
            href={f.key ? `/admin/reports?status=${f.key}` : "/admin/reports"}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: statusFilter === f.key ? "var(--french-blue-deep)" : "var(--border-color)",
              color: statusFilter === f.key ? "var(--bg-card)" : "var(--text-primary)",
              textDecoration: "none",
            }}
          >
            {f.label}
          </a>
        ))}
      </div>

      {reports.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
          <UiIcon name="check" size={32} />
          <p style={{ margin: "12px 0 0" }}>{t?.empty?.noPending || "No open reports"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reports.map((r) => {
            const tc = targetColor(r);
            return (
              <div
                key={r.id}
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
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: tc.bg,
                    color: tc.fg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <UiIcon name={targetIcon(r)} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--bg-hover)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {targetLabel(r)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: r.status === "pending" ? "#fefce8" : r.status === "resolved" ? "var(--success-soft)" : "var(--bg-hover)",
                        color: r.status === "pending" ? "#b45309" : r.status === "resolved" ? "var(--success)" : "var(--text-secondary)",
                      }}
                    >
                      {r.status}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.reason}</span>
                  </div>
                  {r.description && (
                    <div style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 4 }}>{r.description}</div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                    {r.reviewedAt && (
                      <span> · Reviewed {new Date(r.reviewedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <form action={resolveReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
                        {t?.actions?.resolve || "Resolve"}
                      </button>
                    </form>
                    <form action={dismissReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
                        {t?.actions?.dismiss || "Dismiss"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
