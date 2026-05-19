"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { blockUser } from "@/features/profile/server/block";
import { leaveGroupChat, deleteGroupChat } from "@/features/messages/server/groupChats";

interface ChatHeaderMenuProps {
  /** "user" for 1:1 chat, "group" for group chat */
  kind: "user" | "group";
  /** id of the partner user (DM) or group (group chat) */
  targetId: string;
  /** show admin actions for group */
  isGroupAdmin?: boolean;
  /** show "Open members" trigger that the parent owns */
  onShowMembers?: () => void;
}

export default function ChatHeaderMenu({
  kind,
  targetId,
  isGroupAdmin,
  onShowMembers,
}: ChatHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleBlock = () => {
    if (!confirm("Block this user? You will no longer see their messages.")) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", targetId);
        await blockUser(fd);
        window.location.href = "/messages";
      } catch (err) {
        alert((err as Error).message || "Failed to block user");
      }
    });
  };

  const handleLeave = () => {
    if (!confirm("Leave this group?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("groupChatId", targetId);
      const res = await leaveGroupChat(fd);
      if ("error" in res && res.error) {
        alert(res.error);
      } else {
        window.location.href = "/messages";
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this group for everyone? This cannot be undone.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("groupChatId", targetId);
      const res = await deleteGroupChat(fd);
      if ("error" in res && res.error) {
        alert(res.error);
      } else {
        window.location.href = "/messages";
      }
    });
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        className="tg-header-btn"
        type="button"
        aria-label="Chat actions"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <UiIcon name="more" size={20} />
      </button>

      {open && (
        <div
          className="tg-chat-header-menu"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {kind === "user" && (
            <>
              <Link
                href={`/profile/${targetId}`}
                className="tg-chat-header-menu-item"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                <UiIcon name="user" size={14} /> View profile
              </Link>
              <button
                type="button"
                className="tg-chat-header-menu-item danger"
                onClick={() => {
                  setOpen(false);
                  handleBlock();
                }}
                role="menuitem"
              >
                <UiIcon name="flag" size={14} /> Block user
              </button>
            </>
          )}

          {kind === "group" && (
            <>
              {onShowMembers && (
                <button
                  type="button"
                  className="tg-chat-header-menu-item"
                  onClick={() => {
                    setOpen(false);
                    onShowMembers();
                  }}
                  role="menuitem"
                >
                  <UiIcon name="users" size={14} /> Members
                </button>
              )}
              <button
                type="button"
                className="tg-chat-header-menu-item"
                onClick={() => {
                  setOpen(false);
                  handleLeave();
                }}
                role="menuitem"
              >
                <UiIcon name="x" size={14} /> Leave group
              </button>
              {isGroupAdmin && (
                <button
                  type="button"
                  className="tg-chat-header-menu-item danger"
                  onClick={() => {
                    setOpen(false);
                    handleDelete();
                  }}
                  role="menuitem"
                >
                  <UiIcon name="trash" size={14} /> Delete group
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
