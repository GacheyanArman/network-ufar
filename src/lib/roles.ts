import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

export type UserRole = "user" | "moderator" | "admin";

export async function getUserRole(userId: string): Promise<UserRole> {
  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return (rows[0]?.role as UserRole) ?? "user";
}

export function isStaff(role: UserRole): boolean {
  return role === "admin" || role === "moderator";
}

/**
 * Returns true if user owns the resource OR is admin/moderator.
 */
export async function canModerate(
  userId: string,
  ownerId: string
): Promise<boolean> {
  if (userId === ownerId) return true;
  const role = await getUserRole(userId);
  return isStaff(role);
}
