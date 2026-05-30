"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { blockedUsers } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { and, eq, or } from "drizzle-orm";
import {
  safeParseFormData,
  blockUserFormSchema,
  unblockUserFormSchema,
} from "@/shared/validations/validations";

/**
 * Block a user
 */
export async function blockUser(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const parsed = safeParseFormData(blockUserFormSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { blockedId, reason } = parsed.data;

  if (blockedId === userId) {
    return { error: "You cannot block yourself" };
  }

  try {
    // Check if already blocked
    const [existing] = await db
      .select()
      .from(blockedUsers)
      .where(
        and(
          eq(blockedUsers.blockerId, userId),
          eq(blockedUsers.blockedId, blockedId)
        )
      )
      .limit(1);

    if (existing) {
      return { error: "User is already blocked" };
    }

    // Block the user
    await db.insert(blockedUsers).values({
      blockerId: userId,
      blockedId,
      reason: reason || null,
    });

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/search");

    return { success: true };
  } catch (error) {
    console.error("Error blocking user:", error);
    return { error: "Failed to block user" };
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const parsed = safeParseFormData(unblockUserFormSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { blockedId } = parsed.data;

  try {
    await db
      .delete(blockedUsers)
      .where(
        and(
          eq(blockedUsers.blockerId, userId),
          eq(blockedUsers.blockedId, blockedId)
        )
      );

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/search");

    return { success: true };
  } catch (error) {
    console.error("Error unblocking user:", error);
    return { error: "Failed to unblock user" };
  }
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(userId: string) {
  try {
    const blocked = await db
      .select({
        id: blockedUsers.id,
        blockedId: blockedUsers.blockedId,
        reason: blockedUsers.reason,
        createdAt: blockedUsers.createdAt,
      })
      .from(blockedUsers)
      .where(eq(blockedUsers.blockerId, userId));

    return blocked;
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    return [];
  }
}

/**
 * Check if user is blocked
 */
export async function isUserBlocked(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  try {
    const [result] = await db
      .select()
      .from(blockedUsers)
      .where(
        or(
          and(
            eq(blockedUsers.blockerId, blockerId),
            eq(blockedUsers.blockedId, blockedId)
          ),
          and(
            eq(blockedUsers.blockerId, blockedId),
            eq(blockedUsers.blockedId, blockerId)
          )
        )
      )
      .limit(1);

    return !!result;
  } catch (error) {
    console.error("Error checking if user is blocked:", error);
    return false;
  }
}
