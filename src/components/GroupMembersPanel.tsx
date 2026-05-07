"use client";

import { useEffect, useState, useTransition } from "react";
import Avatar from "./Avatar";
import UiIcon from "./UiIcon";
import {
  listGroupMembers,
  addGroupMember,
  removeGroupMember,
  setGroupMemberRole,
  updateGroupChat,
} from "@/app/actions/groupChats";

type Member = {
  id: string;
  fullName: string;
  faculty: string | null;
  image: string | null;
  lastSeenAt: Date | string | null;
  role: string;
  joinedAt: Date | string;
};

interface GroupMembersPanelProps {
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
}

export default function GroupMembersPanel({
  groupId,
  currentUserId,
  isAdmin,
  onClose,
}: GroupMembersPanelProps) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: string; fullName: string; faculty: string | null; image: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Load members.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = (await listGroupMembers(groupId)) as Member[];
        if (!cancelled) setMembers(rows);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // Live search using existing /api/search-suggestions endpoint if available.
  useEffect(() => {
    if (!isAdmin) return;
    if (!search.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search-suggestions?q=${encodeURIComponent(search.trim())}&type=users`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        // Robust: support multiple shapes from existing API.
        const arr =
          data?.users ??
          data?.suggestions?.users ??
          (Array.isArray(data) ? data : []);
        setResults(arr.slice(0, 8));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, isAdmin]);

  const refreshMembers = async () => {
    try {
      const rows = (await listGroupMembers(groupId)) as Member[];
      setMembers(rows);
    } catch {
      /* ignore */
    }
  };

  const onAdd = (userId: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("groupChatId", groupId);
      fd.set("userId", userId);
      const res = await addGroupMember(fd);
      if ("error" in res && res.error) alert(res.error);
      setSearch("");
      setResults([]);
      await refreshMembers();
    });
  };

  const onRemove = (userId: string) => {
    if (!confirm("Remove this member?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("groupChatId", groupId);
      fd.set("userId", userId);
      const res = await removeGroupMember(fd);
      if ("error" in res && res.error) alert(res.error);
      await refreshMembers();
    });
  };

  const onSetRole = (userId: string, role: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("groupChatId", groupId);
      fd.set("userId", userId);
      fd.set("role", role);
      const res = await setGroupMemberRole(fd);
      if ("error" in res && res.error) alert(res.error);
      await refreshMembers();
    });
  };

  const onChangeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.set("groupChatId", groupId);
    fd.set("avatar", f);
    const res = await updateGroupChat(fd);
    if ("error" in res && res.error) alert(res.error);
    else window.location.reload();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(380px, 100vw)",
          background: "#fff",
          boxShadow: "-4px 0 24px rgba(15,23,42,0.1)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 18px",
            borderBottom: "1px solid #e7edf5",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
            Members ({members?.length ?? 0})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={iconBtn}
          >
            <UiIcon name="close" size={18} />
          </button>
        </header>

        {error && (
          <div style={{ padding: 12, color: "#b91c1c", fontSize: 13 }}>
            {error}
          </div>
        )}

        {isAdmin && (
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #e7edf5" }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Group avatar
            </label>
            <div style={{ marginTop: 6 }}>
              <input
                type="file"
                accept="image/*"
                onChange={onChangeAvatar}
                style={{ fontSize: 13 }}
              />
            </div>
          </div>
        )}

        {isAdmin && (
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #e7edf5" }}>
            <input
              type="text"
              placeholder="Add by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                fontSize: 13,
              }}
            />
            {results.length > 0 && (
              <ul
                style={{
                  marginTop: 8,
                  padding: 0,
                  listStyle: "none",
                  background: "#fff",
                  border: "1px solid #e7edf5",
                  borderRadius: 10,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {results.map((u) => (
                  <li
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 8,
                      cursor: "pointer",
                    }}
                    onClick={() => onAdd(u.id)}
                  >
                    <Avatar src={u.image || undefined} alt={u.fullName} size={28} className="" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{u.fullName}</div>
                      {u.faculty && (
                        <div style={{ fontSize: 11, color: "#64748b" }}>{u.faculty}</div>
                      )}
                    </div>
                    <UiIcon name="plus" size={14} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {!members && (
            <li style={{ padding: 16, color: "#64748b", fontSize: 13 }}>
              Loading…
            </li>
          )}
          {members?.map((m) => {
            const isMe = m.id === currentUserId;
            const isMemberAdmin = m.role === "admin";
            return (
              <li
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 18px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <Avatar src={m.image || undefined} alt={m.fullName} size={36} className="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {m.fullName}
                    {isMe && <span style={smallTag}>you</span>}
                    {isMemberAdmin && <span style={{ ...smallTag, background: "#fef3c7", color: "#854d0e" }}>admin</span>}
                  </div>
                  {m.faculty && (
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {m.faculty}
                    </div>
                  )}
                </div>
                {isAdmin && !isMe && (
                  <div style={{ display: "flex", gap: 4 }}>
                    {!isMemberAdmin ? (
                      <button
                        type="button"
                        title="Promote to admin"
                        style={miniBtn}
                        onClick={() => onSetRole(m.id, "admin")}
                      >
                        ↑
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Demote to member"
                        style={miniBtn}
                        onClick={() => onSetRole(m.id, "member")}
                      >
                        ↓
                      </button>
                    )}
                    <button
                      type="button"
                      title="Remove"
                      style={{ ...miniBtn, color: "#b91c1c" }}
                      onClick={() => onRemove(m.id)}
                    >
                      <UiIcon name="trash" size={12} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "none",
  background: "transparent",
  borderRadius: 8,
  color: "#64748b",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const miniBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  border: "1px solid #e2e8f0",
  background: "#fff",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const smallTag: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  padding: "2px 6px",
  borderRadius: 999,
  background: "#e8eef9",
  color: "#0b3aa8",
};
