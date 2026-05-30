import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db/db";
import { messages } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { and, eq, gt, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.userId as string;
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const groupId = searchParams.get("groupId");
  const lastMessageId = searchParams.get("lastMessageId");

  if (!userId && !groupId) {
    return NextResponse.json({ error: "Missing userId or groupId" }, { status: 400 });
  }

  try {
    let newMessages;

    if (groupId) {
      // Get new group messages
      newMessages = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(
          and(
            eq(messages.groupChatId, groupId),
            lastMessageId ? gt(messages.id, lastMessageId) : undefined
          )
        )
        .orderBy(messages.createdAt)
        .limit(50);
    } else if (userId) {
      // Get new direct messages
      newMessages = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(
          and(
            or(
              and(
                eq(messages.senderId, currentUserId),
                eq(messages.receiverId, userId)
              ),
              and(
                eq(messages.senderId, userId),
                eq(messages.receiverId, currentUserId)
              )
            ),
            lastMessageId ? gt(messages.id, lastMessageId) : undefined
          )
        )
        .orderBy(messages.createdAt)
        .limit(50);
    }

    return NextResponse.json({ messages: newMessages || [] });
  } catch (error) {
    console.error("Error polling messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
