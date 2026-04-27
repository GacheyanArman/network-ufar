import { ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { communities, posts, studyMaterials, users } from "@/lib/schema";

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = params?.q?.trim() || "";

  const pattern = `%${q}%`;

  const foundUsers = q
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          faculty: users.faculty,
        })
        .from(users)
        .where(ilike(users.fullName, pattern))
    : [];

  const foundPosts = q
    ? await db
        .select({
          id: posts.id,
          content: posts.content,
        })
        .from(posts)
        .where(ilike(posts.content, pattern))
    : [];

  const foundCommunities = q
    ? await db
        .select({
          id: communities.id,
          name: communities.name,
          description: communities.description,
        })
        .from(communities)
        .where(ilike(communities.name, pattern))
    : [];

  const foundMaterials = q
    ? await db
        .select({
          id: studyMaterials.id,
          title: studyMaterials.title,
          description: studyMaterials.description,
        })
        .from(studyMaterials)
        .where(ilike(studyMaterials.title, pattern))
    : [];

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
        <input name="q" defaultValue={q} placeholder="Search real content..." />
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
          <div className="old-feed-title">
            <h2>Users</h2>
            <span>{foundUsers.length}</span>
          </div>

          <div className="old-list">
            {foundUsers.map((user) => (
              <div className="old-list-item" key={user.id}>
                <div className="old-avatar">{user.fullName[0]}</div>
                <div>
                  <strong>{user.fullName}</strong>
                  <span>{user.faculty || user.email}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {foundPosts.length > 0 && (
        <>
          <div className="old-feed-title">
            <h2>Posts</h2>
            <span>{foundPosts.length}</span>
          </div>

          <div className="old-list">
            {foundPosts.map((post) => (
              <div className="old-list-item" key={post.id}>
                <div className="old-avatar">▣</div>
                <div>
                  <strong>Post</strong>
                  <span>{post.content}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {foundCommunities.length > 0 && (
        <>
          <div className="old-feed-title">
            <h2>Communities</h2>
            <span>{foundCommunities.length}</span>
          </div>

          <div className="old-list">
            {foundCommunities.map((community) => (
              <div className="old-list-item" key={community.id}>
                <div className="old-avatar">{community.name[0]}</div>
                <div>
                  <strong>{community.name}</strong>
                  <span>{community.description || "Community"}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {foundMaterials.length > 0 && (
        <>
          <div className="old-feed-title">
            <h2>Materials</h2>
            <span>{foundMaterials.length}</span>
          </div>

          <div className="old-list">
            {foundMaterials.map((material) => (
              <div className="old-list-item" key={material.id}>
                <div className="old-avatar">◎</div>
                <div>
                  <strong>{material.title}</strong>
                  <span>{material.description || "Study material"}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}