"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { groupChats, groupChatMembers, messages } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, or, inArray } from "drizzle-orm";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";

/**
 * Create a new group chat
 */
export async function createGroupChat(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  // Check rate limit
  const rateLimitResult = checkRateLimit(userId, "createPost");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime!) };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const faculty = formData.get("faculty") as string;
  const course = formData.get("course") as string;

  if (!name) {
    return { error: "Group name is required" };
  }

  try {
    const [groupChat] = await db
      .insert(groupChats)
      .values({
        name,
        description: description || null,
        faculty: faculty || null,
        course: course || null,
        creatorId: userId,
      })
      .returning();

    // Add creator as admin
    await db.insert(groupChatMembers).values({
      groupChatId: groupChat.id,
      userId,
      role: "admin",
    });

    revalidatePath("/messages");
    return { success: true, groupChatId: groupChat.id };
  } catch (error) {
    console.error("Error creating group chat:", error);
    return { error: "Failed to create group chat" };
  }
}

/**
 * Join a group chat
 */
export async function joinGroupChat(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const groupChatId = formData.get("groupChatId") as string;

  if (!groupChatId) {
    return { error: "Group chat ID is required" };
  }

  try {
    // Check if already a member
    const [existing] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      return { error: "Already a member of this group" };
    }

    await db.insert(groupChatMembers).values({
      groupChatId,
      userId,
      role: "member",
    });

    revalidatePath("/messages");
    return { success: true };
  } catch (error) {
    console.error("Error joining group chat:", error);
    return { error: "Failed to join group chat" };
  }
}

/**
 * Leave a group chat
 */
export async function leaveGroupChat(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const groupChatId = formData.get("groupChatId") as string;

  if (!groupChatId) {
    return { error: "Group chat ID is required" };
  }

  try {
    await db
      .delete(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, userId)
        )
      );

    revalidatePath("/messages");
    return { success: true };
  } catch (error) {
    console.error("Error leaving group chat:", error);
    return { error: "Failed to leave group chat" };
  }
}

/**
 * Send a message to a group chat
 */
export async function sendGroupMessage(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  // Check rate limit
  const rateLimitResult = checkRateLimit(userId, "sendMessage");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime!) };
  }

  const groupChatId = formData.get("groupChatId") as string;
  const content = formData.get("content") as string;

  if (!groupChatId || !content?.trim()) {
    return { error: "Group chat ID and message content are required" };
  }

  try {
    // Check if user is a member
    const [member] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return { error: "You are not a member of this group" };
    }

    await db.insert(messages).values({
      senderId: userId,
      receiverId: null,
      groupChatId,
      content: content.trim(),
    });

    revalidatePath("/messages");
    return { success: true };
  } catch (error) {
    console.error("Error sending group message:", error);
    return { error: "Failed to send message" };
  }
}

/**
 * Delete a group chat (admin only)
 */
export async function deleteGroupChat(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const groupChatId = formData.get("groupChatId") as string;

  if (!groupChatId) {
    return { error: "Group chat ID is required" };
  }

  try {
    // Check if user is admin
    const [member] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, groupChatId),
          eq(groupChatMembers.userId, userId),
          eq(groupChatMembers.role, "admin")
        )
      )
      .limit(1);

    if (!member) {
      return { error: "Only admins can delete the group" };
    }

    await db.delete(groupChats).where(eq(groupChats.id, groupChatId));

    revalidatePath("/messages");
    return { success: true };
  } catch (error) {
    console.error("Error deleting group chat:", error);
    return { error: "Failed to delete group chat" };
  }
}
