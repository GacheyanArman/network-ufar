import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  communities,
  communityMembers,
  communityJoinRequests,
  posts,
  postLikes,
  comments,
  users,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getCommunityContext, COMMUNITY_TABS, resolveTab } from "@/lib/community";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import CommunityPostComposer from "@/components/CommunityPostComposer";
import CommunityPostCard from "@/components/CommunityPostCard";
import CommunityTabs from "@/components/CommunityTabs";
import CommunityJoinButton from "@/components/CommunityJoinButton";
import CommunityMembersPanel from "@/components/CommunityMembersPanel";
import UiIcon from "@/components/UiIcon";

export default async function CommunityDetailPage({ params, searchParams }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const search = (await searchParams) || {};
  const tabId = Array.isArray(search.tab) ? search.tab[0] : search.tab;
  const activeTab = resolveTab(tabId);

  // Fetch community with member count
  const [communityRow] = await db
    .select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      rules: communities.rules,
      avatar: communities.avatar,
      creatorId: communities.creatorId,
      isPrivate: communities.isPrivate,
      facultyTag: communities.facultyTag,
      yearTag: communities.yearTag,
      interests: communities.interests,
      createdAt: communities.createdAt,
      memberCount: sql`count(distinct ${communityMembers.id})::int`,
    })
    .from(communities)
    .leftJoin(communityMembers, eq(communities.id, communityMembers.communityId))
    .where(eq(communities.id, id))
    .groupBy(communities.id)
    .limit(1);

  if (!communityRow) notFound();

  const [currentUser] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      faculty: users.faculty,
      image: users.image,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const ctx = await getCommunityContext(id, session.userId);
  const canSeeContent = !communityRow.isPrivate || ctx.isMember || ctx.isPlatformStaff;

  // Get join request state for guest
  let joinState = "guest";
  if (ctx.isOwner) joinState = "owner";
  else if (ctx.isMember) joinState = "member";
  else if (communityRow.isPrivate) {
    try {
      const rows = await db
        .select({
          id: communityJoinRequests.id,
          status: communityJoinRequests.status,
        })
        .from(communityJoinRequests)
        .where(
          and(
            eq(communityJoinRequests.communityId, id),
            eq(communityJoinRequests.userId, session.userId)
          )
        );
      if (rows.some((r) => r.status === "pending")) joinState = "pending";
    } catch (err) {
      console.error(
        "[community detail] failed to load pending request:",
        err?.cause || err?.message || err
      );
    }
  }

  // Members list (top moderators + full list)
  const allMembers = await db
    .select({
      userId: communityMembers.userId,
      role: communityMembers.role,
      joinedAt: communityMembers.createdAt,
      fullName: users.fullName,
      image: users.image,
      avatarUrl: users.avatarUrl,
    })
    .from(communityMembers)
    .innerJoin(users, eq(communityMembers.userId, users.id))
    .where(eq(communityMembers.communityId, id))
    .orderBy(desc(communityMembers.createdAt));

  const moderatorsPreview = allMembers
    .filter((m) => m.role === "owner" || m.role === "admin" || m.role === "moderator")
    .slice(0, 6);

  // Counts per tab
  const tabCounts = {};
  if (canSeeContent) {
    const rows = await db
      .select({
        postType: posts.postType,
        count: sql`count(*)::int`,
      })
      .from(posts)
      .where(eq(posts.communityId, id))
      .groupBy(posts.postType);

    tabCounts.all = rows.reduce((acc, r) => acc + Number(r.count || 0), 0);
    for (const tab of COMMUNITY_TABS) {
      if (tab.postType) {
        const match = rows.find((r) => r.postType === tab.postType);
        tabCounts[tab.id] = match ? Number(match.count) : 0;
      }
    }
  }

  // Fetch posts for the active tab
  let communityPosts = [];
  if (canSeeContent) {
    const baseWhere = activeTab.postType
      ? and(eq(posts.communityId, id), eq(posts.postType, activeTab.postType))
      : eq(posts.communityId, id);

    communityPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        tags: posts.tags,
        postType: posts.postType,
        isPinned: posts.isPinned,
        pinnedAt: posts.pinnedAt,
        isSolved: posts.isSolved,
        bestCommentId: posts.bestCommentId,
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
      .where(baseWhere)
      .orderBy(desc(posts.isPinned), desc(posts.createdAt))
      .limit(50);
  }

  // Likes & comments
  const postIds = communityPosts.map((p) => p.id);

  const likedRows =
    postIds.length > 0
      ? await db
          .select({ postId: postLikes.postId, userId: postLikes.userId })
          .from(postLikes)
          .where(
            and(
              inArray(postLikes.postId, postIds),
              eq(postLikes.userId, session.userId)
            )
          )
      : [];
  const likedPostIds = new Set(likedRows.map((r) => r.postId));

  const commentRows =
    postIds.length > 0
      ? await db
          .select({
            id: comments.id,
            postId: comments.postId,
            content: comments.content,
            createdAt: comments.createdAt,
            authorId: comments.authorId,
            authorName: users.fullName,
            authorImage: users.image,
          })
          .from(comments)
          .innerJoin(users, eq(comments.authorId, users.id))
          .where(inArray(comments.postId, postIds))
          .orderBy(comments.createdAt)
      : [];

  const commentsByPost = new Map();
  for (const c of commentRows) {
    const list = commentsByPost.get(c.postId) || [];
    list.push(c);
    commentsByPost.set(c.postId, list);
  }

  const normalizedPosts = communityPosts.map((post) => ({
    ...post,
    likedByMe: likedPostIds.has(post.id),
    comments: commentsByPost.get(post.id) || [],
  }));

  // Join requests (only loaded for mods)
  let joinRequests = [];
  if (ctx.isModerator) {
    try {
      const rows = await db
        .select({
          id: communityJoinRequests.id,
          userId: communityJoinRequests.userId,
          fullName: users.fullName,
          image: users.image,
          avatarUrl: users.avatarUrl,
          faculty: users.faculty,
          message: communityJoinRequests.message,
          status: communityJoinRequests.status,
          createdAt: communityJoinRequests.createdAt,
        })
        .from(communityJoinRequests)
        .innerJoin(users, eq(communityJoinRequests.userId, users.id))
        .where(eq(communityJoinRequests.communityId, id))
        .orderBy(desc(communityJoinRequests.createdAt));
      joinRequests = rows.filter((r) => r.status === "pending");
    } catch (err) {
      console.error(
        "[community detail] failed to load join requests:",
        err?.cause || err?.message || err
      );
    }
  }

  const rules = parseRules(communityRow.rules);
  const interests = String(communityRow.interests || "")
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const initial = communityRow.name.charAt(0).toUpperCase();

  return (
    <div className="uf-community-page">
      {/* Header */}
      <header className="card uf-community-header">
        <Link href="/communities" className="uf-community-back">
          <UiIcon name="arrow-left" size={18} />
          Back to Communities
        </Link>

        <div className="uf-community-top">
          <div className="uf-community-avatar">
            {communityRow.avatar ? (
              <img src={communityRow.avatar} alt={communityRow.name} />
            ) : (
              initial
            )}
          </div>

          <div className="uf-community-info">
            <h1 className="uf-community-title">
              {communityRow.name}
              <span
                className={`uf-privacy-badge ${
                  communityRow.isPrivate ? "private" : "public"
                }`}
              >
                <UiIcon
                  name={communityRow.isPrivate ? "eye" : "users"}
                  size={12}
                />
                {communityRow.isPrivate ? "Private" : "Public"}
              </span>
            </h1>

            {communityRow.description ? (
              <p className="uf-community-description">
                {communityRow.description}
              </p>
            ) : null}

            <div className="uf-community-meta">
              <span className="uf-community-meta-item">
                <UiIcon name="users" size={14} />
                {communityRow.memberCount} members
              </span>
              <span className="uf-community-meta-item">
                <UiIcon name="calendar" size={14} />
                Created{" "}
                {new Date(communityRow.createdAt).toLocaleDateString()}
              </span>
              {communityRow.facultyTag ? (
                <span className="uf-community-pill">
                  <UiIcon name="graduation" size={12} />
                  {communityRow.facultyTag}
                </span>
              ) : null}
              {communityRow.yearTag ? (
                <span className="uf-community-pill">
                  <UiIcon name="calendar" size={12} />
                  {communityRow.yearTag}
                </span>
              ) : null}
              {interests.slice(0, 3).map((tag) => (
                <span key={tag} className="uf-community-pill">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="uf-community-actions">
            <CommunityJoinButton
              communityId={id}
              isPrivate={Boolean(communityRow.isPrivate)}
              state={joinState}
            />
            <CommunityMembersPanel
              communityId={id}
              ownerId={communityRow.creatorId}
              members={allMembers}
              requests={joinRequests}
              currentUserId={session.userId}
              canManage={ctx.isModerator}
              isOwner={ctx.isOwner}
            />
          </div>
        </div>

        <CommunityTabs
          communityId={id}
          activeTab={activeTab.id}
          tabs={COMMUNITY_TABS}
          counts={tabCounts}
        />
      </header>

      {/* Main layout */}
      <div className="uf-community-layout">
        <main className="uf-community-main">
          {!canSeeContent ? (
            <div className="card uf-empty-state">
              <div className="uf-empty-icon">
                <UiIcon name="eye" size={32} />
              </div>
              <h3 className="uf-empty-title">This is a private community</h3>
              <p className="uf-empty-description">
                Request to join to see discussions, questions, events and
                materials shared by members.
              </p>
              <CommunityJoinButton
                communityId={id}
                isPrivate
                state={joinState}
              />
            </div>
          ) : (
            <>
              {ctx.isMember ? (
                <CommunityPostComposer
                  communityId={id}
                  currentUser={currentUser}
                  canAnnounce={ctx.isModerator}
                  defaultPostType={activeTab.postType || "discussion"}
                />
              ) : null}

              {normalizedPosts.length === 0 ? (
                <div className="card uf-empty-state">
                  <div className="uf-empty-icon">
                    <UiIcon name="message" size={32} />
                  </div>
                  <h3 className="uf-empty-title">
                    {emptyTitleFor(activeTab.id)}
                  </h3>
                  <p className="uf-empty-description">
                    {emptyDescFor(activeTab.id, ctx.isMember)}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {normalizedPosts.map((post) => (
                    <CommunityPostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      canModerate={ctx.isModerator}
                      canMarkSolved={
                        post.authorId === session.userId || ctx.isModerator
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        <aside className="uf-community-sidebar">
          {rules.length > 0 ? (
            <div className="card uf-sidebar-card">
              <h3 className="uf-sidebar-title">
                <UiIcon name="book" size={14} />
                Community rules
              </h3>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {rules.map((rule, i) => (
                  <div key={i} className="uf-sidebar-rule">
                    <strong>{i + 1}</strong>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="card uf-sidebar-card">
            <h3 className="uf-sidebar-title">
              <UiIcon name="users" size={14} />
              Moderators
            </h3>
            {moderatorsPreview.length === 0 ? (
              <p className="uf-empty-description" style={{ fontSize: 13 }}>
                No moderators yet.
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                {moderatorsPreview.map((m) => (
                  <Link
                    key={m.userId}
                    href={`/profile/${m.userId}`}
                    className="uf-sidebar-member-row"
                  >
                    <Avatar name={m.fullName} src={m.image || m.avatarUrl} />
                    <span className="uf-sidebar-member-name">
                      {m.fullName || "Student"}
                    </span>
                    <span
                      className={`uf-role-badge ${
                        m.userId === communityRow.creatorId ||
                        m.role === "owner" ||
                        m.role === "admin"
                          ? "gold"
                          : "blue"
                      }`}
                    >
                      {m.userId === communityRow.creatorId ||
                      m.role === "owner" ||
                      m.role === "admin"
                        ? "Owner"
                        : "Mod"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {interests.length > 0 ? (
            <div className="card uf-sidebar-card">
              <h3 className="uf-sidebar-title">
                <UiIcon name="tag" size={14} />
                Interests
              </h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {interests.map((tag) => (
                  <span key={tag} className="uf-community-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {ctx.isOwner ? (
            <div className="card uf-sidebar-card">
              <h3 className="uf-sidebar-title">
                <UiIcon name="filter" size={14} />
                Settings
              </h3>
              <Link
                href={`/communities/${id}/settings`}
                className="btn btn-secondary"
                style={{
                  textDecoration: "none",
                  justifyContent: "center",
                }}
              >
                Manage community
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Avatar({ name, src }) {
  const initial = (name || "S").charAt(0).toUpperCase();
  return (
    <div
      className="uf-community-avatar tiny"
      style={{ borderRadius: 999 }}
    >
      {src ? (
        <img
          src={src}
          alt={name || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initial
      )}
    </div>
  );
}

function parseRules(rules) {
  if (!rules) return [];
  return rules
    .split(/\n+/)
    .map((line) => line.trim().replace(/^\d+[.)]\s*/, "").replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

function emptyTitleFor(tabId) {
  switch (tabId) {
    case "questions":
      return "No questions yet";
    case "study_groups":
      return "No study groups yet";
    case "materials":
      return "No materials yet";
    case "events":
      return "No events yet";
    case "announcements":
      return "No announcements yet";
    default:
      return "No posts yet";
  }
}

function emptyDescFor(tabId, isMember) {
  if (!isMember) return "Join the community to see and share content here.";
  switch (tabId) {
    case "questions":
      return "Be the first to ask a question — your peers will help.";
    case "study_groups":
      return "Start a study group — choose subject, time and place.";
    case "materials":
      return "Share a useful link, notes or a cheat sheet for others.";
    case "events":
      return "Announce upcoming events and get people involved.";
    case "announcements":
      return "Only moderators can post announcements here.";
    default:
      return "Be the first to start a conversation.";
  }
}
