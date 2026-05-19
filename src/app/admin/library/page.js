import { cookies } from "next/headers";
import {
  getPendingLibraryResources,
  getPendingBookRequests,
  approveLibraryResource,
  rejectLibraryResource,
  updateBookRequestStatus,
} from "@/features/admin/server/actions";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";

export default async function AdminLibraryPage() {
  const [resources, bookRequests] = await Promise.all([
    getPendingLibraryResources(),
    getPendingBookRequests(),
  ]);
  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = (translations[lang] || translations.en).admin || translations.en.admin;

  return (
    <div>
      <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 900 }}>
        {t?.nav?.library || "Library Management"}
      </h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
          Resource Suggestions ({resources.length})
        </h2>
        {resources.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
            {t?.empty?.noPending || "All resources reviewed"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resources.map((r) => (
              <div key={r.id} style={{ background: "var(--bg-card)", borderRadius: 10, padding: 16, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{r.type} · {r.faculty} · {r.subject}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>by {r.creatorName || "Unknown"}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <form action={approveLibraryResource}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>{t?.actions?.approve || "Approve"}</button>
                  </form>
                  <form action={rejectLibraryResource}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px", color: "var(--danger)" }}>{t?.actions?.reject || "Reject"}</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
          Book Requests ({bookRequests.length})
        </h2>
        {bookRequests.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
            {t?.empty?.noPending || "No pending book requests"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bookRequests.map((b) => (
              <div key={b.id} style={{ background: "var(--bg-card)", borderRadius: 10, padding: 16, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    {b.author || "—"} · {b.subject} · {b.faculty} · {b.urgency}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>by {b.requesterName || "Unknown"}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <form action={updateBookRequestStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value="reviewed" />
                    <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>Reviewed</button>
                  </form>
                  <form action={updateBookRequestStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value="completed" />
                    <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>Complete</button>
                  </form>
                  <form action={updateBookRequestStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px", color: "var(--danger)" }}>{t?.actions?.reject || "Reject"}</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
