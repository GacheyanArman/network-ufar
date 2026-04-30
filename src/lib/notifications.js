import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";

const TYPES = new Set(["like", "comment", "friend_request"]);

export async function createNotification({ userId, actorId, type, entityId, postId }) {
  if (!userId || !actorId || userId === actorId || !TYPES.has(type)) {
    return;
  }

  await db.insert(notifications).values({
    userId,
    actorId,
    type,
    entityId: entityId || null,
    postId: postId || null,
  });
}
