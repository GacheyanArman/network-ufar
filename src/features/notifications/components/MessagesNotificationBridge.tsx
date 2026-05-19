"use client";

import { useEffect, useRef } from "react";
import { useMessageStream } from "@/features/messages/hooks/use-message-stream";
import { usePresence } from "@/shared/realtime/use-presence";

interface Props {
  currentUserId: string;
  activeUserId?: string;
  activeGroupId?: string;
}

/**
 * Globally mounted on the messages page so it:
 *   1. Sends presence heartbeats while the tab is open.
 *   2. Subscribes to the per-user inbox (user:<id>) so unread counts update
 *      live in the sidebar without a refresh.
 *   3. Pops in-app + browser notifications when a new message arrives in
 *      a chat that isn't currently active or focused.
 */
export default function MessagesNotificationBridge({
  currentUserId,
  activeUserId,
  activeGroupId,
}: Props) {
  usePresence(true);

  const askedRef = useRef(false);
  useEffect(() => {
    if (askedRef.current) return;
    askedRef.current = true;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      // Don't be annoying — only ask once per session, after a small delay.
      setTimeout(() => Notification.requestPermission().catch(() => {}), 4000);
    }
  }, []);

  // Subscribe to a no-op chat to receive global presence + unread events.
  // We use the userChannel `user:<id>` channel which the stream auto-joins.
  useMessageStream({
    enabled: true,
    onEvent: (event) => {
      if (event.type === "message:new") {
        const m = event.message;
        if (m.senderId === currentUserId) return;

        const inActiveChat =
          (activeGroupId && m.groupChatId === activeGroupId) ||
          (activeUserId &&
            !m.groupChatId &&
            ((m.senderId === activeUserId && m.receiverId === currentUserId) ||
              (m.senderId === currentUserId && m.receiverId === activeUserId)));
        if (inActiveChat && document.visibilityState === "visible") return;

        const title = m.senderName ? `New message from ${m.senderName}` : "New message";
        const body = m.content ? m.content.slice(0, 140) : "📎 Attachment";

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(title, { body, icon: m.senderImage || "/favicon.ico" });
          } catch {
            /* ignore */
          }
        }
        // Inline toast.
        showToast(title, body);
      } else if (event.type === "unread:update") {
        // Bubble the count to the document title for visibility.
        const base = document.title.replace(/^\(\d+\)\s*/, "");
        document.title = event.total > 0 ? `(${event.total}) ${base}` : base;
      }
    },
    // Pass the actual chat we're in so the stream subscribes to it too.
    userId: activeUserId,
    groupId: activeGroupId,
  });

  return null;
}

let toastEl: HTMLDivElement | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(title: string, body: string) {
  if (typeof document === "undefined") return;
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.setAttribute("role", "status");
    toastEl.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      max-width: 340px;
      background: #0f172a;
      color: #fff;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 8px 32px rgba(15,23,42,0.25);
      z-index: 9999;
      font-family: inherit;
      font-size: 13px;
      line-height: 1.4;
      transform: translateY(-8px);
      opacity: 0;
      transition: opacity .2s, transform .2s;
    `;
    document.body.appendChild(toastEl);
  }
  toastEl.innerHTML = `<strong style="display:block;font-size:13px;font-weight:800;margin-bottom:2px">${escape(title)}</strong>${escape(body)}`;
  // trigger transition
  requestAnimationFrame(() => {
    toastEl!.style.opacity = "1";
    toastEl!.style.transform = "translateY(0)";
  });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (!toastEl) return;
    toastEl.style.opacity = "0";
    toastEl.style.transform = "translateY(-8px)";
  }, 4000);
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]!));
}
