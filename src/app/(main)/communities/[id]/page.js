import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  communities,
  communityMembers,
  posts,
  postLikes,
  comments,
  users,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, desc, inArray, sql } from "drizzle-orm";
import CommunityPostComposer from "@/components/CommunityPostComposer";
import PostCard from "@/components/PostCard";
import UiIcon from "@/components/UiIcon";
import Link from "next/link";
import { joinCommunity, leaveCommunity } from "@/app/actions/community";

export default async function CommunityDetailPage({ params }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const { id } = await params;

  // Get community details
  const [community] = await db
    .select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      avatar: communities.avatar,
      creatorId: communities.creatorId,
      createdAt: communities.createdAt,
      memberCount: sql`count(distinct ${communityMembers.id})::int`,
    })
    .from(communities)
    .leftJoin(communityMembers, eq(communities.id, communityMembers.communityId))
    .where(eq(communities.id, id))
    .groupBy(communities.id)
    .limit(1);

  if (!community) notFound();

  // Get current user
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

  // Check if user is member
  const [membership] = await db
    .select()
    .from(communityMembers)
    .where(
      eq(communityMembers.communityId, id),
      eq(communityMembers.userId, session.userId)
    )
    .limit(1);

  const isMember = !!membership;
  const isCreator = community.creatorId === session.userId;

  // Get community posts
  const communityPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      authorName: users.fullName,
      authorImage: users.image,
      communityName: communities.name,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .innerJoin(communities, eq(posts.communityId, communities.id))
    .where(eq(posts.communityId, id))
    .orderBy(desc(posts.createdAt))
    .limit(50);

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

  const initial = community.name.charAt(0).toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Community Header */}
      <header className="card" style={{ padding: "24px" }}>
        <div style={{ marginBottom: "20px" }}>
          <Link href="/communities" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: "800",
            textDecoration: "none",
            transition: "color 0.2s ease"
          }}>
            <UiIcon name="arrow-left" size={20} />
            Back to Communities
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr) auto", gap: "20px", alignItems: "start", marginBottom: "24px" }}>
          <div style={{
            width: "96px",
            height: "96px",
            borderRadius: "20px",
            overflow: "hidden",
            background: "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(11, 58, 168, 0.2)"
          }}>
            {community.avatar ? (
              <img src={community.avatar} alt={community.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ color: "#ffffff", fontSize: "36px", fontWeight: "900" }}>
                {initial}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "28px", fontWeight: "950", letterSpacing: "-0.02em" }}>
              {community.name}
            </h1>
            {community.description && (
              <p style={{ margin: "0 0 12px 0", color: "var(--text-secondary)", fontSize: "15px", lineHeight: "1.5" }}>
                {community.description}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "700" }}>
                <UiIcon name="users" size={16} />
                {community.memberCount} members
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "700" }}>
                <UiIcon name="calendar" size={16} />
                Created {new Date(community.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {isMember ? (
              <form action={leaveCommunity}>
                <input type="hidden" name="communityId" value={id} />
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={isCreator}
                >
                  {isCreator ? "Owner" : "Leave Community"}
                </button>
              </form>
            ) : (
              <form action={joinCommunity}>
                <input type="hidden" name="communityId" value={id} />
                <button type="submit" className="btn btn-primary">
                  Join Community
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "20px", borderTop: "1px solid var(--border-color)", overflowX: "auto" }}>
          <a href="#" style={{
            minHeight: "40px",
            padding: "0 18px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "800",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(11, 58, 168, 0.24)"
          }}>
            All Posts
          </a>
          <a href="#" style={{
            minHeight: "40px",
            padding: "0 18px",
            borderRadius: "10px",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: "800",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease"
          }}>
            Questions
          </a>
          <a href="#" style={{
            minHeight: "40px",
            padding: "0 18px",
            borderRadius: "10px",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: "800",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease"
          }}>
            Study Groups
          </a>
          <a href="#" style={{
            minHeight: "40px",
            padding: "0 18px",
            borderRadius: "10px",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: "800",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease"
          }}>
            Materials
          </a>
          <a href="#" style={{
            minHeight: "40px",
            padding: "0 18px",
            borderRadius: "10px",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: "800",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease"
          }}>
            Events
          </a>
          <a href="#" style={{
            minHeight: "40px",
            padding: "0 18px",
            borderRadius: "10px",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: "800",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease"
          }}>
            Announcements
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Composer */}
        {isMember && (
          <CommunityPostComposer
            communityId={id}
            currentUser={currentUser}
          />
        )}

        {/* Posts Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {normalizedPosts.length === 0 ? (
            <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
              <div style={{
                width: "80px",
                height: "80px",
                margin: "0 auto 20px",
                borderRadius: "20px",
                background: "var(--bg-soft)",
                color: "var(--french-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <UiIcon name="message" size={48} />
              </div>
              <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "20px", fontWeight: "900" }}>
                No posts yet
              </h3>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "15px" }}>
                {isMember
                  ? "Be the first to post in this community"
                  : "Join the community to see posts"}
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {normalizedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
