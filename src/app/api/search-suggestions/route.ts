import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, posts, communities, blockedUsers } from "@/lib/schema";
import { ilike, or, sql, and, notInArray } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";

  if (query.trim().length < 2) {
    return NextResponse.json([]);
  }

  const pattern = `%${query}%`;

  // Get blocked user IDs if logged in
  const blockedUserIds = new Set<string>();
  if (session?.userId) {
    const blockedRows = await db
      .select({
        blockedId: blockedUsers.blockedId,
        blockerId: blockedUsers.blockerId,
      })
      .from(blockedUsers)
      .where(
        or(
          sql`${blockedUsers.blockerId} = ${session.userId}`,
          sql`${blockedUsers.blockedId} = ${session.userId}`
        )
      );

    for (const row of blockedRows) {
      if (row.blockerId === session.userId) {
        blockedUserIds.add(row.blockedId);
      } else {
        blockedUserIds.add(row.blockerId);
      }
    }
  }

  try {
    const [userResults, postResults, communityResults] = await Promise.all([
      // Search users
      db
        .select({
          id: users.id,
          name: users.fullName,
          faculty: users.faculty,
          image: users.image,
        })
        .from(users)
        .where(
          blockedUserIds.size > 0
            ? and(
                or(
                  ilike(users.fullName, pattern),
                  ilike(users.email, pattern),
                  ilike(users.faculty, pattern)
                ),
                notInArray(users.id, Array.from(blockedUserIds))
              )
            : or(
                ilike(users.fullName, pattern),
                ilike(users.email, pattern),
                ilike(users.faculty, pattern)
              )
        )
        .limit(5),

      // Search posts
      db
        .select({
          id: posts.id,
          content: posts.content,
        })
        .from(posts)
        .where(ilike(posts.content, pattern))
        .limit(5),

      // Search communities
      db
        .select({
          id: communities.id,
          name: communities.name,
          description: communities.description,
          avatar: communities.avatar,
        })
        .from(communities)
        .where(
          or(
            ilike(communities.name, pattern),
            ilike(communities.description, pattern)
          )
        )
        .limit(5),
    ]);

    const suggestions = [
      ...userResults.map((user) => ({ ...user, type: "user" })),
      ...postResults.map((post) => ({ ...post, type: "post" })),
      ...communityResults.map((community) => ({ ...community, type: "community" })),
    ];

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    return NextResponse.json([]);
  }
}
