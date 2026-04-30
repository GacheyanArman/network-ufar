"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { messages, users } from "@/lib/schema";
import { getSession } from "@/lib/session";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

function normalizeMessage(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

async function emitMessageEvent() {
  // Socket.io can be called here later without changing the action API.
}

export async function sendMessage(formData) {
  const senderId = await requireUserId();
  const receiverId = formData.get("receiverId")?.toString().trim();
  const content = normalizeMessage(formData.get("content"));

  if (!receiverId || receiverId === senderId) {
    throw new Error("Invalid receiver");
  }

  if (!content) {
    throw new Error("Message cannot be empty");
  }

  if (content.length > 2000) {
    throw new Error("Message is too long");
  }

  const [receiver] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, receiverId))
    .limit(1);

  if (!receiver) {
    throw new Error("Receiver not found");
  }

  const [message] = await db
    .insert(messages)
    .values({
      senderId,
      receiverId,
      content,
    })
    .returning({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      content: messages.content,
      createdAt: messages.createdAt,
    });

  await emitMessageEvent(message);

  revalidatePath(`/messages?user=${receiverId}`);
  revalidatePath("/messages");

  return { ok: true, message };
}

