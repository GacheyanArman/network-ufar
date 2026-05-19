import { cookies } from "next/headers";
import Image from "next/image";
import { getPendingPhotos, approvePhoto, rejectPhoto } from "@/features/admin/server/actions";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";

export default async function AdminPhotosPage() {
  const photos = await getPendingPhotos();
  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = (translations[lang] || translations.en).admin || translations.en.admin;

  return (
    <div>
      <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 900 }}>
        {t?.nav?.photos || "Pending Photos"}
      </h1>

      {photos.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
          <UiIcon name="check" size={32} />
          <p style={{ margin: "12px 0 0" }}>{t?.empty?.noPending || "All photos have been reviewed"}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {photos.map((p) => (
            <div
              key={p.id}
              style={{
                background: "var(--bg-card)",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              <Image
                src={p.imageUrl}
                alt={p.caption || "Photo"}
                width={320}
                height={160}
                style={{ width: "100%", height: 160, objectFit: "cover" }}
              />
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.caption || "No caption"}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  by {p.ownerName || "Unknown"} · {new Date(p.createdAt).toLocaleDateString()}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <form action={approvePhoto} style={{ flex: 1 }}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn btn-primary" style={{ width: "100%", fontSize: "0.8rem", padding: "6px 0" }}>
                      {t?.actions?.approve || "Approve"}
                    </button>
                  </form>
                  <form action={rejectPhoto} style={{ flex: 1 }}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn btn-secondary" style={{ width: "100%", fontSize: "0.8rem", padding: "6px 0", color: "var(--danger)" }}>
                      {t?.actions?.reject || "Reject"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
