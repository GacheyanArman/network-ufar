import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { and, desc, eq, or } from "drizzle-orm";
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
  studyMaterials,
} from "@/shared/db/schema";
import { getFacultyLabel } from "@/features/profile/server/utils";
import { getSession } from "@/shared/auth/session";
import { followUser, unfollowUser } from "@/features/profile/server/follow";
import { sendFriendRequest } from "@/features/profile/server/friends";
import PostCard from "@/features/feed/components/PostCard";
import UiIcon from "@/shared/ui/UiIcon";
import BlockButton from "@/features/profile/components/BlockButton";
import ProfileInfo from "@/features/profile/components/ProfileInfo";
import { translations } from "@/shared/i18n/i18n";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

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
  const currentTab = pageParams?.tab || "posts";

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
      year: users.year,
      studyGroup: users.studyGroup,
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

  // ─── Public Approved Uploads ───
  const publicUploads = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      description: studyMaterials.description,
      fileUrl: studyMaterials.fileUrl,
      type: studyMaterials.type,
      course: studyMaterials.course,
      createdAt: studyMaterials.createdAt,
    })
    .from(studyMaterials)
    .where(
      and(
        eq(studyMaterials.ownerId, profileId),
        eq(studyMaterials.status, "approved")
      )
    )
    .orderBy(desc(studyMaterials.createdAt));

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

  const safeName = profileUser.fullName || "Student";
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";
  const safeEmail = profileUser.email || "";
  const safeUsername = profileUser.username ? `@${profileUser.username}` : "@username";
  const safeFaculty = profileUser.faculty ? getFacultyLabel(profileUser.faculty, lang) : "Faculty not specified";
  const rawFaculty = profileUser.faculty || "";
  const safeBio = profileUser.bio || "";
  const avatarImage = profileUser.image || profileUser.avatarUrl || "";

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
    { key: "uploads", label: "Uploads" },
    { key: "about", label: "About" },
  ];

  return (
    <div className="uf-profile-page">
      <style>{profileStyles}</style>
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
              <div className="uf-profile-avatar">
                {avatarImage ? (
                  <Image src={avatarImage} alt={safeName} width={106} height={106} />
                ) : (
                  <span>{safeInitial}</span>
                )}
              </div>

              <div className="uf-profile-heading">
                <h1>{safeName}</h1>
                <p>{safeUsername}</p>
              </div>

              <div className="uf-profile-badges">
                <div className="uf-profile-badge">
                  <span className="uf-inline-icon">
                    <UiIcon name="graduation" size={15} />
                  </span>
                  <strong>{safeFaculty}</strong>
                </div>

                {safeYear ? (
                  <div className="uf-profile-badge">
                    <span className="uf-inline-icon">
                      <UiIcon name="calendar" size={15} />
                    </span>
                    <strong>{safeYear}</strong>
                  </div>
                ) : null}

                {profileUser.studyGroup ? (
                  <div className="uf-profile-badge">
                    <span className="uf-inline-icon">
                      <UiIcon name="group" size={15} />
                    </span>
                    <strong>Group: {profileUser.studyGroup}</strong>
                  </div>
                ) : null}

                <div className="uf-profile-badge uf-profile-badge-subtle">
                  <span className="uf-inline-icon">
                    <UiIcon name="clock" size={15} />
                  </span>
                  <strong>Joined {joinedAt}</strong>
                </div>
              </div>

              {safeBio ? <p className="uf-profile-bio">{safeBio}</p> : null}

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

              <div className="uf-profile-info">
                <ProfileInfo
                  email={safeEmail}
                  isOwn={false}
                />
              </div>

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

                    <Link
                      href={`/messages?user=${profileId}`}
                      className="public-btn public-btn-light"
                    >
                      Message
                    </Link>

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

                    <BlockButton
                      userId={profileId}
                      userName={safeName}
                      isBlocked={isBlocked}
                    />
                  </>
                )}
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
                  <div className="uf-card uf-profile-empty">
                    <h2>{es.profile.noPostsOther}</h2>
                    <p>{es.profile.noPostsOtherHint}</p>
                  </div>
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

            {/* ─── Uploads tab ─── */}
            {currentTab === "uploads" ? (
              <section className="uf-materials-section">
                {publicUploads.length === 0 ? (
                  <div className="uf-card uf-profile-empty">
                    <div className="uf-empty-icon">📤</div>
                    <h2>No uploads yet</h2>
                    <p>This student hasn't shared any study materials yet.</p>
                  </div>
                ) : (
                  <div className="uf-materials-grid">
                    {publicUploads.map((m: any) => (
                      <MaterialCard key={m.id} material={m} ownerName={safeName} />
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
                  <p className="uf-about-bio">{safeBio || es.profile.noBioOther}</p>
                </div>

                <div className="uf-card uf-about-card">
                  <h3>Academic info</h3>
                  <div className="uf-personal-info-list">
                    <InfoBlock label="Full name" value={safeName} />
                    <InfoBlock label="Faculty" value={safeFaculty} />
                    {safeYear && <InfoBlock label="Year" value={safeYear} />}
                    {profileUser.studyGroup && <InfoBlock label="Study Group" value={profileUser.studyGroup} />}
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

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={active ? "uf-tab-link active" : "uf-tab-link"}
    >
      {children}
    </Link>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="uf-info-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

interface MaterialCardProps {
  material: {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string | null;
    type: string | null;
    course: string | null;
    createdAt: Date | null;
  };
  ownerName: string;
}

function MaterialCard({ material, ownerName }: MaterialCardProps) {
  const m = material;
  return (
    <div className="uf-card uf-material-card">
      <div className="uf-material-card-header">
        {m.course ? <span className="uf-material-badge">{m.course}</span> : null}
        <span className="uf-material-type-badge">
          {(m.type || "other").replace(/_/g, " ")}
        </span>
      </div>

      <h3 className="uf-material-title">{m.title}</h3>

      {m.description ? (
        <p className="uf-material-desc">{m.description}</p>
      ) : null}

      <div className="uf-material-footer">
        <span className="uf-material-meta">
          {ownerName || "Student"}
          {" · "}
          {m.createdAt
            ? new Date(m.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
        {m.fileUrl ? (
          <a
            href={m.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="uf-material-download-btn"
          >
            Open
          </a>
        ) : null}
      </div>
    </div>
  );
}

const profileStyles = `
.uf-profile-page {
  width: 100%;
  min-width: 0;
  background: transparent;
}

.uf-profile-shell {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 8px 0 36px;
}

.uf-profile-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.uf-profile-sidebar {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-self: start;
  position: sticky;
  top: calc(var(--topbar-height) + 24px);
}

.uf-profile-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.uf-card {
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.uf-profile-card {
  padding: 28px 22px 24px;
}

.uf-profile-avatar {
  width: 106px;
  height: 106px;
  border-radius: 999px;
  overflow: hidden;
  margin: 0 auto 22px;
  border: 4px solid #ffffff;
  box-shadow: 0 0 0 1px #d9e2ef, 0 8px 24px rgba(15, 23, 42, 0.08);
  background: #0b3aa8;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 900;
}

.uf-profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.uf-profile-heading {
  margin-bottom: 18px;
}

.uf-profile-heading h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.uf-profile-heading p {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 600;
}

.uf-profile-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 18px;
}

.uf-profile-card .uf-inline-icon {
  width: 18px;
  flex: 0 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.uf-profile-badge {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  background: #f4f7fb;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid #e3ebf5;
}

.uf-profile-badge-subtle {
  background: transparent;
  border-color: transparent;
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 13px;
  min-height: 34px;
  padding: 0 12px;
}

.uf-profile-bio {
  margin: 0 0 18px;
  color: #334155;
  font-size: 14px;
  line-height: 1.55;
  word-break: break-word;
}

/* Courses chips */
.uf-profile-courses {
  margin-bottom: 18px;
}

.uf-profile-courses-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.uf-profile-courses-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.uf-course-chip {
  padding: 4px 10px;
  border-radius: 8px;
  background: #eef4ff;
  color: #0b3aa8;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  border: 1px solid rgba(11, 58, 168, 0.12);
  transition: all 0.15s ease;
}

.uf-course-chip:hover {
  background: #0b3aa8;
  color: #ffffff;
}

.uf-profile-info {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 22px;
}

.uf-profile-info-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: #475569;
  text-decoration: none;
  font-size: 13px;
}

.uf-profile-info-row span {
  width: 18px;
  flex: 0 0 18px;
  text-align: center;
}

.uf-profile-info-row p {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-profile-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.public-profile-actions form {
  margin: 0;
}

.public-btn {
  width: 100%;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 10px;
  background: #0b3aa8;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 14px;
  font-weight: 800;
  border: 1px solid #0b3aa8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.public-btn:hover {
  background: #062fae;
}

.public-btn-primary {
  background: #0b3aa8;
  color: #ffffff;
  border-color: #0b3aa8;
}

.public-btn-primary:hover {
  background: #062f8f;
}

.public-btn-secondary {
  background: #ffffff;
  color: #0b3aa8;
  border-color: rgba(11, 58, 168, 0.28);
}

.public-btn-secondary:hover {
  background: #eef4ff;
  color: #0b3aa8;
}

.public-btn-light {
  background: #f8fafc;
  color: #0f172a;
  border-color: #d9e2ef;
}

.public-btn-light:hover {
  background: #eef4ff;
  color: #0b3aa8;
}

.public-btn-danger-outline {
  background: #fff5f5 !important;
  color: #dc2626 !important;
  border-color: rgba(220, 38, 38, 0.28) !important;
}

.public-btn-danger-outline:hover {
  background: #fee2e2 !important;
  color: #b91c1c !important;
  border-color: rgba(220, 38, 38, 0.48) !important;
}

.public-status-pill {
  width: 100%;
  min-height: 42px;
  border-radius: 10px;
  background: #f4f7fb;
  border: 1px solid #e7edf5;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
}

.uf-profile-tabs {
  min-height: 64px;
  padding: 0 22px;
  display: flex;
  align-items: center;
  gap: 26px;
  overflow-x: auto;
}

.uf-tab-link {
  height: 64px;
  display: inline-flex;
  align-items: center;
  color: #536173;
  text-decoration: none;
  font-size: 15px;
  font-weight: 800;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
}

.uf-tab-link.active {
  color: #0b3aa8;
  border-bottom-color: #0b3aa8;
}

.uf-profile-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.uf-profile-empty {
  padding: 54px 22px;
  text-align: center;
}

.uf-profile-empty h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 900;
}

.uf-profile-empty p {
  margin: 0 auto;
  max-width: 420px;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.55;
}

.uf-about-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.uf-about-card {
  padding: 22px;
}

.uf-about-card h3 {
  margin: 0 0 18px;
  color: #0f172a;
  font-size: 17px;
  font-weight: 900;
}

.uf-personal-info-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

@media (max-width: 580px) {
  .uf-personal-info-list {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

.uf-info-block {
  padding: 10px 0;
  border-top: none;
  border-bottom: 1px solid #e7edf5;
}

.uf-info-block:last-child {
  border-bottom: none;
}

.uf-info-block span {
  display: block;
  margin-bottom: 5px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.uf-info-block strong {
  color: #0f172a;
  font-size: 15px;
  word-break: break-word;
}

.uf-about-bio {
  margin: 0;
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
}

.uf-photos-section {
  min-width: 0;
}

.uf-profile-sidebar > * {
  flex: 0 0 auto;
}

@media (max-width: 980px) {
  .uf-profile-layout {
    grid-template-columns: 1fr;
  }

  .uf-about-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .uf-profile-shell {
    padding: 4px 0 24px;
  }

  .uf-profile-tabs {
    padding: 0 16px;
    gap: 20px;
    overflow-x: auto;
  }
}

/* Materials cards */
.uf-materials-section {
  min-width: 0;
}

.uf-materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.uf-material-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
}

.uf-material-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.uf-material-badge {
  padding: 3px 8px;
  border-radius: 6px;
  background: #eef4ff;
  color: #0b3aa8;
  font-size: 11px;
  font-weight: 700;
}

.uf-material-type-badge {
  padding: 3px 8px;
  border-radius: 6px;
  background: #f4f7fb;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.uf-material-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.uf-material-desc {
  margin: 0 0 auto;
  padding-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.uf-material-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #e7edf5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.uf-material-meta {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.uf-material-download-btn {
  padding: 5px 12px;
  border-radius: 6px;
  background: #f4f7fb;
  color: #0b3aa8;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  border: 1px solid #d9e2ef;
  transition: all 0.15s ease;
}

.uf-material-download-btn:hover {
  background: #0b3aa8;
  color: #ffffff;
  border-color: #0b3aa8;
}

.uf-empty-icon {
  font-size: 40px;
  margin-bottom: 16px;
  opacity: 0.7;
}
`;
