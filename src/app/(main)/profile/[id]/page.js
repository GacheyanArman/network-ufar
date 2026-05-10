import Link from "next/link";
import { cookies } from "next/headers";
import { and, count, desc, eq, or } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";

import { db } from "@/lib/db";
import {
  communities,
  friendships,
  photos,
  photoTags,
  posts,
  users,
  blockedUsers,
  userFollows,
} from "@/lib/schema";
import { getFacultyLabel } from "@/lib/profile-utils";
import { getSession } from "@/lib/session";
import { followUser, unfollowUser } from "@/app/actions/follow";
import { sendFriendRequest } from "@/app/actions/friends";
import ProfilePhotoTabs from "@/components/ProfilePhotoTabs";
import PostCard from "@/components/PostCard";
import UiIcon from "@/components/UiIcon";
import BlockButton from "@/components/BlockButton";
import ProfileInfo from "@/components/ProfileInfo";
import ProfileAboutInfo from "@/components/ProfileAboutInfo";
import { translations } from "@/lib/i18n";

export default async function PublicProfilePage({ params, searchParams }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = translations[lang] || translations.en;
  const es = t.emptyStates;

  const routeParams = await params;
  const pageParams = await searchParams;

  const profileId = routeParams?.id?.toString();
  const currentTab = Array.isArray(pageParams?.tab)
    ? pageParams.tab[0]
    : pageParams?.tab || "posts";

  if (!profileId) {
    notFound();
  }

  if (profileId === session.userId) {
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
      gender: users.gender,
      relationshipStatus: users.relationshipStatus,
      birthDate: users.birthDate,
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
    .where(eq(users.id, session.userId))
    .limit(1);

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

  const userPhotos = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      caption: photos.caption,
      ownerId: photos.ownerId,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(and(eq(photos.ownerId, profileId), eq(photos.isPrivate, false)))
    .orderBy(desc(photos.createdAt));

  // Photos where this profile user is approved-tagged.
  const taggedPhotos = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
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
        eq(photoTags.userId, profileId),
        eq(photoTags.status, "approved"),
        eq(photos.isPrivate, false)
      )
    )
    .orderBy(desc(photos.createdAt));

  const [friendsRow] = await db
    .select({ value: count() })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, profileId),
          eq(friendships.receiverId, profileId)
        )
      )
    );

  const [communitiesRow] = await db
    .select({ value: count() })
    .from(communities)
    .where(eq(communities.creatorId, profileId));

  const [followersRow] = await db
    .select({ value: count() })
    .from(userFollows)
    .where(eq(userFollows.followingId, profileId));

  const [followingRow] = await db
    .select({ value: count() })
    .from(userFollows)
    .where(eq(userFollows.followerId, profileId));

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
          eq(friendships.requesterId, session.userId),
          eq(friendships.receiverId, profileId)
        ),
        and(
          eq(friendships.requesterId, profileId),
          eq(friendships.receiverId, session.userId)
        )
      )
    )
    .limit(1);

  const [followRow] = await db
    .select({ id: userFollows.id })
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerId, session.userId),
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
          eq(blockedUsers.blockerId, session.userId),
          eq(blockedUsers.blockedId, profileId)
        ),
        and(
          eq(blockedUsers.blockerId, profileId),
          eq(blockedUsers.blockedId, session.userId)
        )
      )
    )
    .limit(1);

  const isBlocked = blockStatus?.blockerId === session.userId;
  const isBlockedByThem = blockStatus?.blockerId === profileId;

  const safeName = profileUser.fullName || "Student";
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";
  const safeEmail = profileUser.email || "No email provided";
  const safeUsername = profileUser.username ? `@${profileUser.username}` : "@username";
  const safeFaculty = profileUser.faculty ? getFacultyLabel(profileUser.faculty, lang) : "Faculty not specified";
  const rawFaculty = profileUser.faculty || "";
  const safeBio = profileUser.bio || "No bio yet.";
  const avatarImage = profileUser.image || profileUser.avatarUrl || "";

  const friendsCount = Number(friendsRow?.value || 0);
  const communitiesCount = Number(communitiesRow?.value || 0);

  const isFollowing = Boolean(followRow);
  const isFriend = relationship?.status === "accepted";
  const isPendingRequest = relationship?.status === "pending";
  const isIncomingRequest =
    isPendingRequest && relationship?.receiverId === session.userId;

  const joinedAt = profileUser.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  const normalizedPosts = userPosts.map((post) => ({
    ...post,
    authorName: safeName,
    authorImage: avatarImage,
    authorFaculty: rawFaculty,
    likedByMe: false,
  }));

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
                  <img src={avatarImage} alt={safeName} />
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
                  gender={profileUser.gender}
                  relationshipStatus={profileUser.relationshipStatus}
                  birthDate={profileUser.birthDate}
                  friendsCount={friendsCount}
                  followingCount={Number(followingRow?.value || 0)}
                />
              </div>

              <div className="public-profile-actions">
                {isBlockedByThem ? (
                  <div style={{ padding: "12px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                    This user has blocked you
                  </div>
                ) : (
                  <>
                    {isFollowing ? (
                      <form action={unfollowUser}>
                        <input type="hidden" name="targetId" value={profileId} />
                        <button className="public-btn public-btn-secondary" type="submit">
                          Following
                        </button>
                      </form>
                    ) : (
                      <form action={followUser}>
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
                      <form action={sendFriendRequest}>
                        <input type="hidden" name="targetId" value={profileId} />
                        <button className="public-btn public-btn-light" type="submit">
                          Accept request
                        </button>
                      </form>
                    ) : isPendingRequest ? (
                      <span className="public-status-pill">Request sent</span>
                    ) : (
                      <form action={sendFriendRequest}>
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
              <TabLink href={`/profile/${profileId}?tab=posts`} active={currentTab === "posts"}>
                Posts
              </TabLink>

              <TabLink href={`/profile/${profileId}?tab=about`} active={currentTab === "about"}>
                About
              </TabLink>

              <TabLink href={`/profile/${profileId}?tab=photos`} active={currentTab === "photos"}>
                Photos
              </TabLink>

              <TabLink href={`/profile/${profileId}?tab=groups`} active={currentTab === "groups"}>
                Groups
              </TabLink>
            </nav>

            {currentTab === "posts" ? (
              <section className="uf-profile-feed">
                {normalizedPosts.length === 0 ? (
                  <div className="uf-card uf-profile-empty">
                    <h2>{es.profile.noPostsOther}</h2>
                    <p>{es.profile.noPostsOtherHint}</p>
                  </div>
                ) : (
                  normalizedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                    />
                  ))
                )}
              </section>
            ) : null}

            {currentTab === "about" ? (
              <section className="uf-about-grid">
                <div className="uf-card uf-about-card">
                  <h3>Bio</h3>
                  <p className="uf-about-bio">{safeBio || es.profile.noBioOther}</p>
                </div>

                <div className="uf-card uf-about-card">
                  <h3>Personal info</h3>
                  <InfoBlock label="Full name" value={safeName} />
                  <InfoBlock label="Username" value={safeUsername} />
                  <InfoBlock label="Email" value={safeEmail} />
                  <InfoBlock label="Faculty" value={safeFaculty} />
                  <ProfileAboutInfo
                    gender={profileUser.gender}
                    relationshipStatus={profileUser.relationshipStatus}
                  />
                  <InfoBlock label="Joined" value={joinedAt} />
                </div>
              </section>
            ) : null}

            {currentTab === "photos" ? (
              <section className="uf-photos-section">
                <ProfilePhotoTabs
                  isOwner={false}
                  currentUserId={session.userId}
                  photos={userPhotos}
                  tagged={taggedPhotos}
                  saved={[]}
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
  color: #64748b;
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
  color: #64748b;
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

.uf-info-block {
  padding: 14px 0;
  border-top: 1px solid #e7edf5;
}

.uf-info-block span {
  display: block;
  margin-bottom: 5px;
  color: #64748b;
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
`;
