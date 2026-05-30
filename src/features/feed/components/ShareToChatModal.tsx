"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getShareTargets } from "@/features/messages/server/share";
import { sendMessage } from "@/features/messages/server/actions";

type ShareTarget = {
  type: "user" | "group";
  id: string;
  name: string;
  image: string | null;
};

type Props = {
  url: string;
  text?: string | null;
  onCloseAction: () => void;
};

export default function ShareToChatModal({ url, text, onCloseAction }: Props) {
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getShareTargets();
        if (active) setTargets(data);
      } catch {
        if (active) setError("Couldn't load your chats");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseAction();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCloseAction]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) => t.name.toLowerCase().includes(q));
  }, [targets, query]);

  async function handleSend(target: ShareTarget) {
    if (sendingId) return;
    setSendingId(target.id);
    setError(null);

    const message = `${text ? `${text.slice(0, 280)}\n\n` : ""}${url}`;
    const formData = new FormData();
    if (target.type === "user") {
      formData.append("receiverId", target.id);
    } else {
      formData.append("groupChatId", target.id);
    }
    formData.append("content", message);

    try {
      await sendMessage(formData);
      setSentId(target.id);
      setTimeout(() => {
        setSentId(null);
        onCloseAction();
      }, 850);
    } catch {
      setError("Couldn't send. Please try again.");
    } finally {
      setSendingId(null);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="uf-share-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={onCloseAction}
    >
      <div
        className="uf-share-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="uf-share-head">
          <h3 className="uf-share-title">Share to chat</h3>
          <button
            type="button"
            className="uf-share-close"
            aria-label="Close"
            onClick={onCloseAction}
          >
            ×
          </button>
        </div>

        <input
          type="text"
          className="uf-share-search"
          placeholder="Search chats or groups…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="uf-share-list">
          {loading ? (
            <div className="uf-share-empty">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="uf-share-empty">No chats found</div>
          ) : (
            filtered.map((t) => (
              <button
                key={`${t.type}-${t.id}`}
                type="button"
                className="uf-share-item"
                disabled={Boolean(sendingId)}
                onClick={() => handleSend(t)}
              >
                <span
                  className={`uf-share-avatar ${
                    t.type === "group" ? "is-group" : ""
                  }`}
                >
                  {t.image ? (
                    <Image src={t.image} alt={t.name} width={40} height={40} />
                  ) : (
                    <span>{t.name?.[0]?.toUpperCase() || "?"}</span>
                  )}
                </span>
                <span className="uf-share-meta">
                  <span className="uf-share-name">{t.name}</span>
                  <span className="uf-share-sub">
                    {t.type === "group" ? "Group" : "Direct"}
                  </span>
                </span>
                <span className="uf-share-action">
                  {sentId === t.id
                    ? "Sent ✓"
                    : sendingId === t.id
                    ? "Sending…"
                    : "Send"}
                </span>
              </button>
            ))
          )}
        </div>

        {error ? <div className="uf-share-error">{error}</div> : null}

        <div className="uf-share-foot">
          <button type="button" className="uf-share-copy" onClick={handleCopy}>
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      </div>

      <style>{shareStyles}</style>
    </div>
  );
}

const shareStyles = `
.uf-share-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}

.uf-share-modal {
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
  overflow: hidden;
}

.uf-share-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 10px;
}

.uf-share-title {
  margin: 0;
  font-size: 17px;
  font-weight: 850;
  color: #0f172a;
}

.uf-share-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.uf-share-close:hover {
  background: #e2e8f0;
}

.uf-share-search {
  margin: 0 18px 8px;
  padding: 10px 12px;
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
}

.uf-share-search:focus {
  border-color: #0b3aa8;
}

.uf-share-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px 6px;
}

.uf-share-empty {
  padding: 26px 12px;
  text-align: center;
  color: #65758b;
  font-size: 14px;
}

.uf-share-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.uf-share-item:hover {
  background: #f4f7fb;
}

.uf-share-item:disabled {
  opacity: 0.6;
  cursor: default;
}

.uf-share-avatar {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e0e7f5;
  color: #0b3aa8;
  font-weight: 800;
  font-size: 15px;
}

.uf-share-avatar.is-group {
  border-radius: 12px;
  background: #dcfce7;
  color: #047857;
}

.uf-share-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uf-share-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.uf-share-name {
  font-size: 14.5px;
  font-weight: 750;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-share-sub {
  font-size: 12px;
  color: #65758b;
}

.uf-share-action {
  flex: none;
  font-size: 13px;
  font-weight: 800;
  color: #0b3aa8;
}

.uf-share-error {
  padding: 6px 18px;
  color: #dc2626;
  font-size: 13px;
}

.uf-share-foot {
  padding: 10px 18px 16px;
  border-top: 1px solid #eef2f8;
}

.uf-share-copy {
  width: 100%;
  padding: 10px;
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  background: #ffffff;
  color: #0b3aa8;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.uf-share-copy:hover {
  background: #f4f7fb;
}
`;
