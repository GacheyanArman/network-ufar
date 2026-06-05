"use server";

import { and, eq, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import {
  messages,
  messageReads,
  groupChatMembers,
  users,
  blockedUsers,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import { saveUploadFileWithMeta, IMAGE_TYPES } from "@/shared/storage/upload";
import {
  publish,
  dmChannel,
  groupChannel,
  userChannel,
  type SerializedMessage,
} from "@/shared/realtime/realtime";
import { canModerate } from "@/shared/auth/roles";
import {
  parseFormDataWith,
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  markThreadReadSchema,
  broadcastTypingSchema,
} from "@/shared/validations/validations";

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId as string;
}

/**
 * Hydrate a row with sender info and serialize to JSON-safe form so it can
 * be pushed verbatim through the SSE channel.
 */
async function serializeMessage(
  messageId: string
): Promise<SerializedMessage | null> {
  const [row] = await db
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
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    groupChatId: row.groupChatId,
    content: row.deletedForEveryone ? "" : row.content,
    attachmentUrl: row.deletedForEveryone ? null : row.attachmentUrl,
    attachmentType: row.deletedForEveryone ? null : row.attachmentType,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    deletedForEveryone: row.deletedForEveryone,
    senderName: row.senderName,
    senderImage: row.senderImage,
  };
}

/**
 * Verify direct-chat send. Throws if blocked.
 */
async function assertCanSendDM(senderId: string, receiverId: string) {
  if (!receiverId || receiverId === senderId) {
    throw new Error("Invalid receiver");
  }
  const [receiver] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, receiverId));
  if (!receiver) throw new Error("Receiver not found");

  const [block] = await db
    .select({ id: blockedUsers.id, blockerId: blockedUsers.blockerId })
    .from(blockedUsers)
    .where(
      or(
        and(
          eq(blockedUsers.blockerId, senderId),
          eq(blockedUsers.blockedId, receiverId)
        ),
        and(
          eq(blockedUsers.blockerId, receiverId),
          eq(blockedUsers.blockedId, senderId)
        )
      )
    )
    .limit(1);

  if (block) {
    throw new Error(
      block.blockerId === senderId
        ? "You blocked this student. Unblock them to send a message."
        : "You cannot message this student right now."
    );
  }
}

async function assertGroupMember(groupId: string, userId: string) {
  const [m] = await db
    .select({ id: groupChatMembers.id, role: groupChatMembers.role })
    .from(groupChatMembers)
    .where(
      and(
        eq(groupChatMembers.groupChatId, groupId),
        eq(groupChatMembers.userId, userId)
      )
    )
    .limit(1);
  if (!m) throw new Error("Not a member of this group");
  return m;
}

/**
 * Send a message. Supports both DM (`receiverId`) and group (`groupChatId`),
 * and an optional `attachment` File field.
 *
 * Returns the persisted serialized message so the client can replace the
 * optimistic placeholder.
 */
export async function sendMessage(formData: FormData) {
  const senderId = await requireUserId();

  const rate = await checkRateLimitAsync(senderId, "sendMessage");
  if (!rate.allowed) throw new Error(getRateLimitError(rate.resetTime ?? Date.now()));

  const parsed = parseFormDataWith(sendMessageSchema, formData);
  const receiverId = parsed.receiverId;
  const groupChatId = parsed.groupChatId;
  const content = parsed.content;
  const attachment = formData.get("attachment");

  let attachmentUrl: string | null = null;
  let attachmentType: string | null = null;

  if (attachment && typeof attachment === "object" && "size" in attachment && attachment.size > 0) {
    const file = attachment as File;
    const isImage = file.type.startsWith("image/");
    const result = await saveUploadFileWithMeta(file, {
      subdir: "messages",
      prefix: "msg",
      maxSize: isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024,
      allowedMimeTypes: isImage ? [...IMAGE_TYPES] : ["application/pdf", "text/plain"],
      processImage: isImage,
    });
    attachmentUrl = result?.url ?? null;
    attachmentType = isImage ? "image" : "file";
  } else if (parsed.existingAttachmentUrl) {
    // Pre-existing URL (e.g. sharing a post photo — no upload needed)
    attachmentUrl = parsed.existingAttachmentUrl;
    attachmentType = parsed.existingAttachmentType || "image";
  }

  if (!content && !attachmentUrl) {
    throw new Error("Message cannot be empty");
  }

  if (groupChatId) {
    await assertGroupMember(groupChatId, senderId);
    const [inserted] = await db
      .insert(messages)
      .values({
        senderId,
        receiverId: null,
        groupChatId,
        content: content || "",
        attachmentUrl,
        attachmentType,
      })
      .returning({ id: messages.id });

    const payload = await serializeMessage(inserted.id);
    if (payload) {
      publish({
        type: "message:new",
        channel: groupChannel(groupChatId),
        message: payload,
      });
      // Also push unread updates to all other members.
      const members = await db
        .select({ userId: groupChatMembers.userId })
        .from(groupChatMembers)
        .where(eq(groupChatMembers.groupChatId, groupChatId));
      for (const m of members) {
        if (m.userId !== senderId) bumpUnreadFor(m.userId);
      }
    }

    revalidatePath("/messages");
    return { ok: true, message: payload };
  }

  if (receiverId) {
    await assertCanSendDM(senderId, receiverId);
    const [inserted] = await db
      .insert(messages)
      .values({
        senderId,
        receiverId,
        content: content || "",
        attachmentUrl,
        attachmentType,
      })
      .returning({ id: messages.id });

    const payload = await serializeMessage(inserted.id);
    if (payload) {
      publish({
        type: "message:new",
        channel: dmChannel(senderId, receiverId),
        message: payload,
      });
      bumpUnreadFor(receiverId);
    }

    revalidatePath(`/messages?user=${receiverId}`);
    revalidatePath("/messages");
    return { ok: true, message: payload };
  }

  throw new Error("Either receiverId or groupChatId is required");
}

/**
 * Edit a message you authored. Sets `editedAt` and rebroadcasts.
 */
export async function editMessage(formData: FormData) {
  const userId = await requireUserId();
  const { messageId, content } = parseFormDataWith(editMessageSchema, formData);

  const [msg] = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      groupChatId: messages.groupChatId,
      deletedForEveryone: messages.deletedForEveryone,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!msg) throw new Error("Message not found");
  if (msg.deletedForEveryone) throw new Error("Message is deleted");
  if (msg.senderId !== userId) throw new Error("Forbidden");

  const editedAt = new Date();
  await db
    .update(messages)
    .set({ content, editedAt })
    .where(eq(messages.id, messageId));

  const channel = msg.groupChatId
    ? groupChannel(msg.groupChatId)
    : dmChannel(msg.senderId, msg.receiverId!);

  publish({
    type: "message:edit",
    channel,
    messageId,
    content,
    editedAt: editedAt.toISOString(),
  });

  revalidatePath("/messages");
  return { ok: true };
}

/**
 * Delete a message. Two modes:
 *   forEveryone=true   -> only sender or staff; clears content for all
 *   forEveryone=false  -> hides locally for the caller (soft delete via deletedAt)
 */
export async function deleteMessage(formData: FormData) {
  const userId = await requireUserId();
  const parsed = parseFormDataWith(deleteMessageSchema, formData);
  const messageId = parsed.messageId;
  const forEveryone = parsed.forEveryone === "true";

  const [msg] = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      groupChatId: messages.groupChatId,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!msg) throw new Error("Message not found");

  if (forEveryone) {
    if (!(await canModerate(userId, msg.senderId))) throw new Error("Forbidden");
    await db
      .update(messages)
      .set({
        deletedForEveryone: true,
        deletedAt: new Date(),
        content: "",
        attachmentUrl: null,
        attachmentType: null,
      })
      .where(eq(messages.id, messageId));

    const channel = msg.groupChatId
      ? groupChannel(msg.groupChatId)
      : dmChannel(msg.senderId, msg.receiverId!);

    publish({
      type: "message:delete",
      channel,
      messageId,
      forEveryone: true,
    });
  } else {
    // "Delete for me" — only changes local visibility. We don't have a per-user
    // hidden table, so set deletedAt only when the caller is the sender; for
    // recipients we just notify the client to drop it locally.
    if (msg.senderId === userId) {
      await db
        .update(messages)
        .set({ deletedAt: new Date() })
        .where(eq(messages.id, messageId));
    }
    // For "delete for me" by recipient we do not publish — the client just hides it.
  }

  revalidatePath("/messages");
  return { ok: true };
}

/**
 * Mark all messages in a thread as read by the caller.
 * For DMs: stamps message.is_read + read_at + status='seen'.
 * For groups: writes a row in message_read.
 */
export async function markThreadRead(formData: FormData) {
  const userId = await requireUserId();
  const parsed = parseFormDataWith(markThreadReadSchema, formData);
  const otherUserId = parsed.userId;
  const groupId = parsed.groupId;

  const now = new Date();

  if (groupId) {
    await assertGroupMember(groupId, userId);
    // Insert read receipts for all unread messages in the group.
    const unread = await db
      .select({ id: messages.id, senderId: messages.senderId })
      .from(messages)
      .where(
        and(
          eq(messages.groupChatId, groupId),
          isNull(messages.deletedAt),
          sql`NOT EXISTS (
            SELECT 1 FROM ${messageReads}
            WHERE ${messageReads.messageId} = ${messages.id}
              AND ${messageReads.userId} = ${userId}
          )`
        )
      );

    for (const m of unread) {
      try {
        await db.insert(messageReads).values({ messageId: m.id, userId });
        publish({
          type: "message:read",
          channel: groupChannel(groupId),
          messageId: m.id,
          userId,
          readAt: now.toISOString(),
        });
      } catch {
        /* ignore unique violations */
      }
    }
  } else {
    // 1:1 — flip is_read for messages I received.
    const updated = await db
      .update(messages)
      .set({ isRead: true, readAt: now, status: "seen" })
      .where(
        and(
          eq(messages.senderId, otherUserId),
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )
      )
      .returning({ id: messages.id });

    for (const m of updated) {
      publish({
        type: "message:read",
        channel: dmChannel(userId, otherUserId),
        messageId: m.id,
        userId,
        readAt: now.toISOString(),
      });
    }
  }

  // Refresh unread badge for this user.
  const [{ total } = { total: 0 }] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.receiverId, userId),
        eq(messages.isRead, false)
      )
    );
  publish({ type: "unread:update", userId, total });

  return { ok: true };
}

/**
 * Public helper used by other actions to bump the unread badge.
 * Computes the freshest count instead of incrementing in-memory.
 */
async function bumpUnreadFor(userId: string) {
  const [{ total } = { total: 0 }] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.receiverId, userId),
        eq(messages.isRead, false)
      )
    );
  publish({ type: "unread:update", userId, total });
}

/**
 * Lightweight typing-indicator broadcaster. Server doesn't persist anything.
 */
export async function broadcastTyping(formData: FormData) {
  const userId = await requireUserId();
  const parsed = parseFormDataWith(broadcastTypingSchema, formData);
  const otherUserId = parsed.userId;
  const groupId = parsed.groupId;
  const isTyping = parsed.isTyping === "true";

  if (groupId) {
    await assertGroupMember(groupId, userId);
    publish({
      type: "typing",
      channel: groupChannel(groupId),
      userId,
      isTyping,
    });
  } else if (otherUserId) {
    publish({
      type: "typing",
      channel: dmChannel(userId, otherUserId),
      userId,
      isTyping,
    });
  }
  return { ok: true };
}
