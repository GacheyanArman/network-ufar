"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/shared/db/db";
import { notifications, notificationPreferences } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import {
  parseFormDataWith,
  markNotificationReadSchema,
  notificationPreferencesSchema,
} from "@/shared/validations/validations";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function markNotificationRead(formData) {
  const userId = await requireUserId();
  const { notificationId } = parseFormDataWith(
    markNotificationReadSchema,
    formData,
  );

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

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

  revalidateTag("notifications");
  revalidatePath("/notifications");
  return { ok: true };
}

export async function updateNotificationPreferences(formData) {
  const userId = await requireUserId();

  const values = parseFormDataWith(notificationPreferencesSchema, formData);

  const existing = await db
    .select({ id: notificationPreferences.id })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(notificationPreferences)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db
      .insert(notificationPreferences)
      .values({ userId, ...values });
  }

  revalidateTag("notifications");
  revalidatePath("/notifications");
  return { ok: true };
}
