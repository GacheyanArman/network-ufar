"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { userFollows, users } from "@/lib/schema";
import { getSession } from "@/lib/session";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

function getTargetId(formData) {
  return formData.get("targetId")?.toString().trim();
}

export async function followUser(formData) {
  const userId = await requireUserId();
  const targetId = getTargetId(formData);

  if (!targetId || targetId === userId) {
    throw new Error("Invalid user");
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

  revalidatePath("/");
  revalidatePath("/friends");
  revalidatePath("/search");
  revalidatePath("/profile");

  return { ok: true, status: "following" };
}

export async function unfollowUser(formData) {
  const userId = await requireUserId();
  const targetId = getTargetId(formData);

  if (!targetId || targetId === userId) {
    throw new Error("Invalid user");
  }

  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerId, userId),
        eq(userFollows.followingId, targetId)
      )
    );

  revalidatePath("/");
  revalidatePath("/friends");
  revalidatePath("/search");
  revalidatePath("/profile");

  return { ok: true, status: "unfollowed" };
}