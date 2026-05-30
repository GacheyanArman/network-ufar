"use server";

import { and, eq, or, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/shared/db/db";
import { messages, groupChats, groupChatMembers, users } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";

/**
 * Returns the chats the current user can share a post into:
 *   - direct-message partners they've already talked to
 *   - group chats they are a member of
 *
 * Used by the feed "Share" button to forward a post link into Messages.
 */
export async function getShareTargets(): Promise<
  Array<{ type: "user" | "group"; id: string; name: string; image: string | null }>
> {
  const session = await getSession();
  if (!session?.userId) return [];
  const userId = session.userId as string;

  // Direct-message partners (anyone the user has exchanged DMs with).
  const dmRows = await db
    .select({
      senderId: messages.senderId,
      receiverId: messages.receiverId,
    })
    .from(messages)
    .where(
      and(
        isNotNull(messages.receiverId),
        or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
      )
    );

  const partnerIds: string[] = Array.from(
    new Set(
      (dmRows as Array<{ senderId: string; receiverId: string | null }>)
        .map((r) => (r.senderId === userId ? r.receiverId : r.senderId))
        .filter((id): id is string => Boolean(id) && id !== userId)
    )
  );

  const dmUsers = partnerIds.length
    ? await db
        .select({ id: users.id, fullName: users.fullName, image: users.image })
        .from(users)
        .where(inArray(users.id, partnerIds))
    : [];

  // Group chats the user belongs to.
  const groupRows = await db
    .select({
      id: groupChats.id,
      name: groupChats.name,
      avatar: groupChats.avatar,
    })
    .from(groupChatMembers)
    .innerJoin(groupChats, eq(groupChatMembers.groupChatId, groupChats.id))
    .where(eq(groupChatMembers.userId, userId));

  const userTargets = (
    dmUsers as Array<{ id: string; fullName: string | null; image: string | null }>
  ).map((u) => ({
    type: "user" as const,
    id: u.id,
    name: u.fullName || "User",
    image: u.image ?? null,
  }));

  const groupTargets = (
    groupRows as Array<{ id: string; name: string | null; avatar: string | null }>
  ).map((g) => ({
    type: "group" as const,
    id: g.id,
    name: g.name || "Group",
    image: g.avatar ?? null,
  }));

  return [...userTargets, ...groupTargets];
}
