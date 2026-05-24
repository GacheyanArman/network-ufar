import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { cache } from "react";

export const getSession = cache(async function _getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload?.userId) {
      const { db } = await import("@/shared/db/db");
      const { users } = await import("@/shared/db/schema");
      const [row] = await db
        .select({ isBanned: users.isBanned, banExpiresAt: users.banExpiresAt })
        .from(users)
        .where(eq(users.id, payload.userId as string))
        .limit(1);

      if (row?.isBanned) {
        if (row.banExpiresAt && new Date(row.banExpiresAt) < new Date()) {
          const { sql } = await import("drizzle-orm");
          await db.update(users).set({ isBanned: false, bannedAt: null, banReason: null, banExpiresAt: null }).where(eq(users.id, payload.userId as string));
        } else {
          return null;
        }
      }
    }

    return payload;
  } catch (e) {
    console.error("JWT verification failed:", e);
    return null;
  }
});