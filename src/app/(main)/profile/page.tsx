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

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    saved?: string;
  }>;
}

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
  const currentTab = params?.tab || "posts";
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
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      postType: post.postType || "discussion",
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
  const safeName = currentUser.fullName || "Student";
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";
  const safeEmail = currentUser.email || "";
  const safeUsername = currentUser.username
    ? `@${currentUser.username}`
    : "@username";
  const safeFaculty = currentUser.faculty
    ? getFacultyLabel(currentUser.faculty, lang)
    : "Student";
  const safeBio = currentUser.bio || "";
  const avatarImage = currentUser.image || "";

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
    { key: "posts", label: "My Posts" },
    { key: "saved", label: "Saved Materials" },
    { key: "uploads", label: "My Uploads" },
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
                  <Image
                    src={avatarImage}
                    alt={safeName}
                    width={106}
                    height={106}
                  />
                ) : (
                  <span>{safeInitial}</span>
                )}
              </div>

              <div className="uf-profile-heading">
                <h1>{safeName}</h1>
                <p>{safeUsername}</p>
              </div>

              <div className="uf-profile-info-list">
                <div className="uf-profile-info-item">
                  <span className="uf-inline-icon">
                    <UiIcon name="graduation" size={15} />
                  </span>
                  <span>{safeFaculty}</span>
                </div>

                {safeYear ? (
                  <div className="uf-profile-info-item">
                    <span className="uf-inline-icon">
                      <UiIcon name="calendar" size={15} />
                    </span>
                    <span>{safeYear}</span>
                  </div>
                ) : null}

                {currentUser.studyGroup ? (
                  <div className="uf-profile-info-item">
                    <span className="uf-inline-icon">
                      <UiIcon name="group" size={15} />
                    </span>
                    <span>Group: {currentUser.studyGroup}</span>
                  </div>
                ) : null}

                <div className="uf-profile-info-item subtle">
                  <span className="uf-inline-icon">
                    <UiIcon name="clock" size={15} />
                  </span>
                  <span>Joined {joinedAt}</span>
                </div>
              </div>

              {safeBio ? (
                <p className="uf-profile-bio">{safeBio}</p>
              ) : null}

              {/* Enrolled courses */}
              {enrolledCourses.length > 0 ? (
                <div className="uf-profile-courses">
                  <p className="uf-profile-courses-title">My Courses</p>
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

              <div className="uf-profile-contact-info" style={{ marginBottom: 20 }}>
                {safeEmail ? (
                  <div className="uf-profile-info-item">
                    <span className="uf-inline-icon">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <span>{safeEmail}</span>
                  </div>
                ) : null}
              </div>

              <Link href="/profile/edit" className="uf-profile-edit-btn">
                Edit profile
              </Link>
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
              <div className="uf-card uf-profile-alert">
                Profile updated successfully.
              </div>
            ) : null}

            {/* ─── Posts tab ─── */}
            {currentTab === "posts" ? (
              <section className="uf-profile-feed">
                <div className="uf-card uf-profile-composer">
                  <PostComposer currentUser={currentUser} />
                </div>

                {myPostsOnly.length === 0 ? (
                  <div className="uf-card uf-profile-empty">
                    <h2>{es.profile.noPosts}</h2>
                    <p>{es.profile.noPostsHint}</p>
                    <Link
                      href="/feed"
                      className="btn btn-primary"
                      style={{ marginTop: 12, textDecoration: "none" }}
                    >
                      {es.profile.writePost}
                    </Link>
                  </div>
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
                {savedMaterials.length === 0 ? (
                  <div className="uf-card uf-profile-empty">
                    <div className="uf-empty-icon">📑</div>
                    <h2>No saved materials yet</h2>
                    <p>
                      Bookmark study materials and they will appear here for
                      quick access.
                    </p>
                    <Link
                      href="/study-materials"
                      className="uf-empty-action-btn"
                    >
                      Browse materials
                    </Link>
                  </div>
                ) : (
                  <div className="uf-materials-grid">
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
                {myUploads.length === 0 ? (
                  <div className="uf-card uf-profile-empty">
                    <div className="uf-empty-icon">📤</div>
                    <h2>No uploads yet</h2>
                    <p>
                      Share your lecture notes, summaries, or exam prep files
                      with the community.
                    </p>
                    <Link
                      href="/study-materials"
                      className="uf-empty-action-btn"
                    >
                      Upload material
                    </Link>
                  </div>
                ) : (
                  <div className="uf-materials-grid">
                    {myUploads.map((m: any) => (
                      <MaterialCard key={m.id} material={m} showStatus />
                    ))}
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

// ─── Helper Components ───

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

interface MaterialCardProps {
  material: {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string | null;
    type: string | null;
    course: string | null;
    createdAt: Date | null;
    ownerName?: string | null;
    status?: string | null;
  };
  showStatus?: boolean;
}

function MaterialCard({ material, showStatus }: MaterialCardProps) {
  const m = material;
  const statusColor =
    m.status === "approved"
      ? "#16a34a"
      : m.status === "rejected"
      ? "#dc2626"
      : "#d97706";

  return (
    <div className="uf-card uf-material-card">
      <div className="uf-material-card-header">
        {m.course ? <span className="uf-material-badge">{m.course}</span> : null}
        <span className="uf-material-type-badge">
          {(m.type || "other").replace(/_/g, " ")}
        </span>
        {showStatus && m.status ? (
          <span
            className="uf-material-status-badge"
            style={{ color: statusColor, borderColor: statusColor }}
          >
            {m.status}
          </span>
        ) : null}
      </div>

      <h3 className="uf-material-title">{m.title}</h3>

      {m.description ? (
        <p className="uf-material-desc">{m.description}</p>
      ) : null}

      <div className="uf-material-footer">
        <span className="uf-material-meta">
          {m.ownerName || "You"}
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

// ─── Styles ───

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
  margin-bottom: 22px;
  text-align: left;
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
  font-size: 15px;
  color: var(--text-secondary);
  font-weight: 600;
}

.uf-profile-info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 22px;
}

.uf-profile-info-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #0f172a;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.4;
}

.uf-profile-info-item .uf-inline-icon {
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
}

.uf-profile-info-item.subtle {
  color: var(--text-secondary);
  font-weight: 500;
}

.uf-profile-bio {
  margin: 0 0 22px;
  color: #334155;
  font-size: 14.5px;
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
  color: #475569;
  text-decoration: none;
  font-size: 14px;
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

.uf-profile-edit-btn {
  width: fit-content;
  min-width: 132px;
  height: 42px;
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
}

.uf-profile-edit-btn:hover {
  background: #062fae;
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

.uf-profile-alert {
  padding: 14px 18px;
  color: #166534;
  background: #f0fdf4;
  border-color: #ccebd5;
  font-size: 14px;
  font-weight: 700;
}

.uf-profile-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.uf-profile-composer {
  overflow: hidden;
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

.uf-empty-icon {
  font-size: 40px;
  margin-bottom: 16px;
  opacity: 0.7;
}

.uf-empty-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  padding: 10px 22px;
  border-radius: 10px;
  background: #0b3aa8;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  transition: background 0.2s ease;
}

.uf-empty-action-btn:hover {
  background: #062fae;
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

.uf-material-status-badge {
  padding: 3px 8px;
  border-radius: 6px;
  background: transparent;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid;
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

/* Settings */
.uf-settings-section {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Sidebar sticky children */
.uf-profile-sidebar > * {
  flex: 0 0 auto;
}

@media (max-width: 980px) {
  .uf-profile-layout {
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
`;
