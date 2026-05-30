import { NextResponse } from "next/server";
import { and, eq, sql, isNull } from "drizzle-orm";
import { db } from "@/shared/db/db";
import { messages, groupChatMembers, messageReads } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";

export const dynamic = "force-dynamic";

/**
 * Returns:
 *   total           — total unread DMs for the current user
 *   perUser         — { otherUserId: count } DM unread breakdown
 *   perGroup        — { groupId: count } unread group messages
 */
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.userId as string;

  // DM unread per partner.
  const dmRows = await db
    .select({
      partnerId: messages.senderId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.receiverId, userId),
        eq(messages.isRead, false),
        isNull(messages.groupChatId)
      )
    )
    .groupBy(messages.senderId);

  const perUser: Record<string, number> = {};
  let total = 0;
  for (const r of dmRows) {
    perUser[r.partnerId] = r.count;
    total += r.count;
  }

  // Group unread per group: messages in the group that the user has not
  // read AND that they didn't send themselves.
  const groupRows = await db
    .select({
      groupId: messages.groupChatId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(messages)
    .innerJoin(
      groupChatMembers,
      and(
        eq(groupChatMembers.groupChatId, messages.groupChatId),
        eq(groupChatMembers.userId, userId)
      )
    )
    .where(
      and(
        sql`${messages.senderId} <> ${userId}`,
        sql`NOT EXISTS (
          SELECT 1 FROM ${messageReads}
          WHERE ${messageReads.messageId} = ${messages.id}
            AND ${messageReads.userId} = ${userId}
        )`,
        isNull(messages.deletedAt)
      )
    )
    .groupBy(messages.groupChatId);

  const perGroup: Record<string, number> = {};
  for (const r of groupRows) {
    if (r.groupId) {
      perGroup[r.groupId] = r.count;
      total += r.count;
    }
  }

  return NextResponse.json({ total, perUser, perGroup });
}
