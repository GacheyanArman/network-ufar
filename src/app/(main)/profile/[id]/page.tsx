import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";

import { db } from "@/shared/db/db";
import {
  friendships,
  posts,
  users,
  blockedUsers,
  userFollows,
  courseEnrollments,
  courses,
  semesters,
  photoAlbums,
} from "@/shared/db/schema";
import {
  getFacultyLabel,
  getRelationshipStatusLabel,
  getOpenToLabel,
  parseOpenTo,
} from "@/features/profile/server/utils";
import { getSession } from "@/shared/auth/session";
import { followUser, unfollowUser } from "@/features/profile/server/follow";
import { sendFriendRequest } from "@/features/profile/server/friends";
import PostCard from "@/features/feed/components/PostCard";
import UiIcon from "@/shared/ui/UiIcon";
import BlockButton from "@/features/profile/components/BlockButton";
import { translations } from "@/shared/i18n/i18n";

import "@/features/profile/profile.css";
import {
  TabLink,
  InfoBlock,
  EmptyState,
} from "@/features/profile/components/SharedProfileComponents";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

const ALLOWED_TABS = ["posts", "friends", "albums", "about"];

export default async function PublicProfilePage({ params, searchParams }: PageProps) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const currentUserId = session.userId as string;

  const cookieStore = await cookies();
  const lang = (cookieStore.get("language")?.value || "en") as "en" | "fr" | "hy";
  const t = translations[lang] || translations.en;
  const es = t.emptyStates;

  const routeParams = await params;
  const pageParams = await searchParams;

  const profileId = routeParams?.id;
  let currentTab = pageParams?.tab || "posts";
  if (!ALLOWED_TABS.includes(currentTab)) {
    currentTab = "posts";
  }

  if (!profileId) {
    notFound();
  }

  if (profileId === currentUserId) {
    redirect("/profile");
  }

  const [profileUser] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      username: users.username,
      faculty: users.faculty,
      bio: users.bio,
      image: users.image,
      avatarUrl: users.avatarUrl,
      coverImage: users.coverImage,
      year: users.year,
      studyGroup: users.studyGroup,
      relationshipStatus: users.relationshipStatus,
      lookingFor: users.lookingFor,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, profileId))
    .limit(1);

  if (!profileUser) {
    notFound();
  }

  const [currentUser] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      faculty: users.faculty,
      image: users.image,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  // ─── Enrolled courses (current semester) ───
  const activeSemesterResult = await db
    .select()
    .from(semesters)
    .where(eq(semesters.isActive, true))
    .limit(1);
  const activeSemester = activeSemesterResult[0] || null;

  let enrolledCourses: Array<{ id: string; name: string; code: string }> = [];
  if (activeSemester) {
    enrolledCourses = await db
      .select({
        id: courses.id,
        name: courses.name,
        code: courses.code,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(
        and(
          eq(courseEnrollments.userId, profileId),
          eq(courseEnrollments.semesterId, activeSemester.id)
        )
      );
  }

  // ─── User's posts ───
  const userPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      authorId: posts.authorId,
    })
    .from(posts)
    .where(eq(posts.authorId, profileId))
    .orderBy(desc(posts.createdAt));

  const [relationship] = await db
    .select({
      id: friendships.id,
      requesterId: friendships.requesterId,
      receiverId: friendships.receiverId,
      status: friendships.status,
    })
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, currentUserId),
          eq(friendships.receiverId, profileId)
        ),
        and(
          eq(friendships.requesterId, profileId),
          eq(friendships.receiverId, currentUserId)
        )
      )
    )
    .limit(1);

  const [followRow] = await db
    .select({ id: userFollows.id })
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerId, currentUserId),
        eq(userFollows.followingId, profileId)
      )
    )
    .limit(1);

  const [blockStatus] = await db
    .select()
    .from(blockedUsers)
    .where(
      or(
        and(
          eq(blockedUsers.blockerId, currentUserId),
          eq(blockedUsers.blockedId, profileId)
        ),
        and(
          eq(blockedUsers.blockerId, profileId),
          eq(blockedUsers.blockedId, currentUserId)
        )
      )
    )
    .limit(1);

  const isBlocked = blockStatus?.blockerId === currentUserId;
  const isBlockedByThem = blockStatus?.blockerId === profileId;

  const [profileFriendships, myFriendships, profileFollowers, profileFollowing, publicAlbums] = await Promise.all([
    db
      .select({ requesterId: friendships.requesterId, receiverId: friendships.receiverId })
      .from(friendships)
      .where(and(eq(friendships.status, "accepted"), or(eq(friendships.requesterId, profileId), eq(friendships.receiverId, profileId)))),
    db
      .select({ requesterId: friendships.requesterId, receiverId: friendships.receiverId })
      .from(friendships)
      .where(and(eq(friendships.status, "accepted"), or(eq(friendships.requesterId, currentUserId), eq(friendships.receiverId, currentUserId)))),
    db.select({ id: userFollows.id }).from(userFollows).where(eq(userFollows.followingId, profileId)),
    db.select({ id: userFollows.id }).from(userFollows).where(eq(userFollows.followerId, profileId)),
    db
      .select({
        id: photoAlbums.id,
        title: photoAlbums.title,
        description: photoAlbums.description,
        coverPhotoUrl: photoAlbums.coverPhotoUrl,
      })
      .from(photoAlbums)
      .where(and(eq(photoAlbums.ownerId, profileId), eq(photoAlbums.isPrivate, false)))
      .orderBy(desc(photoAlbums.createdAt))
      .limit(18),
  ]);

  const profileFriendIds: string[] = profileFriendships.map((friendship: { requesterId: string; receiverId: string }) =>
    friendship.requesterId === profileId ? friendship.receiverId : friendship.requesterId
  );
  const myFriendIds = new Set<string>(myFriendships.map((friendship: { requesterId: string; receiverId: string }) =>
    friendship.requesterId === currentUserId ? friendship.receiverId : friendship.requesterId
  ));
  const mutualFriendsCount = profileFriendIds.filter((id) => myFriendIds.has(id)).length;
  const publicFriends = profileFriendIds.length > 0
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          username: users.username,
          faculty: users.faculty,
          image: users.image,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(inArray(users.id, profileFriendIds))
        .limit(24)
    : [];

  const safeName = profileUser.fullName || "Student";
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";
  const safeEmail = profileUser.email || "";
  const safeUsername = profileUser.username ? `@${profileUser.username}` : "@username";
  const safeFaculty = profileUser.faculty ? getFacultyLabel(profileUser.faculty, lang) : "Faculty not specified";
  const rawFaculty = profileUser.faculty || "";
  const safeBio = profileUser.bio || "";
  const avatarImage = profileUser.image || profileUser.avatarUrl || "";
  const coverImage = profileUser.coverImage || null;

  const isFollowing = Boolean(followRow);
  const isFriend = relationship?.status === "accepted";
  const isPendingRequest = relationship?.status === "pending";
  const isIncomingRequest =
    isPendingRequest && relationship?.receiverId === session.userId;

  const yearLabels = (translations[lang] || translations.en).onboarding?.year || {};
  const safeYear = profileUser.year
    ? yearLabels[profileUser.year as keyof typeof yearLabels] || profileUser.year
    : "";

  const joinedAt = profileUser.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  // Social info: optional, hidden unless the user explicitly set it ("private" hides "Open to")
  const openToTokens = parseOpenTo(profileUser.lookingFor);
  const openToList = openToTokens.includes("private") ? [] : openToTokens;
  const relationshipLabel = profileUser.relationshipStatus
    ? getRelationshipStatusLabel(profileUser.relationshipStatus, lang)
    : "";

  const normalizedPosts = userPosts.map((post: any) => {
    const imageUrl = post.imageUrl || null;
    const mediaType = imageUrl
      ? /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(imageUrl)
        ? "video"
        : "image"
      : null;
    return {
      id: post.id,
      content: post.content || "",
      imageUrl,
      mediaType: mediaType as "image" | "video" | null,
      createdAt: post.createdAt
        ? post.createdAt.toISOString()
        : new Date().toISOString(),
      authorId: post.authorId,
      authorName: safeName,
      authorImage: avatarImage,
      authorFaculty: rawFaculty,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      likedByMe: false,
    };
  });

  const TABS = [
    { key: "posts", label: "Posts" },
    { key: "friends", label: "Friends" },
    { key: "albums", label: "Albums" },
    { key: "about", label: "About" },
  ];

  return (
    <div className="uf-profile-page">
      <style>{`
        .uf-profile-page ~ .sidebar-right,
        body:has(.uf-profile-page) .sidebar-right {
          display: none !important;
        }

        body:has(.uf-profile-page) .app-container,
        body:has(.uf-profile-page) .simple-layout,
        body:has(.uf-profile-page) .old-social-grid {
          grid-template-columns: var(--left-col) minmax(0, 1fr) !important;
        }
        
        .public-profile-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 20px;
        }

        .public-btn {
          width: 100%;
          height: 40px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: background 0.2s;
        }
        .public-btn-primary {
          background: #0b3aa8;
          color: #fff;
        }
        .public-btn-primary:hover {
          background: #062fae;
        }
        .public-btn-secondary {
          background: #e2e8f0;
          color: #0f172a;
        }
        .public-btn-secondary:hover {
          background: #cbd5e1;
        }
        .public-btn-light {
          background: #f1f5f9;
          color: #0f172a;
        }
        .public-btn-light:hover {
          background: #e2e8f0;
        }
        
        .public-status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
        }
      `}</style>

      <div className="uf-profile-shell">
        <div className="uf-profile-layout">
          <aside className="uf-profile-sidebar">
            <section className="uf-card uf-profile-card">
              <div className="uf-profile-cover-area">
                {coverImage && (
                  <img src={coverImage} alt="Cover" className="uf-profile-cover-img" />
                )}
              </div>
              <div className="uf-profile-avatar-wrapper">
                <div className="uf-profile-avatar">
                  {avatarImage ? (
                    <Image src={avatarImage} alt={safeName} width={100} height={100} />
                  ) : (
                    <span>{safeInitial}</span>
                  )}
                </div>
              </div>

              <div className="uf-profile-details">
                <div className="uf-profile-heading">
                  <h1>{safeName}</h1>
                  <p>{safeUsername}</p>
                </div>

                <div className="uf-profile-badges">
                  {profileUser.faculty && (
                    <div className="uf-profile-badge">
                      <UiIcon name="graduation" size={15} />
                      {safeFaculty}
                    </div>
                  )}

                  {safeYear && (
                    <div className="uf-profile-badge">
                      <UiIcon name="calendar" size={15} />
                      {safeYear}
                    </div>
                  )}

                  {profileUser.studyGroup && (
                    <Link href={`/study-groups?q=${profileUser.studyGroup}`} className="uf-profile-badge clickable">
                      <UiIcon name="group" size={15} />
                      Group {profileUser.studyGroup}
                    </Link>
                  )}

                  <div className="uf-profile-badge uf-profile-badge-subtle">
                    <UiIcon name="clock" size={14} />
                    Joined {joinedAt}
                  </div>
                </div>

                {safeBio ? <p className="uf-profile-bio">{safeBio}</p> : null}

                <div className="uf-profile-stats-bar uf-profile-social-stats">
                  <Link href={`/profile/${profileId}?tab=friends`} className="uf-stat-item">
                    <span className="uf-stat-value">{profileFriendIds.length}</span>
                    <span className="uf-stat-label">Friends</span>
                  </Link>
                  <Link href={`/profile/${profileId}?tab=friends`} className="uf-stat-item">
                    <span className="uf-stat-value">{profileFollowers.length}</span>
                    <span className="uf-stat-label">Followers</span>
                  </Link>
                  <Link href={`/profile/${profileId}?tab=friends`} className="uf-stat-item">
                    <span className="uf-stat-value">{profileFollowing.length}</span>
                    <span className="uf-stat-label">Following</span>
                  </Link>
                </div>
                <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
                  {mutualFriendsCount} mutual friends
                </p>

                {/* Enrolled Courses */}
                {enrolledCourses.length > 0 ? (
                  <div className="uf-profile-courses">
                    <p className="uf-profile-courses-title">Enrolled Courses</p>
                    <div className="uf-profile-courses-list">
                      {enrolledCourses.map((c) => (
                        <Link
                          key={c.id}
                          href={`/schedule/course/${c.id}`}
                          className="uf-course-chip"
                        >
                          {c.code}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="public-profile-actions">
                  {isBlockedByThem ? (
                    <div style={{ padding: "12px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
                      This user has blocked you
                    </div>
                  ) : (
                    <>
                      {isFollowing ? (
                        <form action={unfollowUser as any}>
                          <input type="hidden" name="targetId" value={profileId} />
                          <button className="public-btn public-btn-secondary" type="submit">
                            Following
                          </button>
                        </form>
                      ) : (
                        <form action={followUser as any}>
                          <input type="hidden" name="targetId" value={profileId} />
                          <button className="public-btn public-btn-primary" type="submit">
                            Follow
                          </button>
                        </form>
                      )}

                      {isFriend ? (
                        <span className="public-status-pill">Friends</span>
                      ) : isIncomingRequest ? (
                        <form action={sendFriendRequest as any}>
                          <input type="hidden" name="targetId" value={profileId} />
                          <button className="public-btn public-btn-light" type="submit">
                            Accept request
                          </button>
                        </form>
                      ) : isPendingRequest ? (
                        <span className="public-status-pill">Request sent</span>
                      ) : (
                        <form action={sendFriendRequest as any}>
                          <input type="hidden" name="targetId" value={profileId} />
                          <button className="public-btn public-btn-light" type="submit">
                            Add friend
                          </button>
                        </form>
                      )}

                      <div style={{ marginTop: 8 }}>
                        <BlockButton
                          userId={profileId}
                          userName={safeName}
                          isBlocked={isBlocked}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          </aside>

          <main className="uf-profile-main">
            <nav className="uf-card uf-profile-tabs">
              {TABS.map((tab) => (
                <TabLink
                  key={tab.key}
                  href={`/profile/${profileId}?tab=${tab.key}`}
                  active={currentTab === tab.key}
                >
                  {tab.label}
                </TabLink>
              ))}
            </nav>

            {/* ─── Posts tab ─── */}
            {currentTab === "posts" ? (
              <section className="uf-profile-feed">
                {normalizedPosts.length === 0 ? (
                  <EmptyState
                    icon="file-text"
                    title={es.profile.noPostsOther}
                    description={es.profile.noPostsOtherHint}
                  />
                ) : (
                  normalizedPosts.map((post: any) => (
                    <PostCard
                      key={post.id}
                      post={{
                        ...post,
                        repostsCount: 0,
                        viewsCount: 0,
                        commentsCount: post.commentsCount || 0,
                        comments: [],
                        communityName: null,
                      }}
                      currentUser={currentUser}
                    />
                  ))
                )}
              </section>
            ) : null}

            {/* ─── Friends tab ─── */}
            {currentTab === "friends" ? (
              <section className="uf-materials-section">
                <div className="uf-card" style={{ padding: 18, marginBottom: 16 }}>
                  <h3 className="uf-overview-section-title" style={{ padding: 0, marginBottom: 12 }}>Social circle</h3>
                  <div className="uf-profile-stats-bar">
                    <div className="uf-stat-item"><span className="uf-stat-value">{profileFriendIds.length}</span><span className="uf-stat-label">Friends</span></div>
                    <div className="uf-stat-item"><span className="uf-stat-value">{profileFollowers.length}</span><span className="uf-stat-label">Followers</span></div>
                    <div className="uf-stat-item"><span className="uf-stat-value">{profileFollowing.length}</span><span className="uf-stat-label">Following</span></div>
                    <div className="uf-stat-item"><span className="uf-stat-value">{mutualFriendsCount}</span><span className="uf-stat-label">Mutual</span></div>
                  </div>
                </div>
                {publicFriends.length === 0 ? (
                  <EmptyState icon="users" title="No friends yet" description="This student has not added friends yet." />
                ) : (
                  <div className="uf-card" style={{ padding: 12, display: "grid", gap: 8 }}>
                    {publicFriends.map((friend: { id: string; fullName: string | null; username: string | null; faculty: string | null; image: string | null; avatarUrl: string | null }) => (
                      <Link key={friend.id} href={`/profile/${friend.id}`} className="mini-user-row mini-user-row-link">
                        <div className="mini-user-avatar">
                          {friend.image || friend.avatarUrl ? (
                            <img src={(friend.image || friend.avatarUrl) as string} alt={friend.fullName || "Student"} />
                          ) : (
                            friend.fullName?.[0] || "U"
                          )}
                        </div>
                        <div className="mini-user-main">
                          <strong>{friend.fullName || "Student"}</strong>
                          <span>{friend.username ? `@${friend.username}` : friend.faculty || "Student"}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {/* ─── Albums tab ─── */}
            {currentTab === "albums" ? (
              <section className="uf-materials-section">
                <h3 className="uf-overview-section-title" style={{ padding: "0 8px" }}>Albums ({publicAlbums.length})</h3>
                {publicAlbums.length === 0 ? (
                  <EmptyState icon="image" title="No public albums yet" description="Albums keep photos from events, clubs and student life in one profile." />
                ) : (
                  <div className="uf-photo-grid">
                    {publicAlbums.map((album: { id: string; title: string; description: string | null; coverPhotoUrl: string | null }) => (
                      <div key={album.id} className="uf-card uf-photo-tile">
                        <div className="uf-photo-thumb">
                          {album.coverPhotoUrl ? <img src={album.coverPhotoUrl} alt={album.title} /> : <span>📸</span>}
                        </div>
                        <strong>{album.title}</strong>
                        <span>{album.description || "Student memories"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {/* ─── About tab ─── */}
            {currentTab === "about" ? (
              <section className="uf-about-grid">
                <div className="uf-card uf-about-card">
                  <h3>Bio</h3>
                  <p className="uf-about-bio" style={{ margin: 0 }}>
                    {safeBio || es.profile.noBioOther}
                  </p>
                </div>

                <div className="uf-card uf-about-card">
                  <h3>Academic info</h3>
                  <div className="uf-personal-info-list">
                    <InfoBlock label="Full name" value={safeName} />
                    {safeUsername !== "@username" && (
                      <InfoBlock label="Username" value={safeUsername} />
                    )}
                    <InfoBlock label="Faculty" value={safeFaculty} />
                    {safeYear && <InfoBlock label="Year" value={safeYear} />}
                    {profileUser.studyGroup && <InfoBlock label="Study Group" value={profileUser.studyGroup} />}
                    <InfoBlock label="Joined" value={joinedAt} />
                  </div>
                </div>

                {(relationshipLabel || openToList.length > 0) && (
                  <div className="uf-card uf-about-card">
                    <h3>Social</h3>
                    <div className="uf-personal-info-list">
                      {relationshipLabel && (
                        <InfoBlock label="Relationship" value={relationshipLabel} />
                      )}
                      {openToList.length > 0 && (
                        <div className="uf-info-block">
                          <span>{t.profile?.openToTitle || "Open to"}</span>
                          <strong>
                            {openToList.map((v: string) => getOpenToLabel(v, lang)).join(" · ")}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
