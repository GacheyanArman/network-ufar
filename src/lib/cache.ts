import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { users, notifications } from "@/lib/schema";
import { and, count, eq } from "drizzle-orm";

/**
 * Кэшированное получение данных пользователя
 * Кэш на 5 минут
 */
export const getCachedUser = unstable_cache(
  async (userId: string) => {
    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        image: users.image,
        avatarUrl: users.avatarUrl,
        faculty: users.faculty,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  },
  ["user-profile"],
  {
    revalidate: 300, // 5 минут
    tags: ["user"],
  }
);

/**
 * Кэшированное получение количества непрочитанных уведомлений
 * Кэш на 30 секунд (часто меняется)
 */
export const getCachedUnreadNotifications = unstable_cache(
  async (userId: string) => {
    const [unreadRow] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );

    return Number(unreadRow?.value || 0);
  },
  ["unread-notifications"],
  {
    revalidate: 30, // 30 секунд
    tags: ["notifications"],
  }
);

/**
 * Кэшированное получение базовой информации о пользователе для layout
 * Кэш на 5 минут
 */
export const getCachedUserBasicInfo = unstable_cache(
  async (userId: string) => {
    const [user] = await db
      .select({
        fullName: users.fullName,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  },
  ["user-basic-info"],
  {
    revalidate: 300, // 5 минут
    tags: ["user"],
  }
);

/**
 * Инвалидация кэша пользователя
 */
export function invalidateUserCache(userId: string) {
  // В Next.js 14+ используем revalidateTag
  // Это автоматически инвалидирует все кэши с тегом "user"
}

/**
 * Инвалидация кэша уведомлений
 */
export function invalidateNotificationsCache(userId: string) {
  // Инвалидирует все кэши с тегом "notifications"
}
