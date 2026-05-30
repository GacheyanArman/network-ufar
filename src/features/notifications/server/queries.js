import { db } from "@/shared/db/db";
import { notifications, notificationPreferences } from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";

const TYPES = new Set([
  "like",
  "comment",
  "friend_request",
  "friend_accept",
  "message",
  "reminder",
  "material_approved",
  "photo_approved",
  "event_new",
  "deadline",
  "group_join",
]);

const TYPE_CATEGORY = {
  like: "social",
  comment: "social",
  friend_request: "social",
  friend_accept: "social",
  message: "messages",
  reminder: "academic",
  material_approved: "materials",
  photo_approved: "photos",
  event_new: "events",
  deadline: "academic",
  group_join: "social",
};

export async function createNotification({ userId, actorId, type, entityId, postId }) {
  if (!userId || !TYPES.has(type)) return;
  if (actorId && userId === actorId) return;

  const category = TYPE_CATEGORY[type] || "social";

  const enabled = await isCategoryEnabled(userId, category);
  if (!enabled) return;

  await db.insert(notifications).values({
    userId,
    actorId: actorId || null,
    type,
    category,
    entityId: entityId || null,
    postId: postId || null,
  });
}

export async function createSystemNotification({ userId, type, entityId }) {
  if (!userId || !TYPES.has(type)) return;

  const category = TYPE_CATEGORY[type] || "social";

  const enabled = await isCategoryEnabled(userId, category);
  if (!enabled) return;

  await db.insert(notifications).values({
    userId,
    actorId: null,
    type,
    category,
    entityId: entityId || null,
  });
}

async function isCategoryEnabled(userId, category) {
  const [pref] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (!pref) return true;

  return pref[category] !== false;
}

export async function getNotificationPreferences(userId) {
  const [pref] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (!pref) {
    const [created] = await db
      .insert(notificationPreferences)
      .values({ userId })
      .returning();
    return created;
  }

  return pref;
}
