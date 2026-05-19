import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/shared/db/db";
import {
  groupChatMembers,
  messageReads,
  messages,
  users,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

/**
 * Infinite-scroll history loader.
 *
 * Query params:
 *   user=<otherId>   1:1 thread
 *   group=<groupId>  group chat (caller must be a member)
 *   before=<msgId>   load messages older than this id (cursor)
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.userId as string;

  const { searchParams } = request.nextUrl;
  const otherUserId = searchParams.get("user")?.trim();
  const groupId = searchParams.get("group")?.trim();
  const before = searchParams.get("before")?.trim();

  if (!otherUserId && !groupId) {
    return NextResponse.json(
      { error: "Missing user or group" },
      { status: 400 }
    );
  }

  let cursor: Date | null = null;
  if (before) {
    const [b] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, before))
      .limit(1);
    cursor = b?.createdAt ?? null;
  }

  // Build the where clause depending on the conversation type.
  let whereClause;
  if (groupId) {
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    whereClause = and(
      eq(messages.groupChatId, groupId),
      cursor ? lt(messages.createdAt, cursor) : undefined
    );
  } else {
    whereClause = and(
      isNull(messages.groupChatId),
      or(
        and(
          eq(messages.senderId, userId),
          eq(messages.receiverId, otherUserId!)
        ),
        and(
          eq(messages.senderId, otherUserId!),
          eq(messages.receiverId, userId)
        )
      ),
      cursor ? lt(messages.createdAt, cursor) : undefined
    );
  }

  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      groupChatId: messages.groupChatId,
      content: messages.content,
      attachmentUrl: messages.attachmentUrl,
      attachmentType: messages.attachmentType,
      status: messages.status,
      createdAt: messages.createdAt,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
      deletedForEveryone: messages.deletedForEveryone,
      senderName: users.fullName,
      senderImage: users.image,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(whereClause)
    .orderBy(desc(messages.createdAt))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  page.reverse(); // chronological for the client

  // For group threads, fetch read receipts for the page so we can render
  // "seen by N" tooltips.
  let receipts: Record<string, string[]> = {};
  if (groupId && page.length > 0) {
    const ids = page.map((m) => m.id);
    const reads = await db
      .select({
        messageId: messageReads.messageId,
        userId: messageReads.userId,
      })
      .from(messageReads)
      .where(
        sql`${messageReads.messageId} = ANY(${ids})`
      );
    for (const r of reads) {
      (receipts[r.messageId] = receipts[r.messageId] || []).push(r.userId);
    }
  }

  return NextResponse.json({
    messages: page.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      editedAt: m.editedAt ? m.editedAt.toISOString() : null,
      deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
      content: m.deletedForEveryone ? "" : m.content,
      attachmentUrl: m.deletedForEveryone ? null : m.attachmentUrl,
      attachmentType: m.deletedForEveryone ? null : m.attachmentType,
    })),
    hasMore,
    receipts,
  });
}
