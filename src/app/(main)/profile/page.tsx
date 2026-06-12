import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, or } from "drizzle-orm";

import { db } from "@/shared/db/db";
import { getSession } from "@/shared/auth/session";
import {
  users,
  posts,
  courseEnrollments,
  courses,
  semesters,
  notificationPreferences,
  postSaves,
  postLikes,
  friendships,
  userFollows,
  photoAlbums,
  photoSaves,
  photos,
} from "@/shared/db/schema";
import PostComposer from "@/features/feed/components/PostComposer";
import ProfilePostsClient from "@/features/profile/components/ProfilePostsClient";
import UiIcon from "@/shared/ui/UiIcon";
import {
  getFacultyLabel,
  getRelationshipStatusLabel,
  getOpenToLabel,
  parseOpenTo,
} from "@/features/profile/server/utils";
import { translations } from "@/shared/i18n/i18n";

import "@/features/profile/profile.css";
import {
  TabLink,
  InfoBlock,
  EmptyState,
} from "@/features/profile/components/SharedProfileComponents";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    saved?: string;
  }>;
}

const ALLOWED_TABS = ["posts", "friends", "albums", "saved", "about"];

export default async function ProfilePage({ searchParams }: PageProps) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const currentUserId = session.userId as string;

  const cookieStore = await cookies();
  const lang = (cookieStore.get("language")?.value || "en") as "en" | "fr" | "hy";
  const t = translations[lang] || translations.en;
  const es = t.emptyStates;

  const params = await searchParams;
  let currentTab = params?.tab || "posts";
  if (!ALLOWED_TABS.includes(currentTab)) {
    currentTab = "posts";
  }
  const isSaved = params?.saved === "1";

  // ─── Current user ───
  const [currentUser] = await db
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
    .where(eq(users.id, currentUserId))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  // ─── Social graph: kept in Profile to avoid overloading the main navigation ───
  const acceptedFriendships = await db
    .select({
      id: friendships.id,
      requesterId: friendships.requesterId,
      receiverId: friendships.receiverId,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, currentUserId), eq(friendships.receiverId, currentUserId))
      )
    );

  const friendIds: string[] = acceptedFriendships.map((friendship: { requesterId: string; receiverId: string }) =>
    friendship.requesterId === currentUserId ? friendship.receiverId : friendship.requesterId
  );

  const friendsList = friendIds.length > 0
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
        .where(inArray(users.id, friendIds))
        .limit(24)
    : [];

  const [followersRows, followingRows] = await Promise.all([
    db.select({ id: userFollows.id }).from(userFollows).where(eq(userFollows.followingId, currentUserId)),
    db.select({ id: userFollows.id }).from(userFollows).where(eq(userFollows.followerId, currentUserId)),
  ]);

  // ─── Photo memory library: albums and saved photos live inside Profile ───
  const [myAlbums, savedPhotos] = await Promise.all([
    db
      .select({
        id: photoAlbums.id,
        title: photoAlbums.title,
        description: photoAlbums.description,
        coverPhotoUrl: photoAlbums.coverPhotoUrl,
        createdAt: photoAlbums.createdAt,
      })
      .from(photoAlbums)
      .where(eq(photoAlbums.ownerId, currentUserId))
      .orderBy(desc(photoAlbums.createdAt))
      .limit(24),
    db
      .select({
        id: photos.id,
        imageUrl: photos.imageUrl,
        thumbnailUrl: photos.thumbnailUrl,
        mediumUrl: photos.mediumUrl,
        caption: photos.caption,
        ownerName: users.fullName,
      })
      .from(photoSaves)
      .innerJoin(photos, eq(photoSaves.photoId, photos.id))
      .innerJoin(users, eq(photos.ownerId, users.id))
      .where(eq(photoSaves.userId, currentUserId))
      .orderBy(desc(photoSaves.createdAt))
      .limit(36),
  ]);

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
          eq(courseEnrollments.userId, currentUserId),
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
      postType: posts.postType,
    })
    .from(posts)
    .where(eq(posts.authorId, currentUserId))
    .orderBy(desc(posts.createdAt));

  // ─── User's Likes and Saves ───
  const userLikes = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(eq(postLikes.userId, currentUserId));
  const likedPostIds = new Set<string>(userLikes.map((l: { postId: string }) => l.postId));

  const userSaves = await db
    .select({ postId: postSaves.postId })
    .from(postSaves)
    .where(eq(postSaves.userId, currentUserId));
  const savedPostIds = new Set<string>(userSaves.map((s: { postId: string }) => s.postId));

  const safeName = currentUser.fullName || "Student";
  const avatarImage = currentUser.image || currentUser.avatarUrl || "";
  const rawFaculty = currentUser.faculty || "";

  const serializedPosts = userPosts.map((post: any) => {
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
      postType: post.postType || "discussion",
      likedByMe: likedPostIds.has(post.id),
      savedByMe: savedPostIds.has(post.id),
    };
  });

  // ─── My Posts ───
  const myPostsOnly = serializedPosts.filter((p: any) => p.postType !== "question");

  // ─── Notification preferences ───
  const [prefRow] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, currentUserId))
    .limit(1);

  const prefs = {
    academic: prefRow?.academic ?? true,
    events: prefRow?.events ?? true,
    photos: prefRow?.photos ?? true,
    messages: prefRow?.messages ?? true,
    materials: prefRow?.materials ?? true,
    social: prefRow?.social ?? true,
  };

  // ─── Computed values ───
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";
  const safeEmail = currentUser.email || "";
  const safeUsername = currentUser.username
    ? `@${currentUser.username}`
    : "@username";
  const safeFaculty = currentUser.faculty
    ? getFacultyLabel(currentUser.faculty, lang)
    : t.profile?.facultyNotSpecified || "Faculty not specified";
  const safeBio = currentUser.bio || "";
  const coverImage = currentUser.coverImage || null;

  const yearLabels = (translations[lang] || translations.en).onboarding?.year || {};
  const safeYear = currentUser.year
    ? yearLabels[currentUser.year as keyof typeof yearLabels] || currentUser.year
    : "";

  const joinedAt = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  // Social info: optional and hidden by default ("private" hides "Open to" entirely)
  const openToTokens = parseOpenTo(currentUser.lookingFor);
  const openToList = openToTokens.includes("private") ? [] : openToTokens;
  const relationshipLabel = currentUser.relationshipStatus
    ? getRelationshipStatusLabel(currentUser.relationshipStatus, lang)
    : "";

  const TABS = [
    { key: "posts", label: "Posts" },
    { key: "friends", label: "Friends" },
    { key: "albums", label: "Albums" },
    { key: "saved", label: "Saved Photos" },
    { key: "about", label: t.profile?.about || "About" },
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
                    <Image
                      src={avatarImage}
                      alt={safeName}
                      width={100}
                      height={100}
                    />
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
                  {currentUser.faculty && (
                    <div className="uf-profile-badge">
                      {safeFaculty}
                    </div>
                  )}

                  {safeYear && (
                    <div className="uf-profile-badge">
                      {safeYear}
                    </div>
                  )}

                  {currentUser.studyGroup && (
                    <Link href={`/study-groups?q=${currentUser.studyGroup}`} className="uf-profile-badge clickable">
                      {currentUser.studyGroup}
                    </Link>
                  )}
                </div>

                {safeBio ? (
                  <p className="uf-profile-bio">{safeBio}</p>
                ) : null}

                <div className="uf-profile-stats-bar uf-profile-social-stats">
                  <Link href="/profile?tab=friends" className="uf-stat-item">
                    <span className="uf-stat-value">{friendsList.length}</span>
                    <span className="uf-stat-label">Friends</span>
                  </Link>
                  <Link href="/profile?tab=friends" className="uf-stat-item">
                    <span className="uf-stat-value">{followersRows.length}</span>
                    <span className="uf-stat-label">Followers</span>
                  </Link>
                  <Link href="/profile?tab=friends" className="uf-stat-item">
                    <span className="uf-stat-value">{followingRows.length}</span>
                    <span className="uf-stat-label">Following</span>
                  </Link>
                </div>

                {/* Enrolled courses */}
                {enrolledCourses.length > 0 ? (
                  <div className="uf-profile-courses">
                    <p className="uf-profile-courses-title">{t.profile?.myCourses || "My Courses"}</p>
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

                <div className="uf-profile-actions">
                  <Link href={`/profile/${currentUserId}`} className="uf-profile-edit-btn">
                    {t.profile?.viewPublicProfile || "View public profile"}
                  </Link>
                  <Link href="/profile/edit" className="uf-profile-edit-btn primary">
                    {t.profile?.editProfile || "Edit profile"}
                  </Link>
                  <Link href="/settings" className="uf-profile-edit-btn">
                    {t.nav?.settings || "Settings"}
                  </Link>
                </div>
              </div>
            </section>
          </aside>

          <main className="uf-profile-main">
            <nav className="uf-card uf-profile-tabs">
              {TABS.map((tab) => (
                <TabLink
                  key={tab.key}
                  href={`/profile?tab=${tab.key}`}
                  active={currentTab === tab.key}
                >
                  {tab.label}
                </TabLink>
              ))}
            </nav>

            {isSaved ? (
              <div className="uf-profile-alert">
                {t.profile?.profileUpdated || "Profile updated successfully."}
              </div>
            ) : null}

            {/* ─── Posts tab ─── */}
            {currentTab === "posts" ? (
              <section className="uf-profile-feed">
                <div className="uf-card uf-profile-composer" style={{ marginBottom: 16 }}>
                  <PostComposer currentUser={currentUser} />
                </div>

                {myPostsOnly.length === 0 ? (
                  <EmptyState
                    icon="file-text"
                    title={es.profile.noPosts}
                    description={es.profile.noPostsHint}
                    actionHref="/feed"
                    actionText={es.profile.writePost}
                  />
                ) : (
                  <ProfilePostsClient
                    posts={myPostsOnly}
                    currentUser={currentUser}
                  />
                )}
              </section>
            ) : null}

            {/* ─── Friends tab ─── */}
            {currentTab === "friends" ? (
              <section className="uf-materials-section">
                <div className="uf-card" style={{ padding: 18, marginBottom: 16 }}>
                  <h3 className="uf-overview-section-title" style={{ padding: 0, marginBottom: 12 }}>Social circle</h3>
                  <div className="uf-profile-stats-bar">
                    <div className="uf-stat-item"><span className="uf-stat-value">{friendsList.length}</span><span className="uf-stat-label">Friends</span></div>
                    <div className="uf-stat-item"><span className="uf-stat-value">{followersRows.length}</span><span className="uf-stat-label">Followers</span></div>
                    <div className="uf-stat-item"><span className="uf-stat-value">{followingRows.length}</span><span className="uf-stat-label">Following</span></div>
                  </div>
                  <p style={{ color: "var(--text-secondary)", marginTop: 12, marginBottom: 0 }}>Friends and follows create status and discovery without turning the club into a messenger.</p>
                </div>
                {friendsList.length === 0 ? (
                  <EmptyState
                    icon="users"
                    title="No friends yet"
                    description="Follow classmates and add friends from public profiles."
                    actionHref="/search"
                    actionText="Find students"
                  />
                ) : (
                  <div className="uf-card" style={{ padding: 12, display: "grid", gap: 8 }}>
                    {friendsList.map((friend: { id: string; fullName: string | null; username: string | null; faculty: string | null; image: string | null; avatarUrl: string | null }) => (
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
                <h3 className="uf-overview-section-title" style={{ padding: "0 8px" }}>Albums ({myAlbums.length})</h3>
                {myAlbums.length === 0 ? (
                  <EmptyState
                    icon="image"
                    title="No albums yet"
                    description="Create albums for events, meetups, clubs and student memories."
                    actionHref="/feed"
                    actionText="Share a campus moment"
                  />
                ) : (
                  <div className="uf-photo-grid">
                    {myAlbums.map((album: { id: string; title: string; description: string | null; coverPhotoUrl: string | null }) => (
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

            {/* ─── Saved Photos tab ─── */}
            {currentTab === "saved" ? (
              <section className="uf-materials-section">
                <h3 className="uf-overview-section-title" style={{ padding: "0 8px" }}>Saved Photos ({savedPhotos.length})</h3>
                {savedPhotos.length === 0 ? (
                  <EmptyState
                    icon="bookmark"
                    title="No saved photos yet"
                    description="Save campus moments from the feed and they will stay here in your profile."
                    actionHref="/feed"
                    actionText="Browse feed"
                  />
                ) : (
                  <div className="uf-photo-grid">
                    {savedPhotos.map((photo: { id: string; imageUrl: string; thumbnailUrl: string | null; mediumUrl: string | null; caption: string | null; ownerName: string | null }) => (
                      <div key={photo.id} className="uf-card uf-photo-tile">
                        <div className="uf-photo-thumb">
                          <img src={photo.thumbnailUrl || photo.mediumUrl || photo.imageUrl} alt={photo.caption || `Photo by ${photo.ownerName || "student"}`} />
                        </div>
                        <strong>{photo.caption || "Campus moment"}</strong>
                        <span>{photo.ownerName || "Student"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {/* ─── About tab ─── */}
            {currentTab === "about" ? (
              <section className="uf-about-grid">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="uf-card uf-about-card">
                    <h3>Bio</h3>
                    {safeBio ? (
                      <p className="uf-about-bio" style={{ margin: 0 }}>{safeBio}</p>
                    ) : (
                      <div style={{ textAlign: "center", padding: "16px 0" }}>
                        <p style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
                          {t.profile?.addBioHint || "Tell others about yourself by adding a bio."}
                        </p>
                        <Link href="/profile/edit" className="uf-empty-action-btn" style={{ display: "inline-block" }}>
                          {t.profile?.addBio || "Add bio"}
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="uf-card uf-about-card">
                    <h3>Contact info</h3>
                    <div className="uf-personal-info-list">
                      <div className="uf-info-block">
                        <span>Email</span>
                        <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {safeEmail}
                          <span style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, color: "#64748b" }}>
                            Only visible to you
                          </span>
                        </strong>
                      </div>
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
                </div>

                <div className="uf-card uf-about-card">
                  <h3>Academic info</h3>
                  <div className="uf-personal-info-list">
                    <InfoBlock label="Full name" value={safeName} />
                    <InfoBlock label="Username" value={safeUsername} />
                    <InfoBlock label="Faculty" value={safeFaculty} />
                    {safeYear && <InfoBlock label="Year" value={safeYear} />}
                    {currentUser.studyGroup && <InfoBlock label="Study Group" value={currentUser.studyGroup} />}
                    <InfoBlock label="Joined" value={joinedAt} />
                  </div>
                </div>
              </section>
            ) : null}

          </main>
        </div>
      </div>
    </div>
  );
}
