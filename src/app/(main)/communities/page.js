import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, or, sql, and, inArray, ilike } from "drizzle-orm";
import { db } from "@/shared/db/db";
import {
  communities,
  communityMembers,
  communityJoinRequests,
  users,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { scoreCommunity } from "@/features/communities/server/queries";
import CommunityCard from "@/features/communities/components/CommunityCard";
import UiIcon from "@/shared/ui/UiIcon";

export default async function CommunitiesPage({ searchParams }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const search = (await searchParams) || {};
  const rawQuery = (Array.isArray(search.q) ? search.q[0] : search.q) || "";
  const query = rawQuery.trim();

  const [currentUser] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      faculty: users.faculty,
      bio: users.bio,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  // All visible communities (public + my memberships)
  const memberships = await db
    .select({
      communityId: communityMembers.communityId,
      role: communityMembers.role,
    })
    .from(communityMembers)
    .where(eq(communityMembers.userId, session.userId));

  const joinedIds = new Set(memberships.map((m) => m.communityId));

  // Fetch all the user's join requests and filter in JS to avoid
  // driver-level edge cases with binding enum values.
  let pendingIds = new Set();
  try {
    const pendingRows = await db
      .select({
        communityId: communityJoinRequests.communityId,
        status: communityJoinRequests.status,
      })
      .from(communityJoinRequests)
      .where(eq(communityJoinRequests.userId, session.userId));
    pendingIds = new Set(
      pendingRows
        .filter((r) => r.status === "pending")
        .map((r) => r.communityId)
    );
  } catch (err) {
    console.error(
      "[communities] failed to load join requests:",
      err?.cause || err?.message || err
    );
  }

  // Base where clause: public OR joined
  const joinedArr = Array.from(joinedIds);

  const baseWhereClauses = joinedArr.length
    ? and(or(eq(communities.isPrivate, false), inArray(communities.id, joinedArr)), eq(communities.status, "approved"))
    : and(eq(communities.isPrivate, false), eq(communities.status, "approved"));

  const searchPattern = query ? `%${query}%` : null;
  const whereClause = searchPattern
    ? and(
        baseWhereClauses,
        or(
          ilike(communities.name, searchPattern),
          ilike(communities.description, searchPattern),
          ilike(communities.facultyTag, searchPattern),
          ilike(communities.interests, searchPattern)
        )
      )
    : baseWhereClauses;

  const allCommunities = await db
    .select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      avatar: communities.avatar,
      creatorId: communities.creatorId,
      isPrivate: communities.isPrivate,
      facultyTag: communities.facultyTag,
      yearTag: communities.yearTag,
      interests: communities.interests,
      createdAt: communities.createdAt,
      memberCount: sql`count(${communityMembers.id})::int`,
    })
    .from(communities)
    .leftJoin(communityMembers, eq(communities.id, communityMembers.communityId))
    .where(whereClause)
    .groupBy(communities.id)
    .orderBy(desc(communities.createdAt));

  function joinStateFor(community) {
    if (community.creatorId === session.userId) return "owner";
    if (joinedIds.has(community.id)) return "member";
    if (pendingIds.has(community.id)) return "pending";
    return "guest";
  }

  const myCommunities = allCommunities.filter((c) => joinedIds.has(c.id));
  const others = allCommunities.filter((c) => !joinedIds.has(c.id));

  // Scored recommendations
  const recommended = others
    .map((c) => ({ community: c, score: scoreCommunity(c, currentUser) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.community);

  function getGroupType(c) {
    const firstInterest = (c.interests || "").split(",")[0]?.trim();
    if (["faculty_group", "year_group", "club", "student_council", "interest_group"].includes(firstInterest)) {
      return firstInterest;
    }
    if (c.facultyTag) return "faculty_group";
    if (c.yearTag) return "year_group";
    if (c.name.toLowerCase().includes("club")) return "club";
    if (c.name.toLowerCase().includes("council")) return "student_council";
    return "interest_group";
  }

  const facultyCommunities = allCommunities.filter(c => getGroupType(c) === "faculty_group");
  const clubs = allCommunities.filter(c => {
    const type = getGroupType(c);
    return type === "club" || type === "student_council";
  });

  const tab = search.tab || (myCommunities.length > 0 ? "my" : "discover");

  let displayedCommunities = [];
  let emptyTitle = "No groups yet";
  let emptyDesc = "Be the first to create a group for UFAR students.";
  if (tab === "my") {
    displayedCommunities = myCommunities;
    emptyTitle = "No joined groups";
    emptyDesc = "You haven't joined any groups yet. Explore 'Discover' to find faculty groups, clubs, and interest groups!";
  } else if (tab === "discover") {
    displayedCommunities = others;
    emptyTitle = "No groups to discover";
    emptyDesc = "All groups have been joined, or none exist yet.";
  } else if (tab === "faculty") {
    displayedCommunities = facultyCommunities;
    emptyTitle = "No faculty groups";
    emptyDesc = "No faculty-specific groups have been created yet.";
  } else if (tab === "clubs") {
    displayedCommunities = clubs;
    emptyTitle = "No clubs or councils";
    emptyDesc = "No student clubs or council groups have been created yet.";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div className="card" style={{ padding: 24 }}>
        <h1
          style={{
            margin: "0 0 6px 0",
            fontSize: 26,
            fontWeight: 950,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          Groups
        </h1>
        <p
          style={{
            margin: "0 0 16px 0",
            color: "var(--text-secondary)",
            fontSize: 15,
          }}
        >
          Find and join faculty groups, year groups, clubs, and other student communities.
        </p>

        <form
          method="get"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 280, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            >
              <UiIcon name="search" size={18} />
            </span>
            <input
              type="search"
              name="q"
              defaultValue={rawQuery}
              placeholder="Search groups, faculty, clubs..."
              style={{
                width: "100%",
                height: 44,
                padding: "0 16px 0 42px",
                border: "1px solid var(--border-color)",
                borderRadius: 12,
                fontSize: 15,
                background: "var(--bg-card)",
              }}
            />
          </div>
          {tab && <input type="hidden" name="tab" value={tab} />}
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          <Link
            href="/communities/create"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <UiIcon name="plus" size={18} />
            Create Group
          </Link>
          <Link
            href="/study-groups"
            className="btn btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", textDecoration: "none" }}
          >
            <UiIcon name="users" size={18} />
            Study Groups
          </Link>
        </form>
      </div>

      {/* Tabs */}
      {!query && (
        <div
          style={{
            display: "flex",
            gap: 10,
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: 14,
            marginBottom: 4,
            overflowX: "auto",
          }}
        >
          {[
            { id: "my", label: "My Groups" },
            { id: "discover", label: "Discover" },
            { id: "faculty", label: "Faculty Groups" },
            { id: "clubs", label: "Clubs & Councils" },
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <Link
                key={t.id}
                href={`/communities?tab=${t.id}`}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  background: isActive ? "var(--french-blue, #2563eb)" : "var(--bg-soft, #f8fafc)",
                  color: isActive ? "#ffffff" : "var(--text-secondary, #475569)",
                  border: `1px solid ${isActive ? "var(--french-blue, #2563eb)" : "var(--border-color, #e2e8f0)"}`,
                  transition: "all 0.2s",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Search results override */}
      {query ? (
        <SectionGrid
          title={`Search: "${query}"`}
          emptyText="No groups matched your search."
          communities={allCommunities}
          joinStateFor={joinStateFor}
        />
      ) : (
        <>
          {/* Discover recommendations block */}
          {tab === "discover" && recommended.length > 0 && (
            <SectionGrid
              title="Recommended for you"
              subtitle="Based on your faculty, year and interests"
              communities={recommended}
              joinStateFor={joinStateFor}
            />
          )}

          {/* Tab contents list */}
          <SectionGrid
            title={
              tab === "my"
                ? "My Groups"
                : tab === "discover"
                  ? "All Groups"
                  : tab === "faculty"
                    ? "Faculty Groups"
                    : "Clubs & Councils"
            }
            count={displayedCommunities.length}
            emptyText={emptyDesc}
            communities={displayedCommunities}
            joinStateFor={joinStateFor}
          />
        </>
      )}
    </div>
  );
}

function SectionGrid({
  title,
  subtitle,
  count,
  emptyText,
  communities,
  joinStateFor,
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h2 className="uf-card-section-title" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          {title}
          {typeof count === "number" ? (
            <span className="uf-community-pill">{count}</span>
          ) : null}
        </h2>
        {subtitle ? (
          <p
            style={{
              margin: "4px 0 0 0",
              color: "var(--text-secondary)",
              fontSize: 14,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {communities.length === 0 ? (
        <div className="card uf-empty-state" style={{ padding: "40px 20px", textAlign: "center" }}>
          <p className="uf-empty-description" style={{ color: "var(--text-secondary)", margin: 0 }}>
            {emptyText || "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {communities.map((c) => (
            <CommunityCard
              key={c.id}
              community={c}
              joinState={joinStateFor(c)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
