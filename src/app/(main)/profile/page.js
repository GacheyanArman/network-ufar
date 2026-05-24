import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, or, count } from "drizzle-orm";

import { db } from "@/shared/db/db";
import { getSession } from "@/shared/auth/session";
import { users, posts, photos, photoTags, photoSaves, friendships, communities, userFollows } from "@/shared/db/schema";
import { deletePost } from "@/features/feed/server/actions";
import PostComposer from "@/features/feed/components/PostComposer";
import ProfilePostsClient from "@/features/profile/components/ProfilePostsClient";
import ProfilePhotoTabs from "@/features/profile/components/ProfilePhotoTabs";
import UiIcon from "@/shared/ui/UiIcon";
import ProfileInfo from "@/features/profile/components/ProfileInfo";
import ProfileAboutInfo from "@/features/profile/components/ProfileAboutInfo";
import { getFacultyLabel } from "@/features/profile/server/utils";
import { translations } from "@/shared/i18n/i18n";

export default async function ProfilePage({ searchParams }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = translations[lang] || translations.en;
  const es = t.emptyStates;

  const params = await searchParams;
  const currentTab = Array.isArray(params?.tab)
    ? params.tab[0]
    : params?.tab || "posts";

  const saved = params?.saved === "1";

  const [currentUser] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      username: users.username,
      faculty: users.faculty,
      bio: users.bio,
      image: users.image,
      coverImage: users.coverImage,
      year: users.year,
      studyGroup: users.studyGroup,
      interests: users.interests,
      languages: users.languages,
      lookingFor: users.lookingFor,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

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
    .where(eq(posts.authorId, session.userId))
    .orderBy(desc(posts.createdAt));

  // Serialize posts for client component
  const serializedPosts = userPosts.map((post) => {
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
      mediaType,
      createdAt: post.createdAt
        ? post.createdAt.toISOString()
        : new Date().toISOString(),
      authorId: post.authorId,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
    };
  });

  const userPhotos = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      thumbnailUrl: photos.thumbnailUrl,
      mediumUrl: photos.mediumUrl,
      width: photos.width,
      height: photos.height,
      caption: photos.caption,
      ownerId: photos.ownerId,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(eq(photos.ownerId, session.userId))
    .orderBy(desc(photos.createdAt));

  const taggedPhotos = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      thumbnailUrl: photos.thumbnailUrl,
      mediumUrl: photos.mediumUrl,
      width: photos.width,
      height: photos.height,
      caption: photos.caption,
      ownerId: photos.ownerId,
      ownerName: users.fullName,
      ownerImage: users.image,
      createdAt: photos.createdAt,
    })
    .from(photoTags)
    .innerJoin(photos, eq(photoTags.photoId, photos.id))
    .innerJoin(users, eq(photos.ownerId, users.id))
    .where(
      and(
        eq(photoTags.userId, session.userId),
        eq(photoTags.status, "approved")
      )
    )
    .orderBy(desc(photos.createdAt));

  const savedPhotos = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      caption: photos.caption,
      ownerId: photos.ownerId,
      ownerName: users.fullName,
      ownerImage: users.image,
      createdAt: photos.createdAt,
    })
    .from(photoSaves)
    .innerJoin(photos, eq(photoSaves.photoId, photos.id))
    .innerJoin(users, eq(photos.ownerId, users.id))
    .where(eq(photoSaves.userId, session.userId))
    .orderBy(desc(photoSaves.createdAt));

  const [friendsRow] = await db
    .select({ value: count() })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, session.userId),
          eq(friendships.receiverId, session.userId)
        )
      )
    );

  const [communitiesRow] = await db
    .select({ value: count() })
    .from(communities)
    .where(eq(communities.creatorId, session.userId));

  const [followingRow] = await db
    .select({ value: count() })
    .from(userFollows)
    .where(eq(userFollows.followerId, session.userId));

  const safeName = currentUser.fullName || "Student";
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";
  const safeEmail = currentUser.email || "";
  const safeUsername = currentUser.username
    ? `@${currentUser.username}`
    : "@username";
  const safeFaculty = currentUser.faculty ? getFacultyLabel(currentUser.faculty, lang) : "Student";
  const safeBio = currentUser.bio || "";
  const avatarImage = currentUser.image || "";

  const postsCount = serializedPosts.length;
  const photosCount = userPhotos.length;
  const friendsCount = Number(friendsRow?.value || 0);
  const communitiesCount = Number(communitiesRow?.value || 0);
  const followingCount = Number(followingRow?.value || 0);

  const joinedAt = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    : "Recently";

  return (
    <div className="uf-profile-page">
      <style>{profileStyles}</style>
      <style>{`
        /* Hide right sidebar only on profile page */
        .uf-profile-page ~ .sidebar-right,
        body:has(.uf-profile-page) .sidebar-right {
          display: none !important;
        }

        /* Adjust grid layout when on profile page */
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

                <div className="uf-profile-badge">
                  <span className="uf-inline-icon">
                    <UiIcon name="calendar" size={15} />
                  </span>
                  <strong>Joined {joinedAt}</strong>
                </div>
              </div>

              {safeBio ? <p className="uf-profile-bio">{safeBio}</p> : null}

              <div className="uf-profile-info">
                <ProfileInfo
                  email={safeEmail}
                  friendsCount={friendsCount}
                  followingCount={followingCount}
                />
              </div>

              <Link href="/profile/edit" className="uf-profile-edit-btn">
                Edit profile
              </Link>
            </section>
          </aside>

          <main className="uf-profile-main">
            <nav className="uf-card uf-profile-tabs">
              <TabLink href="/profile?tab=posts" active={currentTab === "posts"}>
                Posts
              </TabLink>

              <TabLink href="/profile?tab=about" active={currentTab === "about"}>
                About
              </TabLink>

              <TabLink href="/profile?tab=photos" active={currentTab === "photos"}>
                Photos
              </TabLink>

              <TabLink href="/profile?tab=groups" active={currentTab === "groups"}>
                Groups
              </TabLink>
            </nav>

            {saved ? (
              <div className="uf-card uf-profile-alert">
                Profile updated successfully.
              </div>
            ) : null}

            {currentTab === "posts" ? (
              <section className="uf-profile-feed">
                <div className="uf-card uf-profile-composer">
                  <PostComposer currentUser={currentUser} />
                </div>

                {serializedPosts.length === 0 ? (
                  <div className="uf-card uf-profile-empty">
                    <h2>{es.profile.noPosts}</h2>
                    <p>{es.profile.noPostsHint}</p>
                    <Link href="/?compose=1" className="btn btn-primary" style={{ marginTop: 12, textDecoration: "none" }}>
                      {es.profile.writePost}
                    </Link>
                  </div>
                ) : (
                  <ProfilePostsClient posts={serializedPosts} currentUser={currentUser} />
                )}
              </section>
            ) : null}

            {currentTab === "about" ? (
              <section className="uf-about-grid">
                <div className="uf-card uf-about-card">
                  <h3>Bio</h3>
                  {!safeBio ? (
                    <div>
                      <p className="uf-about-bio">{es.profile.noBio}</p>
                      <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>{es.profile.noBioHint}</p>
                      <Link href="/profile/edit" className="btn btn-secondary" style={{ marginTop: 8, textDecoration: "none", fontSize: "0.85rem" }}>
                        {es.profile.addBio}
                      </Link>
                    </div>
                  ) : (
                    <p className="uf-about-bio">{safeBio}</p>
                  )}
                </div>

                <div className="uf-card uf-about-card">
                  <h3>Personal info</h3>
                  <InfoBlock label="Full name" value={safeName} />
                  <InfoBlock label="Username" value={safeUsername} />
                  <InfoBlock label="Email" value={safeEmail || "No email"} />
                  <InfoBlock label="Faculty" value={safeFaculty} />
                  {currentUser.year && <InfoBlock label="Year" value={currentUser.year} />}
                  {currentUser.studyGroup && <InfoBlock label="Study Group" value={currentUser.studyGroup} />}
                  {currentUser.languages && <InfoBlock label="Languages" value={currentUser.languages} />}
                  {currentUser.interests && <InfoBlock label="Interests" value={currentUser.interests} />}
                  {currentUser.lookingFor && <InfoBlock label="Looking For" value={currentUser.lookingFor} />}
                  <InfoBlock label="Joined" value={joinedAt} />
                </div>
              </section>
            ) : null}

            {currentTab === "photos" ? (
              <section className="uf-photos-section">
                <ProfilePhotoTabs
                  isOwner={true}
                  currentUserId={session.userId}
                  photos={userPhotos}
                  tagged={taggedPhotos}
                  saved={savedPhotos}
                />
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function StatRow({ href, label, value }) {
  return (
    <Link href={href} scroll={false} className="uf-stat-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </Link>
  );
}

function TabLink({ href, active, children }) {
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

function InfoBlock({ label, value }) {
  return (
    <div className="uf-info-block">
      <span>{label}</span>
      <strong>{value}</strong>
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

.uf-profile-badge {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: #f4f7fb;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  border: 1px solid #e3ebf5;
}

.uf-profile-bio {
  margin: 0 0 18px;
  color: #334155;
  font-size: 14px;
  line-height: 1.55;
  word-break: break-word;
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

.uf-profile-info-row:hover p {
  color: #0b3aa8;
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

.uf-profile-stats-card {
  padding: 18px 18px 16px;
}

.uf-stat-row {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  text-decoration: none;
  color: #475569;
  border-radius: 10px;
  padding: 0 2px;
  font-size: 15px;
  font-weight: 700;
}

.uf-stat-row + .uf-stat-row {
  margin-top: 8px;
}

.uf-stat-row:hover {
  color: #0b3aa8;
}

.uf-stat-row strong {
  color: #0b3aa8;
  font-size: 16px;
  font-weight: 900;
}

.uf-profile-tabs {
  min-height: 64px;
  padding: 0 22px;
  display: flex;
  align-items: center;
  gap: 26px;
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

.uf-post-card {
  overflow: hidden;
  padding: 0;
}

.uf-post-header {
  padding: 20px 22px 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.uf-post-author {
  min-width: 0;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.uf-post-avatar {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  overflow: hidden;
  background: #0b3aa8;
  color: #ffffff;
  flex: 0 0 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.uf-post-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uf-post-author-meta {
  min-width: 0;
}

.uf-post-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.uf-post-name-row strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 900;
}

.uf-post-name-row span {
  color: var(--text-secondary);
  font-size: 14px;
}

.uf-post-author-meta time {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.uf-post-delete-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 999px;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.uf-post-delete-btn:hover {
  background: #f4f7fb;
  color: #0b3aa8;
}

.uf-post-text {
  margin: 18px 22px 0;
  color: #0f172a;
  font-size: 15.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.uf-post-image {
  width: calc(100% - 44px);
  display: block;
  margin: 18px 22px 0;
  border-radius: 14px;
  border: 1px solid #d9e2ef;
  max-height: 560px;
  object-fit: cover;
  background: #f8fafc;
}

.uf-post-actions {
  margin-top: 20px;
  min-height: 58px;
  padding: 0 18px;
  border-top: 1px solid #e7edf5;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-items: center;
  gap: 6px;
}

.uf-action-item {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 700;
}

.uf-action-icon {
  font-size: 18px;
  line-height: 1;
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

.uf-info-block {
  padding: 14px 0;
  border-top: 1px solid #e7edf5;
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

/* Главное: чтобы слева карточки не тянулись до низа и не касались края */
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

  .uf-post-header {
    padding-left: 16px;
    padding-right: 16px;
  }

  .uf-post-text {
    margin-left: 16px;
    margin-right: 16px;
  }

  .uf-post-image {
    width: calc(100% - 32px);
    margin-left: 16px;
    margin-right: 16px;
  }

  .uf-post-actions {
    padding: 0 8px;
  }
}
`;