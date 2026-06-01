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

<<<<<<< HEAD
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
=======
  const recommendedIds = new Set(recommended.map((c) => c.id));

  // Browse sections
  const facultyCommunities = others.filter(
    (c) =>
      (c.facultyTag && !recommendedIds.has(c.id)) ||
      ["Law", "Finance", "Marketing", "Management", "Informatics"].some((f) =>
        c.name.includes(f)
      )
  );

  const yearCommunities = others.filter(
    (c) =>
      c.yearTag ||
      ["1st Year", "2nd Year", "3rd Year", "4th Year"].some((y) =>
        c.name.includes(y)
      )
  );

  const clubs = others.filter((c) =>
    c.name.toLowerCase().includes("club")
  );
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6

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
<<<<<<< HEAD
          Groups
=======
          Communities
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
        </h1>
        <p
          style={{
            margin: "0 0 16px 0",
            color: "var(--text-secondary)",
            fontSize: 15,
          }}
        >
<<<<<<< HEAD
          Find and join faculty groups, year groups, clubs, and other student communities.
=======
          Find your faculty, year, clubs, study groups and student discussions.
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
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
<<<<<<< HEAD
              placeholder="Search groups, faculty, clubs..."
=======
              placeholder="Search communities, faculty, topics..."
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
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
<<<<<<< HEAD
          {tab && <input type="hidden" name="tab" value={tab} />}
=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          <Link
            href="/communities/create"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <UiIcon name="plus" size={18} />
<<<<<<< HEAD
            Create Group
=======
            Create
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
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

<<<<<<< HEAD
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

=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
      {/* Search results override */}
      {query ? (
        <SectionGrid
          title={`Search: "${query}"`}
<<<<<<< HEAD
          emptyText="No groups matched your search."
=======
          emptyText="No communities matched your search."
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
          communities={allCommunities}
          joinStateFor={joinStateFor}
        />
      ) : (
        <>
<<<<<<< HEAD
          {/* Discover recommendations block */}
          {tab === "discover" && recommended.length > 0 && (
=======
          {/* My Communities */}
          {myCommunities.length > 0 && (
            <SectionGrid
              title="My Communities"
              count={myCommunities.length}
              communities={myCommunities}
              joinStateFor={joinStateFor}
            />
          )}

          {/* Recommendations */}
          {recommended.length > 0 && (
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
            <SectionGrid
              title="Recommended for you"
              subtitle="Based on your faculty, year and interests"
              communities={recommended}
              joinStateFor={joinStateFor}
            />
          )}

<<<<<<< HEAD
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
=======
          {/* Faculty Communities */}
          {facultyCommunities.length > 0 && (
            <CategorySection
              title="Faculty Communities"
              icon="book"
              communities={facultyCommunities.slice(0, 6)}
              joinStateFor={joinStateFor}
            />
          )}

          {/* Year Communities */}
          {yearCommunities.length > 0 && (
            <CategorySection
              title="Year Communities"
              icon="users"
              communities={yearCommunities.slice(0, 6)}
              joinStateFor={joinStateFor}
            />
          )}

          {/* Clubs */}
          {clubs.length > 0 && (
            <CategorySection
              title="Clubs"
              icon="group"
              communities={clubs.slice(0, 6)}
              joinStateFor={joinStateFor}
            />
          )}

          {/* Empty state */}
          {allCommunities.length === 0 && (
            <div className="card uf-empty-state">
              <div className="uf-empty-icon">
                <UiIcon name="group" size={32} />
              </div>
              <h3 className="uf-empty-title">No communities yet</h3>
              <p className="uf-empty-description">
                Be the first to create a community for UFAR students.
              </p>
              <Link href="/communities/create" className="btn btn-primary">
                Create Community
              </Link>
            </div>
          )}
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
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
<<<<<<< HEAD
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h2 className="uf-card-section-title" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
=======
    <section>
      <div style={{ marginBottom: 12 }}>
        <h2 className="uf-card-section-title">
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
          {title}
          {typeof count === "number" ? (
            <span className="uf-community-pill">{count}</span>
          ) : null}
        </h2>
        {subtitle ? (
          <p
            style={{
<<<<<<< HEAD
              margin: "4px 0 0 0",
=======
              margin: 0,
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
              color: "var(--text-secondary)",
              fontSize: 14,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {communities.length === 0 ? (
<<<<<<< HEAD
        <div className="card uf-empty-state" style={{ padding: "40px 20px", textAlign: "center" }}>
          <p className="uf-empty-description" style={{ color: "var(--text-secondary)", margin: 0 }}>
=======
        <div className="card uf-empty-state">
          <p className="uf-empty-description">
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
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
<<<<<<< HEAD
=======

function CategorySection({ title, icon, communities, joinStateFor }) {
  return (
    <section>
      <div
        style={{
          padding: "14px 18px",
          background:
            "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
          borderRadius: "16px 16px 0 0",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <UiIcon name={icon} size={18} className="" />
        <h3
          style={{
            margin: 0,
            color: "var(--bg-card)",
            fontSize: 16,
            fontWeight: 900,
          }}
        >
          {title}
        </h3>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
          padding: 20,
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderTop: "none",
          borderRadius: "0 0 16px 16px",
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
    </section>
  );
}
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
