"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { userFollows, users } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { parseFormDataWith, followFormSchema } from "@/shared/validations/validations";
import { invalidateSocialCache } from "@/shared/cache/cache";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function followUser(formData) {
  const userId = await requireUserId();
  const { targetId } = parseFormDataWith(followFormSchema, formData);

  if (targetId === userId) {
    throw new Error("Cannot follow yourself");
  }

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!target) {
    throw new Error("User not found");
  }

  await db
    .insert(userFollows)
    .values({
      followerId: userId,
      followingId: targetId,
    })
    .onConflictDoNothing({
      target: [userFollows.followerId, userFollows.followingId],
    });

  invalidateSocialCache(userId);
  invalidateSocialCache(targetId);

  revalidatePath("/");
  revalidatePath("/friends");
  revalidatePath("/search");
  revalidatePath("/profile");

  return { ok: true, status: "following" };
}

export async function unfollowUser(formData) {
  const userId = await requireUserId();
  const { targetId } = parseFormDataWith(followFormSchema, formData);

  if (targetId === userId) {
    throw new Error("Cannot unfollow yourself");
  }

  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerId, userId),
        eq(userFollows.followingId, targetId)
      )
    );

  invalidateSocialCache(userId);
  invalidateSocialCache(targetId);

  revalidatePath("/");
  revalidatePath("/friends");
  revalidatePath("/search");
  revalidatePath("/profile");

  return { ok: true, status: "unfollowed" };
}