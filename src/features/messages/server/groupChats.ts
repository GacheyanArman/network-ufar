"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { groupChats, groupChatMembers, messages, users } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq, and } from "drizzle-orm";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import { saveUploadFileWithMeta } from "@/shared/storage/upload";
import {
  safeParseFormData,
  createGroupChatSchema,
  groupChatIdSchema,
  groupChatMemberSchema,
  setGroupMemberRoleSchema,
  sendGroupMessageSchema,
  updateGroupChatSchema,
} from "@/shared/validations/validations";

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId as string;
}

async function requireGroupAdmin(userId: string, groupChatId: string) {
  const [member] = await db
    .select({ role: groupChatMembers.role })
    .from(groupChatMembers)
    .where(
      and(
        eq(groupChatMembers.groupChatId, groupChatId),
        eq(groupChatMembers.userId, userId)
      )
    )
    .limit(1);

  if (member?.role === "admin") return;

  // Allow global staff to perform admin actions too.
  const [u] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (u?.role === "admin" || u?.role === "moderator") return;

  throw new Error("Only group admins can perform this action");
}

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
  const rateLimitResult = await checkRateLimitAsync(userId, "createPost");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime ?? Date.now()) };
  }

  const parsed = safeParseFormData(createGroupChatSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const data = parsed.data;

  try {
    const [groupChat] = await db
      .insert(groupChats)
      .values({
        name: data.name,
        description: data.description || null,
        faculty: data.faculty || null,
        course: data.course || null,
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
  const parsed = safeParseFormData(groupChatIdSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { groupChatId } = parsed.data;

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
  const parsed = safeParseFormData(groupChatIdSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { groupChatId } = parsed.data;

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
  const rateLimitResult = await checkRateLimitAsync(userId, "sendMessage");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime ?? Date.now()) };
  }

  const parsed = safeParseFormData(sendGroupMessageSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { groupChatId, content } = parsed.data;

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
      content,
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
  const parsed = safeParseFormData(groupChatIdSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { groupChatId } = parsed.data;

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

// ---------------------------------------------------------------------------
// Member management
// ---------------------------------------------------------------------------

/**
 * Add a user as a member of a group. Caller must be a group admin (or global staff).
 */
export async function addGroupMember(formData: FormData) {
  const callerId = await requireUserId();
  const parsed = safeParseFormData(groupChatMemberSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { groupChatId, userId: targetUserId } = parsed.data;

  await requireGroupAdmin(callerId, groupChatId);

  // Idempotent — uses unique index.
  const [existing] = await db
    .select({ id: groupChatMembers.id })
    .from(groupChatMembers)
    .where(
      and(
        eq(groupChatMembers.groupChatId, groupChatId),
        eq(groupChatMembers.userId, targetUserId)
      )
    )
    .limit(1);
  if (existing) return { success: true, alreadyMember: true };

  await db.insert(groupChatMembers).values({
    groupChatId,
    userId: targetUserId,
    role: "member",
  });

  revalidatePath("/messages");
  return { success: true };
}

/**
 * Remove a member from the group. Admin-only.
 * Admins cannot remove the group creator.
 */
export async function removeGroupMember(formData: FormData) {
  const callerId = await requireUserId();
  const parsed = safeParseFormData(groupChatMemberSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { groupChatId, userId: targetUserId } = parsed.data;

  await requireGroupAdmin(callerId, groupChatId);

  const [group] = await db
    .select({ creatorId: groupChats.creatorId })
    .from(groupChats)
    .where(eq(groupChats.id, groupChatId))
    .limit(1);
  if (!group) return { error: "Group not found" };
  if (group.creatorId === targetUserId) {
    return { error: "Cannot remove the group creator" };
  }

  await db
    .delete(groupChatMembers)
    .where(
      and(
        eq(groupChatMembers.groupChatId, groupChatId),
        eq(groupChatMembers.userId, targetUserId)
      )
    );

  revalidatePath("/messages");
  return { success: true };
}

/**
 * Promote / demote a member. Admin-only.
 * role ∈ "admin" | "moderator" | "member"
 */
export async function setGroupMemberRole(formData: FormData) {
  const callerId = await requireUserId();
  const parsed = safeParseFormData(setGroupMemberRoleSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { groupChatId, userId: targetUserId, role } = parsed.data;

  await requireGroupAdmin(callerId, groupChatId);

  await db
    .update(groupChatMembers)
    .set({ role })
    .where(
      and(
        eq(groupChatMembers.groupChatId, groupChatId),
        eq(groupChatMembers.userId, targetUserId)
      )
    );

  revalidatePath("/messages");
  return { success: true };
}

/**
 * Update group metadata + optional avatar upload.
 */
export async function updateGroupChat(formData: FormData) {
  const callerId = await requireUserId();
  const parsed = safeParseFormData(updateGroupChatSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { groupChatId, name, description, faculty, course } = parsed.data;
  const avatar = formData.get("avatar");

  await requireGroupAdmin(callerId, groupChatId);

  const update: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (name) update.name = name;
  if (formData.has("description")) update.description = description || null;
  if (formData.has("faculty")) update.faculty = faculty || null;
  if (formData.has("course")) update.course = course || null;

  if (avatar && typeof avatar === "object" && "size" in avatar && (avatar as File).size > 0) {
    const file = avatar as File;
    const result = await saveUploadFileWithMeta(file, {
      subdir: "messages",
      prefix: "group",
      maxSize: 5 * 1024 * 1024,
      allowedMimePrefix: "image/",
      processImage: true,
    });
    update.avatar = result?.url ?? update.avatar;
  }

  await db.update(groupChats).set(update).where(eq(groupChats.id, groupChatId));

  revalidatePath("/messages");
  return { success: true };
}

/**
 * List members of a group. Members-only.
 */
export async function listGroupMembers(groupChatId: string) {
  const callerId = await requireUserId();

  // Membership check.
  const [m] = await db
    .select({ id: groupChatMembers.id })
    .from(groupChatMembers)
    .where(
      and(
        eq(groupChatMembers.groupChatId, groupChatId),
        eq(groupChatMembers.userId, callerId)
      )
    )
    .limit(1);
  if (!m) {
    // Allow global staff inspection.
    const [u] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, callerId))
      .limit(1);
    if (u?.role !== "admin" && u?.role !== "moderator") {
      throw new Error("Forbidden");
    }
  }

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      faculty: users.faculty,
      image: users.image,
      lastSeenAt: users.lastSeenAt,
      role: groupChatMembers.role,
      joinedAt: groupChatMembers.joinedAt,
    })
    .from(groupChatMembers)
    .innerJoin(users, eq(groupChatMembers.userId, users.id))
    .where(eq(groupChatMembers.groupChatId, groupChatId))
    .orderBy(groupChatMembers.joinedAt);

  return rows;
}
