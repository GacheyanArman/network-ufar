"use client";

import { useEffect, useRef, useState } from "react";
import UiIcon from "@/shared/ui/UiIcon";
import { sendMessage } from "@/features/messages/server/actions";
import "./SharePostModal.css";

export default function SharePostModal({
  postUrl,
  photoUrl,
  currentUserId,
  onClose,
  onSent,
}: {
  postUrl: string;
  photoUrl: string | null;
  currentUserId: string | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; image: string | null; type: "user" | "group" }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string; type: "user" | "group" } | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inflightRef = useRef(0);

  // Initial fetch / Debounced search
  useEffect(() => {
    const fetchUsers = async (searchQuery: string) => {
      const id = ++inflightRef.current;
      try {
        const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(searchQuery)}`, { credentials: "same-origin" });
        if (!res.ok || id !== inflightRef.current) return;
        const data: any[] = await res.json();
        const mapped = (Array.isArray(data) ? data : [])
          .filter((x) => x?.type === "user" && x.id !== currentUserId)
          .map((x) => ({ id: x.id, name: x.name, image: x.image ?? null, type: "user" as const }));
        setResults(mapped);
      } catch { /* ignore */ }
    };

    if (query.trim().length === 0) {
      // Empty query: fetch some default recent friends/chats (the search API handles empty query returning random/recent users)
      fetchUsers("");
    } else if (query.trim().length >= 2) {
      const t = setTimeout(() => fetchUsers(query.trim()), 200);
      return () => clearTimeout(t);
    } else {
      setResults([]);
    }
  }, [query, currentUserId]);

  const handleSend = async () => {
    if (!selected || !currentUserId) return;
    setSending(true);
    setErr(null);
    try {
      const fd = new FormData();
      if (selected.type === "user") fd.set("receiverId", selected.id);
      else fd.set("groupChatId", selected.id);
      
      // Order: note first, then postUrl below
      fd.set("content", note.trim() ? `${note.trim()}\n${postUrl}` : postUrl);
      
      if (photoUrl) {
        fd.set("existingAttachmentUrl", photoUrl);
        fd.set("existingAttachmentType", "image");
      }
      
      await sendMessage(fd);
      onSent();
    } catch (e) {
      setErr((e as Error).message || "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="uf-share-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="uf-share-modal">
        <div className="uf-share-header">
          <strong>Share to Message</strong>
          <button type="button" className="uf-share-close" onClick={onClose} aria-label="Close">
            <UiIcon name="x" size={20} />
          </button>
        </div>

        {/* URL preview */}
        <div className="uf-share-link-preview">
          <span className="uf-share-link-icon">
            <UiIcon name="link" size={16} />
          </span>
          <span className="uf-share-link-text">{postUrl}</span>
        </div>

        {/* Recipient search */}
        {selected ? (
          <div className="uf-share-selected">
            <span>To: <strong>{selected.name}</strong></span>
            <button type="button" onClick={() => setSelected(null)}>
              <UiIcon name="x" size={16} />
            </button>
          </div>
        ) : (
          <div className="uf-share-search">
            <input
              autoFocus
              type="text"
              placeholder="Search for a person…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="uf-share-search-input"
            />
            {results.length > 0 && (
              <div className="uf-share-results">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="uf-share-result-item"
                    onClick={() => { setSelected(r); setQuery(""); setResults([]); }}
                  >
                    <div className="uf-share-result-avatar">
                      {r.image ? (
                        <img src={r.image} alt={r.name} />
                      ) : (
                        <span>{r.name[0]?.toUpperCase() || "U"}</span>
                      )}
                    </div>
                    <span>{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Optional note */}
        <textarea
          className="uf-share-note"
          placeholder="Add a message (optional)…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
        />

        {err && <p className="uf-share-err">{err}</p>}

        <button
          type="button"
          className="uf-share-send-btn"
          onClick={handleSend}
          disabled={!selected || sending || !currentUserId}
        >
          {sending ? "Sending…" : "Send Message"}
        </button>
      </div>
    </div>
  );
}
