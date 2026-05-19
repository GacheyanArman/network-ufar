"use client";

import { useTransition } from "react";
import Image from "next/image";
import { banUser, unbanUser, changeUserRole } from "@/features/admin/server/actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/shared/i18n/i18n";

export default function AdminUsersClient({ users }: { users: Array<Record<string, any>> }) {
  const { language } = useLanguage();
  const t = (translations[language] || translations.en).admin || translations.en.admin;
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {users.map((u) => (
        <div
          key={u.id}
          style={{
            background: "var(--bg-card)",
            borderRadius: 10,
            padding: 16,
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: pending ? 0.7 : 1,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              background: "var(--border-color)",
            }}
          >
            {u.image ? (
              <Image src={u.image} alt="" width={40} height={40} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--text-secondary)" }}>
                {(u.fullName || "?")[0]}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{u.fullName}</span>
              {u.isBanned && (
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: 999, background: "var(--danger-soft)", color: "var(--danger)" }}>
                  {u.banExpiresAt ? "Suspended" : "Banned"}
                </span>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: 999, background: "var(--french-blue-soft)", color: "var(--french-blue)" }}>
                {u.role}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{u.email}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{u.faculty || "—"} · Joined {new Date(u.createdAt).toLocaleDateString()}</div>
            {u.isBanned && u.banReason && (
              <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>Reason: {u.banReason}</div>
            )}
            {u.isBanned && u.banExpiresAt && (
              <div style={{ fontSize: 11, color: "var(--warning)", marginTop: 1 }}>Until {new Date(u.banExpiresAt).toLocaleString()}</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {u.isBanned ? (
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(async () => { await unbanUser(fd); }); }}>
                <input type="hidden" name="userId" value={u.id} />
                <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
                  {t?.actions?.unban || "Unban"}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(async () => { await banUser(fd); }); }} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input type="hidden" name="userId" value={u.id} />
                <input name="reason" placeholder="Reason..." style={{ fontSize: "0.8rem", padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, width: 100 }} />
                <select name="durationHours" defaultValue="" style={{ fontSize: "0.8rem", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                  <option value="">Permanent</option>
                  <option value="1">1h</option>
                  <option value="6">6h</option>
                  <option value="24">24h</option>
                  <option value="72">3d</option>
                  <option value="168">7d</option>
                  <option value="720">30d</option>
                </select>
                <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px", color: "var(--danger)" }}>
                  {t?.actions?.ban || "Ban"}
                </button>
              </form>
            )}

            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(async () => { await changeUserRole(fd); }); }}>
              <input type="hidden" name="userId" value={u.id} />
              <select name="role" defaultValue={u.role} style={{ fontSize: "0.8rem", padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 10px", marginLeft: 4 }}>
                Set
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
