"use client";

import { useCallback, useRef } from "react";
import { broadcastTyping } from "@/features/messages/server/actions";

/**
 * Returns a function the input can call on every keystroke. Internally it
 * throttles "typing=true" pings to one every 4s, and sends "typing=false"
 * when the user has been idle for 3s.
 */
export function useTypingBroadcaster(opts: { userId?: string; groupId?: string }) {
  const lastSentRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { userId, groupId } = opts;

  const send = useCallback(
    async (isTyping: boolean) => {
      if (!userId && !groupId) return;
      const fd = new FormData();
      if (userId) fd.set("userId", userId);
      if (groupId) fd.set("groupId", groupId);
      fd.set("isTyping", String(isTyping));
      try {
        await broadcastTyping(fd);
      } catch {
        /* network errors are ok for typing */
      }
    },
    [userId, groupId]
  );

  const onType = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current > 4_000) {
      lastSentRef.current = now;
      send(true);
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      lastSentRef.current = 0;
      send(false);
    }, 3_000);
  }, [send]);

  const stop = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    lastSentRef.current = 0;
    send(false);
  }, [send]);

  return { onType, stop };
}
