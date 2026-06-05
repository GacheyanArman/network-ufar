import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/shared/db/db";
import { groupChatMembers, messages } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";

export const dynamic = "force-dynamic";

type PolledMessage = {
  id: string;
  senderId: string;
  receiverId: string | null;
  groupChatId: string | null;
  content: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
  status: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  deletedForEveryone: boolean | null;
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.userId as string;
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId")?.trim();
  const groupId = searchParams.get("groupId")?.trim();
  const lastMessageId = searchParams.get("lastMessageId")?.trim();

  if (!userId && !groupId) {
    return NextResponse.json({ error: "Missing userId or groupId" }, { status: 400 });
  }

  try {
    let cursorCreatedAt: Date | null = null;
    if (lastMessageId) {
      const [cursor] = await db
        .select({ createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.id, lastMessageId))
        .limit(1);
      cursorCreatedAt = cursor?.createdAt ?? null;
    }

    let whereClause;

    if (groupId) {
      const [member] = await db
        .select({ id: groupChatMembers.id })
        .from(groupChatMembers)
        .where(
          and(
            eq(groupChatMembers.groupChatId, groupId),
            eq(groupChatMembers.userId, currentUserId)
          )
        )
        .limit(1);

      if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      whereClause = and(
        eq(messages.groupChatId, groupId),
        cursorCreatedAt ? gt(messages.createdAt, cursorCreatedAt) : undefined
      );
    } else {
      whereClause = and(
        isNull(messages.groupChatId),
        or(
          and(
            eq(messages.senderId, currentUserId),
            eq(messages.receiverId, userId!)
          ),
          and(
            eq(messages.senderId, userId!),
            eq(messages.receiverId, currentUserId)
          )
        ),
        cursorCreatedAt ? gt(messages.createdAt, cursorCreatedAt) : undefined
      );
    }

    const newMessages = await db
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
      })
      .from(messages)
      .where(whereClause)
      .orderBy(messages.createdAt)
      .limit(50);

    return NextResponse.json({
      messages: newMessages.map((message: PolledMessage) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
        editedAt: message.editedAt ? message.editedAt.toISOString() : null,
        deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
        content: message.deletedForEveryone ? "" : message.content,
        attachmentUrl: message.deletedForEveryone ? null : message.attachmentUrl,
        attachmentType: message.deletedForEveryone ? null : message.attachmentType,
      })),
    });
  } catch (error) {
    console.error("Error polling messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
