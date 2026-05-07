import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, communities } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { ilike, or, sql, and, ne } from "drizzle-orm";

export async function GET(request) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Создаем паттерн для поиска (поддержка частичного совпадения)
    const searchPattern = `%${query}%`;

    // Параллельный поиск пользователей и сообществ
    const [usersResults, communitiesResults] = await Promise.all([
      // Поиск пользователей (исключая текущего пользователя)
      db
        .select({
          id: users.id,
          name: users.fullName,
          username: users.username,
          faculty: users.faculty,
          image: users.image,
          type: sql`'user'`.as("type"),
          // Ранжирование результатов: точное совпадение в начале имени = выше
          rank: sql`
            CASE
              WHEN LOWER(${users.fullName}) = LOWER(${query}) THEN 1
              WHEN LOWER(${users.fullName}) LIKE LOWER(${query} || '%') THEN 2
              WHEN LOWER(${users.username}) = LOWER(${query}) THEN 3
              WHEN LOWER(${users.username}) LIKE LOWER(${query} || '%') THEN 4
              ELSE 5
            END
          `.as("rank"),
        })
        .from(users)
        .where(
          and(
            ne(users.id, session.userId),
            or(
              ilike(users.fullName, searchPattern),
              ilike(users.username, searchPattern),
              ilike(users.email, searchPattern),
              ilike(users.faculty, searchPattern)
            )
          )
        )
        .orderBy(sql`rank ASC, ${users.fullName} ASC`)
        .limit(5),

      // Поиск сообществ
      db
        .select({
          id: communities.id,
          name: communities.name,
          description: communities.description,
          image: communities.imageUrl,
          type: sql`'community'`.as("type"),
          rank: sql`
            CASE
              WHEN LOWER(${communities.name}) = LOWER(${query}) THEN 1
              WHEN LOWER(${communities.name}) LIKE LOWER(${query} || '%') THEN 2
              ELSE 3
            END
          `.as("rank"),
        })
        .from(communities)
        .where(
          or(
            ilike(communities.name, searchPattern),
            ilike(communities.description, searchPattern)
          )
        )
        .orderBy(sql`rank ASC, ${communities.name} ASC`)
        .limit(5),
    ]);

    // Объединяем и сортируем результаты по релевантности
    const allResults = [
      ...usersResults.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        faculty: u.faculty,
        image: u.image,
        type: "user",
        rank: u.rank,
      })),
      ...communitiesResults.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        image: c.image,
        type: "community",
        rank: c.rank,
      })),
    ]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 8); // Максимум 8 результатов в dropdown

    return NextResponse.json({ results: allResults });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
