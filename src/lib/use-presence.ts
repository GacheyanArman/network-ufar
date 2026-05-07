"use client";

import { useEffect } from "react";

/**
 * Sends a presence heartbeat every 30s while mounted, plus a beacon on
 * page hide / unload. Server uses these to flip the user online/offline
 * and broadcast presence events.
 */
export function usePresence(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const ping = () => {
      if (cancelled) return;
      fetch("/api/presence/heartbeat", {
        method: "POST",
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, 30_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
}
