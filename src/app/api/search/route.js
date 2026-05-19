import { NextResponse } from "next/server";
import { db } from "@/shared/db/db";
import {
  users,
  communities,
  posts,
  events,
  studyMaterials,
  libraryResources,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { ilike, or, sql, and, ne, eq, desc, notInArray } from "drizzle-orm";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ results: [] });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const pattern = `%${query}%`;

    const blockedRows = await db
      .select({
        blockedId: sql`CASE WHEN ${sql`blocker_id`} = ${session.userId} THEN ${sql`blocked_id`} ELSE ${sql`blocker_id`} END`.as("bid"),
      })
      .from(sql`blocked_users`)
      .where(
        or(
          sql`blocker_id = ${session.userId}`,
          sql`blocked_id = ${session.userId}`
        )
      );
    const blockedIds = blockedRows.map((r) => r.bid).filter(Boolean);

    const [userRows, communityRows, eventRows, materialRows, libraryRows, postRows] =
      await Promise.all([
      db
        .select({
          id: users.id,
          name: users.fullName,
          username: users.username,
          faculty: users.faculty,
          image: users.image,
          type: sql`'user'`.as("type"),
          rank: sql`
              CASE
                WHEN LOWER(${users.fullName}) = LOWER(${query}) THEN 1
                WHEN LOWER(${users.fullName}) LIKE LOWER(${query} || '%') THEN 2
                WHEN LOWER(${users.username}) = LOWER(${query}) THEN 3
                ELSE 5
              END
            `.as("rank"),
        })
        .from(users)
        .where(
          and(
            ne(users.id, session.userId),
            blockedIds.length > 0
              ? notInArray(users.id, blockedIds)
              : undefined,
            or(
              ilike(users.fullName, pattern),
              ilike(users.username, pattern),
              ilike(users.faculty, pattern),
            ),
          ),
        )
        .orderBy(sql`rank ASC, ${users.fullName} ASC`)
        .limit(4),

      db
        .select({
          id: communities.id,
          name: communities.name,
          description: communities.description,
          image: communities.avatar,
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
            ilike(communities.name, pattern),
            ilike(communities.description, pattern),
          ),
        )
        .orderBy(sql`rank ASC`)
        .limit(3),

      db
        .select({
          id: events.id,
          name: events.title,
          subtitle: events.location,
          type: sql`'event'`.as("type"),
        })
        .from(events)
        .where(
          or(ilike(events.title, pattern), ilike(events.location, pattern)),
        )
        .orderBy(desc(events.startTime))
        .limit(3),

      db
        .select({
          id: studyMaterials.id,
          name: studyMaterials.title,
          subtitle: studyMaterials.subject,
          type: sql`'material'`.as("type"),
        })
        .from(studyMaterials)
        .where(
          and(
            eq(studyMaterials.status, "approved"),
            or(
              ilike(studyMaterials.title, pattern),
              ilike(studyMaterials.subject, pattern),
            ),
          ),
        )
        .orderBy(desc(studyMaterials.downloadsCount))
        .limit(3),

      db
        .select({
          id: libraryResources.id,
          name: libraryResources.title,
          subtitle: libraryResources.author,
          type: sql`'library'`.as("type"),
        })
        .from(libraryResources)
        .where(
          or(
            ilike(libraryResources.title, pattern),
            ilike(libraryResources.author, pattern),
          ),
        )
        .limit(3),

      db
        .select({
          id: posts.id,
          name: sql`LEFT(${posts.content}, 60)`.as("name"),
          subtitle: users.fullName,
          type: sql`'post'`.as("type"),
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(
          and(
            ilike(posts.content, pattern),
            blockedIds.length > 0
              ? notInArray(posts.authorId, blockedIds)
              : undefined,
          ),
        )
        .orderBy(desc(posts.createdAt))
        .limit(2),

      db
        .select({
          id: academicCalendar.id,
          name: academicCalendar.title,
          subtitle: academicCalendar.course,
          type: sql`'calendar'`.as("type"),
        })
        .from(academicCalendar)
        .where(
          and(
            eq(academicCalendar.isPublic, true),
            or(
              ilike(academicCalendar.title, pattern),
              ilike(academicCalendar.description, pattern),
              ilike(academicCalendar.course, pattern),
            ),
          ),
        )
        .orderBy(academicCalendar.dueDate)
        .limit(3),

      db
        .select({
          id: photos.id,
          name: sql`COALESCE(${photos.caption}, 'Campus moment')`.as("name"),
          subtitle: users.fullName,
          image: photos.thumbnailUrl,
          fallbackImage: photos.imageUrl,
          type: sql`'photo'`.as("type"),
        })
        .from(photos)
        .innerJoin(users, eq(photos.ownerId, users.id))
        .where(
          and(
            eq(photos.isPrivate, false),
            or(ilike(photos.caption, pattern), ilike(photos.location, pattern)),
          ),
        )
        .orderBy(desc(photos.createdAt))
        .limit(3),

      db
        .select({
          id: photoAlbums.id,
          name: photoAlbums.title,
          subtitle: photoAlbums.description,
          image: photoAlbums.coverPhotoUrl,
          type: sql`'album'`.as("type"),
        })
        .from(photoAlbums)
        .where(
          and(
            eq(photoAlbums.isPrivate, false),
            or(
              ilike(libraryResources.title, pattern),
              ilike(libraryResources.author, pattern)
            )
          )
          .limit(3),

        db
          .select({
            id: posts.id,
            name: sql`LEFT(${posts.content}, 60)`.as("name"),
            type: sql`'post'`.as("type"),
          })
          .from(posts)
          .where(ilike(posts.content, pattern))
          .orderBy(desc(posts.createdAt))
          .limit(2),
      ]);

    const allResults = [
      ...userRows.map((u) => ({ ...u, href: `/profile/${u.id}` })),
      ...communityRows.map((c) => ({ ...c, href: `/communities/${c.id}` })),
      ...eventRows.map((e) => ({ ...e, href: `/events/${e.id}` })),
      ...materialRows.map((m) => ({
        ...m,
        href: `/study-materials?id=${m.id}`,
      })),
      ...libraryRows.map((l) => ({ ...l, href: `/library?id=${l.id}` })),
      ...postRows.map((p) => ({ ...p, href: `/?highlight=${p.id}` })),
    ]
      .sort((a, b) => (a.rank || 9) - (b.rank || 9))
      .slice(0, 10);

    return NextResponse.json({ results: allResults });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
