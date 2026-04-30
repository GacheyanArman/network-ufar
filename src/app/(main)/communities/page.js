import { desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  communities,
  communityMembers,
  comments,
  postLikes,
  posts,
  users,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import {
  createCommunity,
  createCommunityPost,
  joinCommunity,
  leaveCommunity,
} from "@/app/actions/community";
import PostCard from "@/components/PostCard";

export default async function CommunitiesPage({ searchParams }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const params = await searchParams;
  const activeCommunityId = params?.community?.toString() || "";

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

  const realCommunities = await db
    .select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      avatar: communities.avatar,
      creatorId: communities.creatorId,
      createdAt: communities.createdAt,
      ownerName: users.fullName,
    })
    .from(communities)
    .innerJoin(users, eq(communities.creatorId, users.id))
    .orderBy(desc(communities.createdAt));

  const memberships = await db
    .select({
      communityId: communityMembers.communityId,
      role: communityMembers.role,
    })
    .from(communityMembers)
    .where(eq(communityMembers.userId, session.userId));

  const joinedIds = new Set(memberships.map((item) => item.communityId));
  const selectedCommunity =
    realCommunities.find((item) => item.id === activeCommunityId) || null;

  const communityPosts = selectedCommunity
    ? await db
        .select({
          id: posts.id,
          content: posts.content,
          imageUrl: posts.imageUrl,
          createdAt: posts.createdAt,
          authorId: posts.authorId,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          authorName: users.fullName,
          authorFaculty: users.faculty,
          authorImage: users.image,
          communityName: communities.name,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .innerJoin(communities, eq(posts.communityId, communities.id))
        .where(eq(posts.communityId, selectedCommunity.id))
        .orderBy(desc(posts.createdAt))
    : [];

  const postIds = communityPosts.map((post) => post.id);

  const likedRows =
    postIds.length > 0
      ? await db
          .select({ postId: postLikes.postId, userId: postLikes.userId })
          .from(postLikes)
          .where(inArray(postLikes.postId, postIds))
      : [];

  const likedPostIds = new Set(
    likedRows
      .filter((row) => row.userId === session.userId)
      .map((row) => row.postId)
  );

  const postComments =
    postIds.length > 0
      ? await db
          .select({
            id: comments.id,
            postId: comments.postId,
            content: comments.content,
            createdAt: comments.createdAt,
            authorId: comments.authorId,
            authorName: users.fullName,
          })
          .from(comments)
          .innerJoin(users, eq(comments.authorId, users.id))
          .where(inArray(comments.postId, postIds))
          .orderBy(comments.createdAt)
      : [];

  const commentsByPost = new Map();
  for (const comment of postComments) {
    const list = commentsByPost.get(comment.postId) || [];
    list.push(comment);
    commentsByPost.set(comment.postId, list);
  }

  const normalizedPosts = communityPosts.map((post) => ({
    ...post,
    likedByMe: likedPostIds.has(post.id),
    comments: commentsByPost.get(post.id) || [],
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="card">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color-light)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>Communities</h2>
          <form action={createCommunity} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input name="name" placeholder="Community name" required style={{ padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)" }} />
            <input name="description" placeholder="Description" style={{ padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)" }} />
            <button type="submit" className="btn btn-primary" style={{ padding: "8px 16px" }}>Create</button>
          </form>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedCommunity ? "320px 1fr" : "1fr", gap: "16px", alignItems: "start" }}>
        <div style={{ display: "grid", gridTemplateColumns: selectedCommunity ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {realCommunities.length === 0 ? (
            <div className="card" style={{ padding: "60px 20px", textAlign: "center" }}>
              <span style={{ fontSize: "3.5rem", opacity: 0.3, display: "block", marginBottom: "16px" }}>🤝</span>
              <h3>No communities found</h3>
              <p style={{ color: "var(--text-secondary)" }}>Create the first university group.</p>
            </div>
          ) : (
            realCommunities.map((community) => {
              const isJoined = joinedIds.has(community.id);
              return (
                <div className="card" key={community.id} style={{ padding: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
                  <a href={`/communities?community=${community.id}`} style={{ width: "60px", height: "60px", borderRadius: "12px", backgroundColor: "var(--ufar-blue)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "bold", flexShrink: 0, overflow: "hidden", textDecoration: "none" }}>
                    {community.avatar ? <img src={community.avatar} alt={community.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : community.name[0]}
                  </a>
                  <div style={{ flex: 1 }}>
                    <a href={`/communities?community=${community.id}`} style={{ textDecoration: "none", color: "var(--text-primary)" }}>
                      <h4 style={{ margin: 0 }}>{community.name}</h4>
                    </a>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {community.description || "No description"}
                    </p>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "8px" }}>
                      by {community.ownerName}
                    </div>
                  </div>
                  <form action={isJoined ? leaveCommunity : joinCommunity}>
                    <input type="hidden" name="communityId" value={community.id} />
                    <button className="btn btn-secondary" disabled={community.creatorId === session.userId && isJoined}>
                      {isJoined ? "Leave" : "Join"}
                    </button>
                  </form>
                </div>
              );
            })
          )}
        </div>

        {selectedCommunity && (
          <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card" style={{ padding: "16px" }}>
              <h3 style={{ marginTop: 0 }}>{selectedCommunity.name}</h3>
              <p style={{ color: "var(--text-secondary)" }}>{selectedCommunity.description || "Community feed"}</p>

              {joinedIds.has(selectedCommunity.id) ? (
                <form action={createCommunityPost} style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                  <input type="hidden" name="communityId" value={selectedCommunity.id} />
                  <textarea name="content" placeholder="Post in this community..." maxLength={3000} style={{ minHeight: "80px", border: "1px solid var(--border-color-light)", borderRadius: "12px", padding: "12px", fontFamily: "inherit", resize: "vertical" }} />
                  <input type="file" name="image" accept="image/*" />
                  <button className="btn btn-primary" style={{ alignSelf: "flex-end" }}>Post</button>
                </form>
              ) : (
                <p style={{ color: "var(--text-secondary)" }}>Join the community to post.</p>
              )}
            </div>

            {normalizedPosts.length === 0 ? (
              <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                No posts in this community yet.
              </div>
            ) : (
              normalizedPosts.map((post) => (
                <PostCard key={post.id} post={post} currentUser={currentUser} />
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}
