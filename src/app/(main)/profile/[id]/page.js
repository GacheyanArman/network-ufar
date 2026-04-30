import Link from "next/link";
import { and, count, desc, eq, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  communities,
  friendships,
  photos,
  posts,
  userFollows,
  users,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { followUser, unfollowUser } from "@/app/actions/follow";
import { sendFriendRequest } from "@/app/actions/friends";
import PhotoGallery from "@/components/PhotoGallery";
import PostCard from "@/components/PostCard";

export default async function PublicProfilePage({ params, searchParams }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

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
      authorId: posts.authorId,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
    })
    .from(posts)
    .where(eq(posts.authorId, profileId))
    .orderBy(desc(posts.createdAt));

  const userPhotos = await db
    .select()
    .from(photos)
    .where(and(eq(photos.ownerId, profileId), eq(photos.isPrivate, false)))
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

  const safeName = profileUser.fullName || "Student";
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";
  const safeEmail = profileUser.email || "No email provided";
  const safeUsername = profileUser.username ? `@${profileUser.username}` : "@username";
  const safeFaculty = profileUser.faculty || "Faculty not specified";
  const safeBio = profileUser.bio || "No bio yet.";
  const avatarImage = profileUser.image || profileUser.avatarUrl || "";

  const postsCount = userPosts.length;
  const photosCount = userPhotos.length;
  const friendsCount = Number(friendsRow?.value || 0);
  const communitiesCount = Number(communitiesRow?.value || 0);
  const followersCount = Number(followersRow?.value || 0);
  const followingCount = Number(followingRow?.value || 0);

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
    authorFaculty: safeFaculty,
    likedByMe: false,
  }));

  return (
    <div className="public-profile-page">
      <style>{publicProfileStyles}</style>

      <div className="public-profile-layout">
        <aside className="public-profile-sidebar">
          <section className="public-card public-profile-card">
            <div className="public-profile-avatar">
              {avatarImage ? (
                <img src={avatarImage} alt={safeName} />
              ) : (
                <span>{safeInitial}</span>
              )}
            </div>

            <div className="public-profile-title">
              <h1>{safeName}</h1>
              <p>{safeUsername}</p>
            </div>

            <div className="public-profile-badges">
              <span>🎓 {safeFaculty}</span>
              <span>🗓️ Joined {joinedAt}</span>
            </div>

            <p className="public-profile-bio">{safeBio}</p>

            <div className="public-profile-info">
              <div>
                <span>✉️</span>
                <p>{safeEmail}</p>
              </div>

              <div>
                <span>👥</span>
                <p>{friendsCount} friends</p>
              </div>

              <div>
                <span>🤝</span>
                <p>{communitiesCount} communities</p>
              </div>

              <div>
                <span>🖼️</span>
                <p>{photosCount} public photos</p>
              </div>
            </div>

            <div className="public-profile-actions">
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
            </div>
          </section>

          <section className="public-card public-stats-card">
            <StatRow label="Posts" value={postsCount} href="?tab=posts" />
            <StatRow label="Friends" value={friendsCount} href="/friends" />
            <StatRow label="Photos" value={photosCount} href="?tab=photos" />
            <StatRow label="Groups" value={communitiesCount} href="/communities" />
            <StatRow label="Followers" value={followersCount} />
            <StatRow label="Following" value={followingCount} />
          </section>
        </aside>

        <main className="public-profile-main">
          <nav className="public-card public-tabs">
            <TabLink href="?tab=posts" active={currentTab === "posts"}>
              Posts
            </TabLink>

            <TabLink href="?tab=about" active={currentTab === "about"}>
              About
            </TabLink>

            <TabLink href="?tab=photos" active={currentTab === "photos"}>
              Photos
            </TabLink>
          </nav>

          {currentTab === "posts" ? (
            <section className="public-feed-card public-card">
              {normalizedPosts.length === 0 ? (
                <div className="public-empty">
                  <div className="public-empty-icon">📝</div>
                  <h2>No posts yet</h2>
                  <p>This student has not posted anything yet.</p>
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
            <section className="public-about-grid">
              <div className="public-card public-about-card">
                <h3>Personal info</h3>

                <InfoBlock label="Full name" value={safeName} />
                <InfoBlock label="Username" value={safeUsername} />
                <InfoBlock label="Email" value={safeEmail} />
                <InfoBlock label="Faculty" value={safeFaculty} />
                <InfoBlock label="Joined" value={joinedAt} />
              </div>

              <div className="public-card public-about-card">
                <h3>Bio</h3>
                <p className="public-about-bio">{safeBio}</p>
              </div>
            </section>
          ) : null}

          {currentTab === "photos" ? (
            <section className="public-card public-photos-card">
              {userPhotos.length === 0 ? (
                <div className="public-empty">
                  <div className="public-empty-icon">🖼️</div>
                  <h2>No public photos yet</h2>
                  <p>This student has not shared public photos yet.</p>
                </div>
              ) : (
                <PhotoGallery photos={userPhotos} />
              )}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function StatRow({ label, value, href }) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );

  if (!href) {
    return <div className="public-stat-row">{content}</div>;
  }

  return (
    <Link href={href} scroll={false} className="public-stat-row">
      {content}
    </Link>
  );
}

function TabLink({ href, active, children }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={active ? "public-tab active" : "public-tab"}
    >
      {children}
    </Link>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="public-info-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const publicProfileStyles = `
.public-profile-page {
  width: 100%;
  min-width: 0;
}

.public-profile-layout {
  width: 100%;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.public-profile-sidebar {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.public-profile-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.public-card {
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.public-profile-card {
  padding: 26px 22px 22px;
}

.public-profile-avatar {
  width: 108px;
  height: 108px;
  margin: 0 auto 20px;
  border-radius: 999px;
  overflow: hidden;
  background: #0b3aa8;
  color: #ffffff;
  border: 4px solid #ffffff;
  box-shadow: 0 0 0 1px #d9e2ef, 0 8px 24px rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  font-weight: 900;
}

.public-profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.public-profile-title {
  margin-bottom: 16px;
}

.public-profile-title h1 {
  margin: 0;
  color: #0f172a;
  font-size: 26px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: -0.035em;
}

.public-profile-title p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
}

.public-profile-badges {
  display: flex;
  flex-direction: column;
  gap: 9px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.public-profile-badges span {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  background: #f4f7fb;
  border: 1px solid #e7edf5;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 800;
}

.public-profile-bio {
  margin: 0 0 18px;
  color: #334155;
  font-size: 14px;
  line-height: 1.55;
  word-break: break-word;
}

.public-profile-info {
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin-bottom: 20px;
}

.public-profile-info div {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475569;
  font-size: 14px;
}

.public-profile-info span {
  width: 18px;
  flex: 0 0 18px;
  text-align: center;
}

.public-profile-info p {
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
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid #d9e2ef;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 14px;
  font-weight: 850;
  cursor: pointer;
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

.public-btn-light {
  background: #f8fafc;
  color: #0f172a;
}

.public-btn-light:hover,
.public-btn-secondary:hover {
  background: #eef4ff;
  color: #0b3aa8;
}

.public-status-pill {
  width: 100%;
  min-height: 38px;
  border-radius: 10px;
  background: #f4f7fb;
  border: 1px solid #e7edf5;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 850;
}

.public-stats-card {
  padding: 16px 18px;
}

.public-stat-row {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  text-decoration: none;
  color: #475569;
  font-size: 14px;
  font-weight: 750;
}

.public-stat-row + .public-stat-row {
  margin-top: 8px;
}

.public-stat-row strong {
  color: #0b3aa8;
  font-size: 16px;
  font-weight: 900;
}

.public-tabs {
  min-height: 64px;
  padding: 0 22px;
  display: flex;
  align-items: center;
  gap: 28px;
}

.public-tab {
  height: 64px;
  display: inline-flex;
  align-items: center;
  color: #536173;
  text-decoration: none;
  font-size: 15px;
  font-weight: 850;
  border-bottom: 3px solid transparent;
}

.public-tab.active {
  color: #0b3aa8;
  border-bottom-color: #0b3aa8;
}

.public-feed-card {
  overflow: hidden;
}

.public-empty {
  padding: 58px 22px;
  text-align: center;
}

.public-empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 999px;
  background: #eef4ff;
  color: #0b3aa8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.public-empty h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 21px;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.public-empty p {
  margin: 0 auto;
  max-width: 420px;
  color: #64748b;
  font-size: 15px;
  line-height: 1.55;
}

.public-about-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.public-about-card {
  padding: 22px;
}

.public-about-card h3 {
  margin: 0 0 18px;
  color: #0f172a;
  font-size: 17px;
  font-weight: 900;
}

.public-info-block {
  padding: 14px 0;
  border-top: 1px solid #e7edf5;
}

.public-info-block span {
  display: block;
  margin-bottom: 5px;
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.public-info-block strong {
  color: #0f172a;
  font-size: 15px;
  word-break: break-word;
}

.public-about-bio {
  margin: 0;
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
}

.public-photos-card {
  padding: 16px;
  overflow: hidden;
}

@media (max-width: 980px) {
  .public-profile-layout {
    grid-template-columns: 1fr;
  }

  .public-about-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .public-tabs {
    padding: 0 16px;
    gap: 22px;
    overflow-x: auto;
  }

  .public-profile-card {
    padding: 22px 18px;
  }
}
`;