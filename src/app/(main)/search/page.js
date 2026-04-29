import Link from "next/link";
import { ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { communities, posts, studyMaterials, users } from "@/lib/schema";

import { followUser, unfollowUser } from "@/app/actions/follow";
import { getFollowingIdSet } from "@/lib/social";

  const followingIds = session?.userId
    ? await getFollowingIdSet(session.userId)
    : new Set();

function safeQuery(value) {
  return String(value || "").trim().slice(0, 80);
}

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = safeQuery(params?.q);
  const pattern = `%${q}%`;

  const userSearchCondition = q
    ? or(
        sql`to_tsvector('simple', coalesce(${users.fullName}, '') || ' ' || coalesce(${users.email}, '') || ' ' || coalesce(${users.faculty}, '')) @@ plainto_tsquery('simple', ${q})`,
        ilike(users.fullName, pattern),
        ilike(users.email, pattern),
        ilike(users.faculty, pattern)
      )
    : undefined;

  const postSearchCondition = q
    ? or(
        sql`to_tsvector('simple', coalesce(${posts.content}, '')) @@ plainto_tsquery('simple', ${q})`,
        ilike(posts.content, pattern)
      )
    : undefined;

  const communitySearchCondition = q
    ? or(
        sql`to_tsvector('simple', coalesce(${communities.name}, '') || ' ' || coalesce(${communities.description}, '')) @@ plainto_tsquery('simple', ${q})`,
        ilike(communities.name, pattern),
        ilike(communities.description, pattern)
      )
    : undefined;

  const materialSearchCondition = q
    ? or(
        sql`to_tsvector('simple', coalesce(${studyMaterials.title}, '') || ' ' || coalesce(${studyMaterials.description}, '')) @@ plainto_tsquery('simple', ${q})`,
        ilike(studyMaterials.title, pattern),
        ilike(studyMaterials.description, pattern)
      )
    : undefined;

  const [foundUsers, foundPosts, foundCommunities, foundMaterials] = q
    ? await Promise.all([
        db
          .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            faculty: users.faculty,
            image: users.image,
          })
          .from(users)
          .where(userSearchCondition)
          .limit(20),
        db
          .select({
            id: posts.id,
            content: posts.content,
            createdAt: posts.createdAt,
          })
          .from(posts)
          .where(postSearchCondition)
          .limit(20),
        db
          .select({
            id: communities.id,
            name: communities.name,
            description: communities.description,
            avatar: communities.avatar,
          })
          .from(communities)
          .where(communitySearchCondition)
          .limit(20),
        db
          .select({
            id: studyMaterials.id,
            title: studyMaterials.title,
            description: studyMaterials.description,
            fileUrl: studyMaterials.fileUrl,
          })
          .from(studyMaterials)
          .where(materialSearchCondition)
          .limit(20),
      ])
    : [[], [], [], []];

  const isEmpty =
    q &&
    foundUsers.length === 0 &&
    foundPosts.length === 0 &&
    foundCommunities.length === 0 &&
    foundMaterials.length === 0;

  return (
    <section className="card old-page">
      <h1>Search</h1>

      <form className="search-page-form">
        <input name="q" defaultValue={q} placeholder="Search users, posts, groups, materials..." />
        <button className="btn-primary-old">Search</button>
      </form>

      {!q && (
        <div className="old-empty">
          Type something to search users, posts, communities and materials.
        </div>
      )}

      {isEmpty && <div className="old-empty">Nothing found.</div>}

      {foundUsers.length > 0 && (
        <>
          <div className="old-feed-title"><h2>Users</h2><span>{foundUsers.length}</span></div>
          <div className="old-list">
            {foundUsers.map((user) => (
                <div style={{ display: "flex", gap: "6px" }}>
                  {followingIds.has(user.id) ? (
                    <form action={unfollowUser}>
                      <input type="hidden" name="targetId" value={user.id} />
                      <button className="btn btn-secondary">Following</button>
                    </form>
                  ) : (
                    <form action={followUser}>
                      <input type="hidden" name="targetId" value={user.id} />
                      <button className="btn btn-primary">Follow</button>
                    </form>
                  )}

                    <Link
                      href={`/profile/${user.id}`}
                      style={{ textDecoration: "none", color: "inherit", flex: 1 }}
                    >
                      <strong>{user.fullName}</strong>
                      <span>{user.faculty || user.email}</span>
                    </Link>

                    <Link href={`/profile/${user.id}`} className="btn btn-secondary">
                      Open
                    </Link>

                    <Link href={`/messages?user=${user.id}`} className="btn btn-secondary">
                      Message
                    </Link>
                </div>
            ))}
          </div>
        </>
      )}

      {foundPosts.length > 0 && (
        <>
          <div className="old-feed-title"><h2>Posts</h2><span>{foundPosts.length}</span></div>
          <div className="old-list">
            {foundPosts.map((post) => (
              <div className="old-list-item" key={post.id}>
                <div className="old-avatar">▣</div>
                <div><strong>Post</strong><span>{post.content}</span></div>
              </div>
            ))}
          </div>
        </>
      )}

      {foundCommunities.length > 0 && (
        <>
          <div className="old-feed-title"><h2>Communities</h2><span>{foundCommunities.length}</span></div>
          <div className="old-list">
            {foundCommunities.map((community) => (
              <div className="old-list-item" key={community.id}>
                <div className="old-avatar">{community.avatar ? <img src={community.avatar} alt={community.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : community.name[0]}</div>
                <div><strong>{community.name}</strong><span>{community.description || "Community"}</span></div>
                <Link href={`/communities?community=${community.id}`} className="btn btn-secondary">Open</Link>
              </div>
            ))}
          </div>
        </>
      )}

      {foundMaterials.length > 0 && (
        <>
          <div className="old-feed-title"><h2>Materials</h2><span>{foundMaterials.length}</span></div>
          <div className="old-list">
            {foundMaterials.map((material) => (
              <div className="old-list-item" key={material.id}>
                <div className="old-avatar">◎</div>
                <div><strong>{material.title}</strong><span>{material.description || "Study material"}</span></div>
                {material.fileUrl ? <a href={material.fileUrl} className="btn btn-secondary">Open</a> : null}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
