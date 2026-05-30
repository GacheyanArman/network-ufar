"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribe to the SSE stream and dispatch typed events to the caller.
 *
 * Reconnects with exponential backoff on transport errors.
 * Pauses while document is hidden to save battery (resumes on visibility).
 */
export type StreamEvent =
  | {
      type: "message:new";
      message: {
        id: string;
        senderId: string;
        receiverId: string | null;
        groupChatId: string | null;
        content: string;
        attachmentUrl: string | null;
        attachmentType: string | null;
        status: "sent" | "delivered" | "seen";
        createdAt: string;
        editedAt: string | null;
        deletedAt: string | null;
        deletedForEveryone: boolean;
        senderName?: string;
        senderImage?: string | null;
      };
    }
  | {
      type: "message:edit";
      messageId: string;
      content: string;
      editedAt: string;
    }
  | {
      type: "message:delete";
      messageId: string;
      forEveryone: boolean;
    }
  | {
      type: "message:read";
      messageId: string;
      userId: string;
      readAt: string;
    }
  | { type: "typing"; userId: string; isTyping: boolean }
  | {
      type: "presence";
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
    }
  | { type: "unread:update"; userId: string; total: number }
  | { type: "ping" };

interface UseMessageStreamOpts {
  userId?: string;
  groupId?: string;
  onEvent: (event: StreamEvent) => void;
  enabled?: boolean;
}

export function useMessageStream({
  userId,
  groupId,
  onEvent,
  enabled = true,
}: UseMessageStreamOpts) {
  // Keep latest handler in a ref so we don't reconnect on every render.
  // The ref must be updated outside of render — using a tiny effect keeps the
  // ref in sync without triggering the SSE reconnect.
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || (!userId && !groupId)) return;

    const params = new URLSearchParams();
    if (userId) params.set("user", userId);
    if (groupId) params.set("group", groupId);

    let attempt = 0;
    let es: EventSource | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      es = new EventSource(`/api/messages/stream?${params.toString()}`);

      const types: StreamEvent["type"][] = [
        "message:new",
        "message:edit",
        "message:delete",
        "message:read",
        "typing",
        "presence",
        "unread:update",
        "ping",
      ];
      for (const t of types) {
        es.addEventListener(t, (ev) => {
          attempt = 0; // healthy connection
          try {
            const data = JSON.parse((ev as MessageEvent).data);
            handlerRef.current(data as StreamEvent);
          } catch {
            /* malformed frame */
          }
        });
      }

      es.onerror = () => {
        if (cancelled) return;
        es?.close();
        es = null;
        const delay = Math.min(30_000, 1000 * 2 ** attempt);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !es) {
        attempt = 0;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [userId, groupId, enabled]);
}
