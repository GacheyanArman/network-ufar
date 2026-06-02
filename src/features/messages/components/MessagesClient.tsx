"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import Avatar from "@/shared/ui/Avatar";
import UiIcon from "@/shared/ui/UiIcon";
import GroupMembersPanel from "@/features/profile/components/GroupMembersPanel";
import {
  sendMessage,
  editMessage,
  deleteMessage,
  markThreadRead,
} from "@/features/messages/server/actions";
import { useMessageStream, type StreamEvent } from "@/features/messages/hooks/use-message-stream";
import { useTypingBroadcaster } from "@/features/messages/hooks/use-typing";

export interface MessageType {
  id: string;
  senderId: string;
  receiverId: string | null;
  groupChatId?: string | null;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  status?: "sent" | "delivered" | "seen" | null;
  createdAt: string | Date;
  editedAt?: string | Date | null;
  deletedAt?: string | Date | null;
  deletedForEveryone?: boolean;
  senderName?: string | null;
  senderImage?: string | null;
}

interface MessagesClientProps {
  initialHistory: MessageType[];
  currentUserId: string;
  selectedUserId: string;
  selectedGroupId?: string;
  presenceLastSeenAt?: string | null;
  isGroupAdmin?: boolean;
}

export default function MessagesClient({
  initialHistory,
  currentUserId,
  selectedUserId,
  selectedGroupId = "",
  presenceLastSeenAt,
  isGroupAdmin = false,
}: MessagesClientProps) {
  const [messages, setMessages] = useState<MessageType[]>(
    initialHistory.map(normalizeMessage)
  );
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);
  const [hasMore, setHasMore] = useState(initialHistory.length >= 30);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(
    presenceLastSeenAt ?? null
  );
  const [showMembers, setShowMembers] = useState(false);
  const [, startTransition] = useTransition();

  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const stickToBottomRef = useRef(true);

  const { onType, stop: stopTyping } = useTypingBroadcaster({
    userId: selectedUserId || undefined,
    groupId: selectedGroupId || undefined,
  });

  // Reset state when the active conversation changes.
  // Uses the "store previous prop" pattern instead of an effect.
  const conversationKey = `${selectedUserId ?? ""}:${selectedGroupId ?? ""}`;
  const [prevConversationKey, setPrevConversationKey] = useState(conversationKey);
  if (prevConversationKey !== conversationKey) {
    setPrevConversationKey(conversationKey);
    setMessages(initialHistory.map(normalizeMessage));
    setHasMore(initialHistory.length >= 30);
    setSearchQuery("");
    setEditingId(null);
    setText("");
    setAttachment(null);
    setOtherTyping(false);
  }

  // Side effect: re-enable the "stick to bottom" behaviour when switching
  // conversations. Refs must be mutated outside of render.
  useEffect(() => {
    stickToBottomRef.current = true;
  }, [conversationKey]);

  // Auto-scroll to bottom on new messages.
  const scrollToBottom = useCallback((smooth = true) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({
      top: list.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current) scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // Mark thread read whenever the active conversation has new tail messages.
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;
    if (lastMsg.senderId === currentUserId) return;
    if (document.hidden) return;
    const fd = new FormData();
    if (selectedGroupId) fd.set("groupId", selectedGroupId);
    else fd.set("userId", selectedUserId);
    markThreadRead(fd).catch(() => {});
  }, [messages, currentUserId, selectedUserId, selectedGroupId]);

  // SSE handler ------------------------------------------------------------
  const handleStream = useCallback(
    (event: StreamEvent) => {
      if (event.type === "message:new") {
        const m = event.message;
        // Drop messages from other conversations (defensive — channel
        // already filters, but keep guard for tab focus changes).
        const matches = selectedGroupId
          ? m.groupChatId === selectedGroupId
          : (m.senderId === selectedUserId &&
              m.receiverId === currentUserId) ||
            (m.senderId === currentUserId &&
              m.receiverId === selectedUserId);
        if (!matches) return;

        setMessages((prev) => {
          // De-dupe by id.
          if (prev.some((x) => x.id === m.id)) return prev;
          // Replace pending-optimistic if content+sender match.
          const opt = prev.findIndex(
            (x) =>
              x.id.startsWith("tmp_") &&
              x.senderId === m.senderId &&
              x.content === m.content
          );
          if (opt >= 0) {
            const next = prev.slice();
            next[opt] = normalizeMessage(m);
            return next;
          }
          return [...prev, normalizeMessage(m)];
        });
      } else if (event.type === "message:edit") {
        setMessages((prev) =>
          prev.map((x) =>
            x.id === event.messageId
              ? { ...x, content: event.content, editedAt: event.editedAt }
              : x
          )
        );
      } else if (event.type === "message:delete") {
        setMessages((prev) =>
          prev.map((x) =>
            x.id === event.messageId
              ? {
                  ...x,
                  deletedForEveryone: event.forEveryone,
                  content: event.forEveryone ? "" : x.content,
                  attachmentUrl: event.forEveryone ? null : x.attachmentUrl,
                  deletedAt: new Date().toISOString(),
                }
              : x
          )
        );
      } else if (event.type === "message:read") {
        setMessages((prev) =>
          prev.map((x) =>
            x.id === event.messageId
              ? { ...x, status: "seen" as const }
              : x
          )
        );
      } else if (event.type === "typing") {
        if (event.userId === currentUserId) return;
        // For 1:1 chat we only care about the partner; for group, any.
        if (selectedUserId && event.userId !== selectedUserId) return;
        setOtherTyping(event.isTyping);
        if (event.isTyping) {
          // Auto-clear in case the "false" event is dropped.
          setTimeout(() => setOtherTyping(false), 5000);
        }
      } else if (event.type === "presence") {
        if (event.userId === selectedUserId) {
          setOtherOnline(event.online);
          setOtherLastSeen(event.lastSeenAt);
        }
      }
    },
    [currentUserId, selectedUserId, selectedGroupId]
  );

  useMessageStream({
    userId: selectedUserId || undefined,
    groupId: selectedGroupId || undefined,
    onEvent: handleStream,
    enabled: Boolean(selectedUserId || selectedGroupId),
  });

  // Infinite scroll: load older when user scrolls near top ----------------
  const loadOlder = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0]?.id;
      const params = new URLSearchParams();
      if (selectedGroupId) params.set("group", selectedGroupId);
      else params.set("user", selectedUserId);
      if (oldest) params.set("before", oldest);
      const res = await fetch(`/api/messages/list?${params.toString()}`);
      if (!res.ok) return;
      const data: { messages: MessageType[]; hasMore: boolean } = await res.json();
      const list = listRef.current;
      const prevHeight = list?.scrollHeight ?? 0;
      setMessages((prev) => [
        ...data.messages.map(normalizeMessage),
        ...prev,
      ]);
      setHasMore(data.hasMore);
      // Restore scroll position so the page doesn't jump.
      requestAnimationFrame(() => {
        const list2 = listRef.current;
        if (list2) {
          list2.scrollTop = list2.scrollHeight - prevHeight;
        }
      });
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, messages, selectedGroupId, selectedUserId]);

  const handleScroll = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const distFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    stickToBottomRef.current = distFromBottom < 80;

    if (list.scrollTop < 80 && hasMore && !loadingMore) {
      void loadOlder();
    }
  }, [hasMore, loadingMore, loadOlder]);

  // Send -----------------------------------------------------------------
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAttachment(f);
  };

  const submitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !attachment) return;
    stopTyping();

    const tempId = `tmp_${Date.now()}`;
    const optimistic: MessageType = {
      id: tempId,
      senderId: currentUserId,
      receiverId: selectedUserId || null,
      groupChatId: selectedGroupId || null,
      content: text,
      createdAt: new Date().toISOString(),
      attachmentUrl: attachment ? URL.createObjectURL(attachment) : null,
      attachmentType: attachment?.type.startsWith("image/") ? "image" : "file",
      status: "sent",
      senderName: "You",
    };
    setMessages((prev) => [...prev, optimistic]);
    stickToBottomRef.current = true;
    const valueToSend = text;
    const fileToSend = attachment;
    setText("");
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = "";

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (selectedGroupId) fd.set("groupChatId", selectedGroupId);
        else fd.set("receiverId", selectedUserId);
        fd.set("content", valueToSend);
        if (fileToSend) fd.set("attachment", fileToSend);
        await sendMessage(fd);
        // SSE will deliver the real message and replace this optimistic one.
      } catch (err) {
        // rollback
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert((err as Error).message || "Failed to send message");
      }
    });
  };

  const beginEdit = (m: MessageType) => {
    setEditingId(m.id);
    setEditingText(m.content);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const before = messages;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingId
          ? { ...m, content: trimmed, editedAt: new Date().toISOString() }
          : m
      )
    );
    setEditingId(null);
    setEditingText("");
    try {
      const fd = new FormData();
      fd.set("messageId", editingId);
      fd.set("content", trimmed);
      await editMessage(fd);
    } catch (err) {
      setMessages(before);
      alert((err as Error).message || "Failed to edit");
    }
  };

  const onDelete = async (m: MessageType, forEveryone: boolean) => {
    if (!confirm(forEveryone ? "Delete for everyone?" : "Delete this message?")) return;
    const before = messages;
    setMessages((prev) =>
      forEveryone
        ? prev.map((x) =>
            x.id === m.id
              ? {
                  ...x,
                  deletedForEveryone: true,
                  content: "",
                  attachmentUrl: null,
                }
              : x
          )
        : prev.filter((x) => x.id !== m.id)
    );
    try {
      const fd = new FormData();
      fd.set("messageId", m.id);
      fd.set("forEveryone", String(forEveryone));
      await deleteMessage(fd);
    } catch (err) {
      setMessages(before);
      alert((err as Error).message || "Failed to delete");
    }
  };

  // Search ---------------------------------------------------------------
  const matches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages
      .filter((m) => !m.deletedForEveryone && m.content.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [searchQuery, messages]);

  useEffect(() => {
    if (matches.length === 0) return;
    const id = matches[matchIndex] || matches[0];
    const el = messageRefs.current.get(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [matchIndex, matches]);

  // Empty state.
  if (messages.length === 0) {
    return (
      <div className="tg-empty-history">
        <div className="tg-empty-icon">
          <UiIcon name="message" size={48} />
        </div>
        <h3>Start the conversation</h3>
        <p>No messages yet — say hi!</p>
        <ChatInput
          text={text}
          setText={setText}
          attachment={attachment}
          setAttachment={setAttachment}
          fileRef={fileRef}
          onPickFile={onPickFile}
          onSubmit={submitMessage}
          onType={onType}
          stopTyping={stopTyping}
          inline
        />
      </div>
    );
  }

  // Render --------------------------------------------------------------
  return (
    <>
      {/* Search bar */}
      <div className="tg-chat-search-bar">
        <div className="tg-chat-search-wrapper">
          <UiIcon name="search" size={14} />
          <input
            type="text"
            className="tg-chat-search-input"
            placeholder="Search in this chat…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setMatchIndex(0);
            }}
          />
          {searchQuery && (
            <div className="tg-chat-search-meta">
              <span>
                {matches.length > 0 ? matchIndex + 1 : 0}/{matches.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setMatchIndex((i) => (i - 1 + matches.length) % Math.max(matches.length, 1))
                }
                disabled={matches.length === 0}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => setMatchIndex((i) => (i + 1) % Math.max(matches.length, 1))}
                disabled={matches.length === 0}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setMatchIndex(0);
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {selectedGroupId && (
          <button
            type="button"
            className="tg-chat-search-members"
            onClick={() => setShowMembers((v) => !v)}
          >
            <UiIcon name="users" size={14} /> Members
          </button>
        )}

        {selectedUserId && !selectedGroupId && (
          <div
            className="tg-chat-presence"
            title={otherLastSeen && isClient ? `Last seen ${formatLastSeen(otherLastSeen)}` : undefined}
          >
            <span
              className={otherOnline ? "tg-presence-dot online" : "tg-presence-dot offline"}
            />
            {otherOnline
              ? "Online"
              : otherLastSeen && isClient
              ? `Last seen ${formatLastSeen(otherLastSeen)}`
              : "Offline"}
          </div>
        )}
      </div>

      <div
        ref={listRef}
        className="tg-messages-container"
        onScroll={handleScroll}
      >
        {loadingMore && (
          <div className="tg-loading-more">Loading older messages…</div>
        )}

        <div className="tg-messages-list">
          {messages.map((m, i) => {
            const isOwn = m.senderId === currentUserId;
            const prev = messages[i - 1];
            const showAvatar =
              !isOwn &&
              (!prev || prev.senderId !== m.senderId) &&
              !!selectedGroupId;
            const isHighlighted = matches[matchIndex] === m.id;

            return (
              <div
                key={m.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(m.id, el);
                  else messageRefs.current.delete(m.id);
                }}
                className={`tg-message ${
                  isOwn ? "tg-message-own" : "tg-message-other"
                } ${isHighlighted ? "tg-message-current-match" : ""}`}
              >
                {showAvatar && (
                  <div className="tg-msg-avatar">
                    <Avatar
                      src={m.senderImage || undefined}
                      alt={m.senderName || "User"}
                      size={28}
                      className=""
                    />
                  </div>
                )}
                <MessageBubble
                  m={m}
                  isOwn={isOwn}
                  searchQuery={searchQuery}
                  editing={editingId === m.id}
                  editingText={editingText}
                  setEditingText={setEditingText}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onBeginEdit={() => beginEdit(m)}
                  onDelete={(forEveryone) => onDelete(m, forEveryone)}
                  showSenderName={!isOwn && !!selectedGroupId}
                  isClient={isClient}
                />
              </div>
            );
          })}
        </div>

        {otherTyping && (
          <div className="tg-typing-indicator" aria-live="polite">
            <span className="tg-typing-dot" />
            <span className="tg-typing-dot" />
            <span className="tg-typing-dot" />
            <span className="tg-typing-text">typing…</span>
          </div>
        )}
      </div>

      <ChatInput
        text={text}
        setText={setText}
        attachment={attachment}
        setAttachment={setAttachment}
        fileRef={fileRef}
        onPickFile={onPickFile}
        onSubmit={submitMessage}
        onType={onType}
        stopTyping={stopTyping}
      />

      {selectedGroupId && showMembers && (
        <GroupMembersPanel
          groupId={selectedGroupId}
          currentUserId={currentUserId}
          isAdmin={isGroupAdmin}
          onClose={() => setShowMembers(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MessageBubble({
  m,
  isOwn,
  searchQuery,
  editing,
  editingText,
  setEditingText,
  onSaveEdit,
  onCancelEdit,
  onBeginEdit,
  onDelete,
  showSenderName,
  isClient,
}: {
  m: MessageType;
  isOwn: boolean;
  searchQuery: string;
  editing: boolean;
  editingText: string;
  setEditingText: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onBeginEdit: () => void;
  onDelete: (forEveryone: boolean) => void;
  showSenderName: boolean;
  isClient: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isPending = m.id.startsWith("tmp_");
  const tombstone = m.deletedForEveryone;

  // Click-outside + Escape to close the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!bubbleRef.current) return;
      if (!bubbleRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="tg-message-bubble" ref={bubbleRef}>
      {showSenderName && !tombstone && (
        <div className="tg-msg-sender-name">{m.senderName || "User"}</div>
      )}

      {tombstone ? (
        <p className="tg-message-text tg-message-tombstone">
          <em>Message was deleted</em>
        </p>
      ) : editing ? (
        <div className="tg-msg-edit">
          <textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            autoFocus
            rows={2}
            maxLength={2000}
          />
          <div className="tg-msg-edit-actions">
            <button type="button" onClick={onCancelEdit}>
              Cancel
            </button>
            <button type="button" onClick={onSaveEdit} className="primary">
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {m.attachmentUrl && m.attachmentType === "image" && (
            <a
              href={m.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="tg-msg-image"
            >
              <Image src={m.attachmentUrl} alt="" width={400} height={260} unoptimized={m.attachmentUrl.startsWith("/")} style={{ maxWidth: "100%", height: "auto" }} />
            </a>
          )}
          {m.attachmentUrl && m.attachmentType !== "image" && (
            <a
              href={m.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="tg-msg-file"
            >
              <UiIcon name="paperclip" size={14} /> Open attachment
            </a>
          )}
          {m.content && (
            <p className="tg-message-text">
              {highlightText(m.content, searchQuery)}
            </p>
          )}
        </>
      )}

      <span className="tg-message-time">
        {m.editedAt && !tombstone && <span className="tg-msg-edited">edited · </span>}
        {isClient ? formatTime(m.createdAt) : ""}
        {isOwn && !tombstone && (
          <ReadIndicator status={isPending ? "sent" : m.status ?? "sent"} pending={isPending} />
        )}
      </span>

      {!tombstone && !editing && (
        <button
          type="button"
          className={`tg-msg-menu-btn ${isOwn ? "tg-msg-menu-btn-right" : "tg-msg-menu-btn-left"}`}
          aria-label="Message actions"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          ⋯
        </button>
      )}

      {menuOpen && (
        <div
          className={`tg-msg-menu ${isOwn ? "tg-msg-menu-right" : "tg-msg-menu-left"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {isOwn && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onBeginEdit();
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(true);
                }}
              >
                Delete for everyone
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDelete(false);
            }}
          >
            {isOwn ? "Hide for me" : "Hide for me"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              navigator.clipboard?.writeText(m.content).catch(() => {});
            }}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

function ReadIndicator({
  status,
  pending,
}: {
  status: "sent" | "delivered" | "seen";
  pending: boolean;
}) {
  if (pending) return <span className="tg-msg-status">⌛</span>;
  if (status === "seen") return <span className="tg-msg-status seen">✓✓</span>;
  if (status === "delivered") return <span className="tg-msg-status">✓✓</span>;
  return <span className="tg-msg-status">✓</span>;
}

function ChatInput({
  text,
  setText,
  attachment,
  setAttachment,
  fileRef,
  onPickFile,
  onSubmit,
  onType,
  stopTyping,
  inline = false,
}: {
  text: string;
  setText: (v: string) => void;
  attachment: File | null;
  setAttachment: (f: File | null) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onType: () => void;
  stopTyping: () => void;
  inline?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`tg-input-area ${inline ? "tg-input-inline" : ""}`}
    >
      {attachment && (
        <div className="tg-attachment-preview">
          <UiIcon name="paperclip" size={14} />
          <span className="tg-attachment-name">{attachment.name}</span>
          <button
            type="button"
            onClick={() => {
              setAttachment(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            ×
          </button>
        </div>
      )}
      <button
        type="button"
        className="tg-attach-btn"
        onClick={() => fileRef.current?.click()}
        aria-label="Attach"
      >
        <UiIcon name="paperclip" size={20} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onPickFile}
        style={{ display: "none" }}
      />
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onType();
        }}
        onBlur={() => stopTyping()}
        className="tg-message-input"
        placeholder="Message"
        maxLength={2000}
        autoComplete="off"
      />
      <button type="submit" className="tg-send-btn" aria-label="Send">
        <UiIcon name="send" size={20} />
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeMessage(m: MessageType): MessageType {
  return {
    ...m,
    createdAt:
      typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt).toISOString(),
  };
}

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastSeen(value: string) {
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString();
}

function highlightText(text: string, q: string) {
  if (!q.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeReg(q)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="tg-highlight">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
