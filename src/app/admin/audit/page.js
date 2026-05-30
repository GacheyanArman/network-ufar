import { cookies } from "next/headers";
import { getAuditLogPage } from "@/features/admin/server/actions";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";

const ACTION_LABELS = {
  approve_material: "Approved material",
  reject_material: "Rejected material",
  approve_photo: "Approved photo",
  reject_photo: "Rejected photo",
  approve_event: "Approved event",
  reject_event: "Rejected event",
  approve_community: "Approved community",
  reject_community: "Rejected community",
  resolve_report: "Resolved report",
  dismiss_report: "Dismissed report",
  ban_user: "Banned user",
  unban_user: "Unbanned user",
  change_role: "Changed role",
  delete_post: "Deleted post",
  delete_comment: "Deleted comment",
  delete_photo: "Deleted photo",
  delete_material: "Deleted material",
  update_book_request: "Updated book request",
};

export default async function AdminAuditPage({ searchParams }) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const actionFilter = params.action || null;

  const entries = await getAuditLogPage(page, actionFilter);
  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = (translations[lang] || translations.en).admin || translations.en.admin;

  return (
    <div>
      <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 900 }}>
        {t?.nav?.audit || "Audit Log"}
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <a
          href="/admin/audit"
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            background: !actionFilter ? "var(--french-blue-deep)" : "var(--border-color)",
            color: !actionFilter ? "var(--bg-card)" : "var(--text-primary)",
            textDecoration: "none",
          }}
        >
          All
        </a>
        {Object.entries(ACTION_LABELS).map(([key, label]) => (
          <a
            key={key}
            href={`/admin/audit?action=${key}`}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 500,
              background: actionFilter === key ? "var(--french-blue-deep)" : "var(--bg-hover)",
              color: actionFilter === key ? "var(--bg-card)" : "var(--text-primary)",
              textDecoration: "none",
            }}
          >
            {label}
          </a>
        ))}
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
          <UiIcon name="check" size={32} />
          <p style={{ margin: "12px 0 0" }}>{t?.empty?.noAudit || "No audit log entries"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "var(--bg-card)",
                borderRadius: 8,
                padding: "10px 14px",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 13,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: entry.action.startsWith("approve") || entry.action === "unban_user" ? "var(--success)" : entry.action.startsWith("reject") || entry.action === "ban_user" ? "var(--danger)" : "var(--french-blue)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{ACTION_LABELS[entry.action] || entry.action}</span>
                {entry.details && (
                  <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}> — {entry.details}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                {entry.targetType && (
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "2px 6px", borderRadius: 999, background: "var(--bg-hover)", color: "var(--text-primary)" }}>
                    {entry.targetType}
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  by {entry.actorName}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
        {page > 1 && (
          <a
            href={`/admin/audit?page=${page - 1}${actionFilter ? `&action=${actionFilter}` : ""}`}
            style={{ padding: "8px 16px", borderRadius: 8, background: "var(--border-color)", color: "var(--text-primary)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
          >
            Previous
          </a>
        )}
        {entries.length === 50 && (
          <a
            href={`/admin/audit?page=${page + 1}${actionFilter ? `&action=${actionFilter}` : ""}`}
            style={{ padding: "8px 16px", borderRadius: 8, background: "var(--french-blue-deep)", color: "var(--bg-card)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
          >
            Next
          </a>
        )}
      </div>
    </div>
  );
}
