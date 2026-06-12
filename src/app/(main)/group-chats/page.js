import { redirect } from "next/navigation";
import { db } from "@/shared/db/db";
import { groupChats, groupChatMembers } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { and, eq, isNull, or, ilike, sql } from "drizzle-orm";
import GroupChatsClient from "@/features/messages/components/GroupChatsClient";

export default async function GroupChatsPage({ searchParams }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const params = await searchParams;
  const faculty = params?.faculty?.toString() || "";
  const course = params?.course?.toString() || "";
  const q = params?.q?.toString().trim() || "";

  // Get all group chats with member count
  const allGroupChats = await db
    .select({
      id: groupChats.id,
      name: groupChats.name,
      description: groupChats.description,
      avatar: groupChats.avatar,
      faculty: groupChats.faculty,
      course: groupChats.course,
      creatorId: groupChats.creatorId,
      createdAt: groupChats.createdAt,
      memberCount: sql<number>`count(${groupChatMembers.id})::int`,
    })
    .from(groupChats)
    .leftJoin(groupChatMembers, eq(groupChats.id, groupChatMembers.groupChatId))
    .where(
      and(
        // Community-linked chats are joined via their group, not from here.
        isNull(groupChats.communityId),
        q
          ? or(
              ilike(groupChats.name, `%${q}%`),
              ilike(groupChats.description, `%${q}%`),
              ilike(groupChats.faculty, `%${q}%`),
              ilike(groupChats.course, `%${q}%`)
            )
          : faculty
          ? eq(groupChats.faculty, faculty)
          : course
          ? eq(groupChats.course, course)
          : undefined
      )
    )
    .groupBy(groupChats.id)
    .orderBy(groupChats.createdAt);

  // Get user's memberships
  const userMemberships = await db
    .select({ groupChatId: groupChatMembers.groupChatId })
    .from(groupChatMembers)
    .where(eq(groupChatMembers.userId, session.userId));

  const membershipSet = new Set(userMemberships.map((m) => m.groupChatId));

  return (
    <div className="card old-page">
      {/* Search and Filters */}
      <form style={{ marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 200px", gap: "12px" }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search groups..."
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              width: "100%",
            }}
          />
          <input
            type="text"
            name="faculty"
            defaultValue={faculty}
            placeholder="Filter by faculty"
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          />
          <input
            type="text"
            name="course"
            defaultValue={course}
            placeholder="Filter by course"
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          />
        </div>
      </form>

      <GroupChatsClient
        allGroupChats={allGroupChats}
        membershipSet={membershipSet}
        currentUserId={session.userId}
      />
    </div>
  );
}
