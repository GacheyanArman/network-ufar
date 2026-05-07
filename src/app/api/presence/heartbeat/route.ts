import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { markOnline, getOnlineUsers, isOnlineNow } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/**
 * POST: heartbeat — refreshes the user's lastSeenAt + in-memory presence.
 * GET:  returns the current online list, useful for first-paint hydration.
 */
export async function POST() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.userId as string;

  const transitioned = markOnline(userId);

  // Persist lastSeenAt at most once a minute to avoid Neon spam.
  if (transitioned) {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, userId));
  }

  return NextResponse.json({
    ok: true,
    online: true,
    onlineUsers: getOnlineUsers(),
  });
}

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    onlineUsers: getOnlineUsers(),
    youOnline: isOnlineNow(session.userId as string),
  });
}
