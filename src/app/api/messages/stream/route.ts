import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { groupChatMembers } from "@/lib/schema";
import { getSession } from "@/lib/session";
import {
  RealtimeEvent,
  dmChannel,
  groupChannel,
  markOnline,
  subscribe,
  userChannel,
} from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for the chat surface.
 *
 * Query params:
 *   user=<otherUserId>   subscribe to a 1:1 channel
 *   group=<groupId>      subscribe to a group channel
 *
 * Always also subscribes to the per-user inbox + presence:* so the
 * sidebar can react to unread counts and online indicators.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.userId as string;

  const { searchParams } = request.nextUrl;
  const otherUserId = searchParams.get("user")?.trim();
  const groupId = searchParams.get("group")?.trim();

  // Compute channels.
  const channels: string[] = [userChannel(userId), "presence:*"];

  if (otherUserId && otherUserId !== userId) {
    channels.push(dmChannel(userId, otherUserId));
  }
  if (groupId) {
    // Permission check: caller must be a member.
    const [member] = await db
      .select({ id: groupChatMembers.id })
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupId),
          eq(groupChatMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return new Response("Forbidden", { status: 403 });
    }
    channels.push(groupChannel(groupId));
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: RealtimeEvent | { type: "ping" }) => {
        if (closed) return;
        try {
          const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          /* stream closed */
        }
      };

      // Initial hello so the client knows the stream is live.
      send({ type: "ping" } as { type: "ping" });

      // Mark this user online and broadcast.
      markOnline(userId);

      // Heartbeat from server every 25s to keep proxies happy.
      const heartbeat = setInterval(() => {
        markOnline(userId); // refresh presence as long as the SSE is open
        send({ type: "ping" } as { type: "ping" });
      }, 25_000);

      const unsubscribe = subscribe(channels, (event) => {
        // Filter typing events authored by self.
        if (event.type === "typing" && event.userId === userId) return;
        send(event);
      });

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
