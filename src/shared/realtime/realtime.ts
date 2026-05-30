/**
 * In-process pub/sub used by SSE handlers + server actions.
 *
 * Important caveats:
 * - Works only inside a single Node.js process. If you scale to multiple
 *   instances behind a load balancer, swap this for Redis Pub/Sub or
 *   Postgres LISTEN/NOTIFY without changing call sites — the API stays
 *   the same.
 * - Subscribers identify themselves with a `channel` string. We use:
 *     dm:<userIdA>:<userIdB>     (sorted alphabetically — both users join)
 *     group:<groupId>            (members of a group)
 *     user:<userId>              (per-user inbox: unread count, presence)
 */
import { EventEmitter } from "node:events";

export type RealtimeEvent =
  | {
      type: "message:new";
      channel: string;
      message: SerializedMessage;
    }
  | {
      type: "message:edit";
      channel: string;
      messageId: string;
      content: string;
      editedAt: string;
    }
  | {
      type: "message:delete";
      channel: string;
      messageId: string;
      forEveryone: boolean;
    }
  | {
      type: "message:read";
      channel: string;
      messageId: string;
      userId: string;
      readAt: string;
    }
  | {
      type: "typing";
      channel: string;
      userId: string;
      isTyping: boolean;
    }
  | {
      type: "presence";
      userId: string;
      online: boolean;
      lastSeenAt: string | null;
    }
  | {
      type: "unread:update";
      userId: string;
      total: number;
    };

export interface SerializedMessage {
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
}

// Use globalThis so HMR in dev doesn't create multiple emitters and lose subscribers.
declare global {
   
  var __ufarRealtime: { bus: EventEmitter; presence: Map<string, number> } | undefined;
}

const realtime =
  globalThis.__ufarRealtime ??
  (globalThis.__ufarRealtime = {
    bus: new EventEmitter(),
    presence: new Map<string, number>(), // userId -> last heartbeat ms
  });
 
realtime.bus.setMaxListeners(0); // remove default 10-listener cap

export function publish(event: RealtimeEvent): void {
  // Channel-scoped channels emit on their channel name; presence/unread
  // emit per-user.
  if ("channel" in event) {
    realtime.bus.emit(event.channel, event);
  }
  if (event.type === "presence") {
    realtime.bus.emit(`presence:${event.userId}`, event);
    realtime.bus.emit("presence:*", event);
  } else if (event.type === "unread:update") {
    realtime.bus.emit(`user:${event.userId}`, event);
  }
}

export function subscribe(
  channels: string[],
  handler: (event: RealtimeEvent) => void
): () => void {
  for (const ch of channels) realtime.bus.on(ch, handler);
  return () => {
    for (const ch of channels) realtime.bus.off(ch, handler);
  };
}

// ---------------------------------------------------------------------------
// Channel name helpers
// ---------------------------------------------------------------------------

export function dmChannel(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `dm:${x}:${y}`;
}

export function groupChannel(groupId: string): string {
  return `group:${groupId}`;
}

export function userChannel(userId: string): string {
  return `user:${userId}`;
}

// ---------------------------------------------------------------------------
// Presence tracking (in-memory, augmented by users.lastSeenAt persistence)
// ---------------------------------------------------------------------------

const PRESENCE_WINDOW_MS = 60_000; // a user is "online" if heartbeat within last 60s

export function markOnline(userId: string): boolean {
  const wasOnline = isOnlineNow(userId);
  realtime.presence.set(userId, Date.now());
  if (!wasOnline) {
    publish({
      type: "presence",
      userId,
      online: true,
      lastSeenAt: new Date().toISOString(),
    });
  }
  return !wasOnline; // returns true on transition
}

export function markOffline(userId: string): void {
  if (isOnlineNow(userId)) {
    realtime.presence.delete(userId);
    publish({
      type: "presence",
      userId,
      online: false,
      lastSeenAt: new Date().toISOString(),
    });
  } else {
    realtime.presence.delete(userId);
  }
}

export function isOnlineNow(userId: string): boolean {
  const last = realtime.presence.get(userId);
  if (!last) return false;
  return Date.now() - last < PRESENCE_WINDOW_MS;
}

export function getOnlineUsers(): string[] {
  const now = Date.now();
  const out: string[] = [];
  for (const [uid, t] of realtime.presence.entries()) {
    if (now - t < PRESENCE_WINDOW_MS) out.push(uid);
  }
  return out;
}

// Periodically purge stale entries so presence:offline events fire even if
// the client just walks away without sending a goodbye.
setInterval(() => {
  const now = Date.now();
  for (const [uid, t] of realtime.presence.entries()) {
    if (now - t >= PRESENCE_WINDOW_MS) {
      realtime.presence.delete(uid);
      publish({
        type: "presence",
        userId: uid,
        online: false,
        lastSeenAt: new Date(t).toISOString(),
      });
    }
  }
}, 30_000).unref?.();
