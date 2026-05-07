import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { communities, communityMembers, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, desc, sql } from "drizzle-orm";
import CommunityCard from "@/components/CommunityCard";
import UiIcon from "@/components/UiIcon";
import Link from "next/link";

export default async function CommunitiesPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const [currentUser] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      faculty: users.faculty,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  // Get all communities with member count
  const allCommunities = await db
    .select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      avatar: communities.avatar,
      creatorId: communities.creatorId,
      createdAt: communities.createdAt,
      memberCount: sql`count(${communityMembers.id})::int`,
    })
    .from(communities)
    .leftJoin(communityMembers, eq(communities.id, communityMembers.communityId))
    .groupBy(communities.id)
    .orderBy(desc(communities.createdAt));

  // Get user's memberships
  const memberships = await db
    .select({
      communityId: communityMembers.communityId,
      role: communityMembers.role,
    })
    .from(communityMembers)
    .where(eq(communityMembers.userId, session.userId));

  const joinedIds = new Set(memberships.map((m) => m.communityId));

  // My Communities
  const myCommunities = allCommunities.filter((c) => joinedIds.has(c.id));

  // Recommended (based on faculty)
  const recommended = allCommunities.filter(
    (c) =>
      !joinedIds.has(c.id) &&
      currentUser.faculty &&
      c.name.toLowerCase().includes(currentUser.faculty.toLowerCase())
  );

  // Categories
  const facultyCommunities = allCommunities.filter((c) =>
    ["Law", "Finance", "Marketing", "Management", "Informatics"].some((f) =>
      c.name.includes(f)
    )
  );

  const yearCommunities = allCommunities.filter((c) =>
    ["1st Year", "2nd Year", "3rd Year", "4th Year"].some((y) =>
      c.name.includes(y)
    )
  );

  const clubs = allCommunities.filter((c) =>
    c.name.toLowerCase().includes("club")
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div className="card" style={{ padding: "24px" }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "900", color: "var(--text-primary)" }}>
          Communities
        </h1>
        <p style={{ margin: "0 0 20px 0", color: "var(--text-secondary)", fontSize: "15px" }}>
          Find your faculty, year, clubs, study groups and student discussions
        </p>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "300px", position: "relative" }}>
            <input
              type="text"
              placeholder="Search communities, posts, clubs..."
              style={{
                width: "100%",
                height: "44px",
                padding: "0 16px",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                fontSize: "15px"
              }}
            />
          </div>
          <Link href="/communities/create" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <UiIcon name="plus" size={18} />
            Create Community
          </Link>
        </div>
      </div>

      {/* My Communities */}
      {myCommunities.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "var(--text-primary)" }}>
              My Communities
            </h2>
            <span style={{
              minWidth: "28px",
              height: "28px",
              padding: "0 8px",
              borderRadius: "999px",
              background: "var(--french-blue-soft)",
              color: "var(--french-blue)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: "900"
            }}>
              {myCommunities.length}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {myCommunities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                isJoined={true}
                currentUserId={session.userId}
                isCreator={community.creatorId === session.userId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommended */}
      {recommended.length > 0 && (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "900", color: "var(--text-primary)" }}>
              Recommended for You
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
              Based on your profile
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {recommended.slice(0, 6).map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                isJoined={false}
                currentUserId={session.userId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Browse Communities */}
      <div>
        <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "900", color: "var(--text-primary)" }}>
          Browse Communities
        </h2>

        {/* Faculty Communities */}
        {facultyCommunities.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
              borderRadius: "16px 16px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <UiIcon name="book" size={20} style={{ color: "#ffffff" }} />
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "900", color: "#ffffff" }}>
                Faculty Communities
              </h3>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "16px",
              padding: "20px",
              background: "#ffffff",
              border: "1px solid var(--border-color)",
              borderTop: "none",
              borderRadius: "0 0 16px 16px"
            }}>
              {facultyCommunities.slice(0, 4).map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  isJoined={joinedIds.has(community.id)}
                  currentUserId={session.userId}
                  isCreator={community.creatorId === session.userId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Year Communities */}
        {yearCommunities.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
              borderRadius: "16px 16px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <UiIcon name="users" size={20} style={{ color: "#ffffff" }} />
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "900", color: "#ffffff" }}>
                Year Communities
              </h3>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "16px",
              padding: "20px",
              background: "#ffffff",
              border: "1px solid var(--border-color)",
              borderTop: "none",
              borderRadius: "0 0 16px 16px"
            }}>
              {yearCommunities.slice(0, 4).map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  isJoined={joinedIds.has(community.id)}
                  currentUserId={session.userId}
                  isCreator={community.creatorId === session.userId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Clubs */}
        {clubs.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
              borderRadius: "16px 16px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <UiIcon name="group" size={20} style={{ color: "#ffffff" }} />
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "900", color: "#ffffff" }}>
                Clubs
              </h3>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "16px",
              padding: "20px",
              background: "#ffffff",
              border: "1px solid var(--border-color)",
              borderTop: "none",
              borderRadius: "0 0 16px 16px"
            }}>
              {clubs.slice(0, 4).map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  isJoined={joinedIds.has(community.id)}
                  currentUserId={session.userId}
                  isCreator={community.creatorId === session.userId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {allCommunities.length === 0 && (
          <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", margin: "0 auto 16px", borderRadius: "16px", background: "var(--bg-soft)", color: "var(--french-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UiIcon name="group" size={32} />
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "900", color: "var(--text-primary)" }}>
              No communities yet
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "var(--text-secondary)", fontSize: "15px" }}>
              Be the first to create a community for UFAR students
            </p>
            <Link href="/communities/create" className="btn btn-primary">
              Create Community
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
