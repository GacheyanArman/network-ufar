import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/shared/db/db";
import { getSession } from "@/shared/auth/session";
import {
  users,
  posts,
  studyMaterials,
  studyMaterialSaves,
  courseEnrollments,
  courses,
  semesters,
  notificationPreferences,
} from "@/shared/db/schema";
import PostComposer from "@/features/feed/components/PostComposer";
import ProfilePostsClient from "@/features/profile/components/ProfilePostsClient";
import UiIcon from "@/shared/ui/UiIcon";
import { getFacultyLabel } from "@/features/profile/server/utils";
import { translations } from "@/shared/i18n/i18n";
import ProfileSettingsClient from "@/features/profile/components/ProfileSettingsClient";

import "@/features/profile/profile.css";
import {
  TabLink,
  InfoBlock,
  MaterialCard,
  EmptyState,
  ProfileCompleteness,
} from "@/features/profile/components/SharedProfileComponents";
import PostCard from "@/features/feed/components/PostCard";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    saved?: string;
  }>;
}

const ALLOWED_TABS = ["posts", "saved", "uploads", "about", "overview"];

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
      createdAt: users.createdAt,
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
      likedByMe: false,
    };
  });

  // ─── My Posts ───
  const myPostsOnly = serializedPosts.filter((p: any) => p.postType !== "question");

  // ─── Saved Materials ───
  const savedMaterials = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      description: studyMaterials.description,
      fileUrl: studyMaterials.fileUrl,
      type: studyMaterials.type,
      course: studyMaterials.course,
      createdAt: studyMaterials.createdAt,
      ownerName: users.fullName,
    })
    .from(studyMaterialSaves)
    .innerJoin(
      studyMaterials,
      eq(studyMaterialSaves.materialId, studyMaterials.id)
    )
    .innerJoin(users, eq(studyMaterials.ownerId, users.id))
    .where(eq(studyMaterialSaves.userId, currentUserId))
    .orderBy(desc(studyMaterialSaves.createdAt));

  // ─── My Uploads ───
  const myUploads = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      description: studyMaterials.description,
      fileUrl: studyMaterials.fileUrl,
      type: studyMaterials.type,
      course: studyMaterials.course,
      status: studyMaterials.status,
      downloadsCount: studyMaterials.downloadsCount,
      createdAt: studyMaterials.createdAt,
    })
    .from(studyMaterials)
    .where(eq(studyMaterials.ownerId, currentUserId))
    .orderBy(desc(studyMaterials.createdAt));

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

  const TABS = [
    { key: "posts", label: t.profile?.myPosts || "My Posts" },
    { key: "saved", label: t.profile?.savedMaterials || "Saved Materials" },
    { key: "uploads", label: t.profile?.myUploads || "My Uploads" },
    { key: "about", label: t.profile?.about || "About" },
    { key: "overview", label: t.profile?.overview || "Overview" },
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

            {/* ─── Overview tab ─── */}
            {currentTab === "overview" ? (
              <div className="uf-overview-grid">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <ProfileCompleteness user={currentUser} coursesCount={enrolledCourses.length} />
                  
                  <div className="uf-profile-stats-bar">
                    <div className="uf-stat-item">
                      <span className="uf-stat-value">{myPostsOnly.length}</span>
                      <span className="uf-stat-label">Posts</span>
                    </div>
                    <div className="uf-stat-item">
                      <span className="uf-stat-value">{myUploads.length}</span>
                      <span className="uf-stat-label">Uploads</span>
                    </div>
                    <div className="uf-stat-item">
                      <span className="uf-stat-value">{savedMaterials.length}</span>
                      <span className="uf-stat-label">Saved</span>
                    </div>
                    <div className="uf-stat-item">
                      <span className="uf-stat-value">{enrolledCourses.length}</span>
                      <span className="uf-stat-label">Courses</span>
                    </div>
                  </div>
                </div>

                <div className="uf-overview-section">
                  <h3 className="uf-overview-section-title">Recent Posts</h3>
                  {myPostsOnly.length === 0 ? (
                    <div className="uf-card" style={{ padding: 16, textAlign: "center", color: "var(--text-secondary)" }}>
                      No posts yet
                    </div>
                  ) : (
                    myPostsOnly.slice(0, 2).map((post: any) => (
                      <PostCard
                        key={post.id}
                        post={{
                          ...post,
                          repostsCount: 0,
                          viewsCount: 0,
                          comments: [],
                          communityName: null,
                        }}
                        currentUser={currentUser}
                      />
                    ))
                  )}
                </div>
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

            {/* ─── Saved Materials tab ─── */}
            {currentTab === "saved" ? (
              <section className="uf-materials-section">
                <h3 className="uf-overview-section-title" style={{ padding: "0 8px" }}>
                  Saved Materials ({savedMaterials.length})
                </h3>
                {savedMaterials.length === 0 ? (
                  <EmptyState
                    icon="bookmark"
                    title={t.profile?.noSavedMaterials || "No saved materials yet"}
                    description="Bookmark study materials and they will appear here for quick access."
                    actionHref="/study-materials"
                    actionText={t.profile?.browseMaterials || "Browse materials"}
                  />
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    {savedMaterials.map((m: any) => (
                      <MaterialCard key={m.id} material={m} />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {/* ─── My Uploads tab ─── */}
            {currentTab === "uploads" ? (
              <section className="uf-materials-section">
                <h3 className="uf-overview-section-title" style={{ padding: "0 8px" }}>
                  My Uploads ({myUploads.length})
                </h3>
                {myUploads.length === 0 ? (
                  <EmptyState
                    icon="upload"
                    title={t.profile?.noUploads || "No uploads yet"}
                    description="Share your lecture notes, summaries, or exam prep files with the community."
                    actionHref="/study-materials"
                    actionText={t.profile?.uploadMaterial || "Upload material"}
                  />
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    {myUploads.map((m: any) => (
                      <MaterialCard key={m.id} material={m} showStatus />
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
