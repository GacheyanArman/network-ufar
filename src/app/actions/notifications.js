"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { getSession } from "@/lib/session";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function markNotificationRead(formData) {
  const userId = await requireUserId();
  const notificationId = formData.get("notificationId")?.toString().trim();

  if (!notificationId) throw new Error("Invalid notification");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

  // Инвалидируем кэш уведомлений
  revalidateTag("notifications");
  revalidatePath("/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const userId = await requireUserId();

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  // Инвалидируем кэш уведомлений
  revalidateTag("notifications");
  revalidatePath("/notifications");
  return { ok: true };
}
