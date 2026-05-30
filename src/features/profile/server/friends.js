"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { friendships, users } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { createNotification } from "@/features/notifications/server/queries";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import {
  parseFormDataWith,
  targetIdFormSchema,
  friendshipIdFormSchema,
  friendIdFormSchema,
} from "@/shared/validations/validations";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

async function getExistingFriendship(userId, targetId) {
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.receiverId, targetId)),
        and(eq(friendships.requesterId, targetId), eq(friendships.receiverId, userId))
      )
    )
    .limit(1);

  return friendship || null;
}

export async function sendFriendRequest(formData) {
  const userId = await requireUserId();

  // Check rate limit
  const rateLimitResult = await checkRateLimitAsync(userId, "friendRequest");
  if (!rateLimitResult.allowed) {
    throw new Error(getRateLimitError(rateLimitResult.resetTime ?? Date.now()));
  }

  const { targetId } = parseFormDataWith(targetIdFormSchema, formData);

  if (targetId === userId) throw new Error("Cannot friend yourself");

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!target) throw new Error("User not found");

  const existing = await getExistingFriendship(userId, targetId);

  if (existing?.status === "accepted") return { ok: true, status: "accepted" };

  if (existing?.status === "pending" && existing.receiverId === userId) {
    await db
      .update(friendships)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(friendships.id, existing.id));

    revalidatePath("/friends");
    revalidatePath("/profile");
    return { ok: true, status: "accepted" };
  }

  if (existing?.status === "pending") {
    return { ok: true, status: "pending" };
  }

  const [created] = await db
    .insert(friendships)
    .values({
      requesterId: userId,
      receiverId: targetId,
      status: "pending",
    })
    .returning({ id: friendships.id });

  await createNotification({
    userId: targetId,
    actorId: userId,
    type: "friend_request",
    entityId: created.id,
  });

  revalidatePath("/friends");
  return { ok: true, status: "pending" };
}

export async function acceptRequest(formData) {
  const userId = await requireUserId();
  const { friendshipId } = parseFormDataWith(friendshipIdFormSchema, formData);

  const [request] = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.id, friendshipId),
        eq(friendships.receiverId, userId),
        eq(friendships.status, "pending")
      )
    )
    .limit(1);

  if (!request) throw new Error("Friend request not found");

  await db
    .update(friendships)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(friendships.id, friendshipId));

  await createNotification({
    userId: request.requesterId,
    actorId: userId,
    type: "friend_accept",
    entityId: friendshipId,
  });

  revalidatePath("/friends");
  revalidatePath("/profile");
  return { ok: true };
}

export async function rejectRequest(formData) {
  const userId = await requireUserId();
  const { friendshipId } = parseFormDataWith(friendshipIdFormSchema, formData);

  await db
    .delete(friendships)
    .where(
      and(
        eq(friendships.id, friendshipId),
        eq(friendships.receiverId, userId),
        eq(friendships.status, "pending")
      )
    );

  revalidatePath("/friends");
  return { ok: true };
}

export async function unfriend(formData) {
  const userId = await requireUserId();
  const { friendId } = parseFormDataWith(friendIdFormSchema, formData);

  if (friendId === userId) throw new Error("Cannot unfriend yourself");

  await db
    .delete(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.receiverId, friendId)),
          and(eq(friendships.requesterId, friendId), eq(friendships.receiverId, userId))
        )
      )
    );

  revalidatePath("/friends");
  revalidatePath("/profile");
  return { ok: true };
}
