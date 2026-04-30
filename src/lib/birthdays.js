import { db } from "@/lib/db";
import { users, friendships } from "@/lib/schema";
import { and, eq, or, isNotNull, sql, inArray } from "drizzle-orm";

/**
 * Get users who have birthdays today
 * @param {string} userId - Current user ID
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Users with birthdays today
 */
export async function getTodayBirthdays(userId, limit = 5) {
  const today = new Date();
  const month = today.getMonth() + 1; // JavaScript months are 0-indexed
  const day = today.getDate();

  // Get friends of the current user
  const friendIds = await db
    .select({
      friendId: sql`CASE
        WHEN ${friendships.requesterId} = ${userId} THEN ${friendships.receiverId}
        ELSE ${friendships.requesterId}
      END`.as("friendId"),
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.receiverId, userId)
        )
      )
    );

  if (friendIds.length === 0) {
    return [];
  }

  const friendIdList = friendIds.map((f) => f.friendId);

  // Get users whose birthday is today (matching month and day)
  const birthdayUsers = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      image: users.image,
      birthDate: users.birthDate,
    })
    .from(users)
    .where(
      and(
        inArray(users.id, friendIdList),
        isNotNull(users.birthDate),
        sql`EXTRACT(MONTH FROM ${users.birthDate}) = ${month}`,
        sql`EXTRACT(DAY FROM ${users.birthDate}) = ${day}`
      )
    )
    .limit(limit);

  return birthdayUsers;
}
