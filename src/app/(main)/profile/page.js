import { db } from "@/lib/db";
import { users, posts, photos, friendships, communities } from "@/lib/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { deletePost } from "@/app/actions/post";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import PostComposer from "@/components/PostComposer";
import PhotoGallery from "@/components/PhotoGallery";

export default async function ProfilePage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const currentTab = params?.tab || "posts";
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
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!currentUser) redirect("/login");

  const userPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
    })
    .from(posts)
    .where(eq(posts.authorId, session.userId))
    .orderBy(desc(posts.createdAt));

  const userPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.ownerId, session.userId))
    .orderBy(desc(photos.createdAt));

  const userFriends = await db
    .select({ id: friendships.id })
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

  const userCommunities = await db
    .select({
      id: communities.id,
      name: communities.name,
    })
    .from(communities)
    .where(eq(communities.ownerId, session.userId));

  const safeName = currentUser.fullName || "Student";
  const safeInitial = safeName.charAt(0).toUpperCase() || "U";
  const safeEmail = currentUser.email || "No email provided";
  const safeUsername = currentUser.username ? `@${currentUser.username}` : "@username";
  const safeFaculty = currentUser.faculty || "Faculty not specified";
  const safeBio = currentUser.bio || "No bio yet.";
  const avatarImage = currentUser.image || "";
  const coverImage = currentUser.coverImage || "";

  const postsCount = userPosts.length;
  const photosCount = userPhotos.length;
  const friendsCount = userFriends.length;
  const communitiesCount = userCommunities.length;

  const joinedAt = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="ot-profile-page">
      <div className="ot-profile-cover">
        {coverImage ? (
          <img
            src={coverImage}
            alt="Profile cover"
            className="ot-profile-cover-img"
          />
        ) : null}
        <div className="ot-profile-cover-overlay" />
      </div>

      <div className="ot-profile-statsbar">
        <div className="ot-profile-statsbar-inner">
          <div className="ot-profile-stats-spacer" />

          <div className="ot-profile-stats-links">
            <Link
              href="?tab=posts"
              scroll={false}
              className={currentTab === "posts" ? "active" : ""}
            >
              <span>POSTS</span>
              <strong>{postsCount}</strong>
            </Link>

            <Link
              href="?tab=photos"
              scroll={false}
              className={currentTab === "photos" ? "active" : ""}
            >
              <span>PHOTOS</span>
              <strong>{photosCount}</strong>
            </Link>

            <Link
              href="?tab=about"
              scroll={false}
              className={currentTab === "about" ? "active" : ""}
            >
              <span>ABOUT</span>
              <strong>Info</strong>
            </Link>

            <div className="ot-profile-stat-box">
              <span>FRIENDS</span>
              <strong>{friendsCount}</strong>
            </div>

            <div className="ot-profile-stat-box">
              <span>GROUPS</span>
              <strong>{communitiesCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="ot-profile-body">
        <aside className="ot-profile-left">
          <div className="ot-profile-avatar-wrap">
            {avatarImage ? (
              <img
                src={avatarImage}
                alt={safeName}
                className="ot-profile-avatar-img"
              />
            ) : (
              <div className="ot-profile-avatar">{safeInitial}</div>
            )}
          </div>

          <div className="ot-profile-userinfo">
            <h1>{safeName}</h1>
            <span>{safeUsername}</span>

            <div className="ot-profile-chip-row">
              <span className="ot-profile-chip">🎓 {safeFaculty}</span>
              <span className="ot-profile-chip">📅 Joined {joinedAt}</span>
            </div>

            <p className="ot-profile-bio">{safeBio}</p>

            <div className="ot-profile-meta">
              <div>✉️ {safeEmail}</div>
              <div>
                👥 {friendsCount} friend{friendsCount === 1 ? "" : "s"}
              </div>
              <div>
                🤝 {communitiesCount} communit
                {communitiesCount === 1 ? "y" : "ies"}
              </div>
              <div>
                🖼️ {photosCount} photo{photosCount === 1 ? "" : "s"}
              </div>
            </div>

            <div className="ot-profile-action-row">
              <Link href="/profile/edit" className="ot-profile-message-btn">
                Edit profile
              </Link>

              <Link href="/messages" className="ot-profile-secondary-btn">
                Messages
              </Link>
            </div>
          </div>

          <div className="ot-profile-side-card">
            <h3 className="ot-profile-side-title">Quick overview</h3>

            <div className="ot-profile-kpi-grid">
              <div className="ot-profile-kpi">
                <strong>{postsCount}</strong>
                <span>Posts</span>
              </div>

              <div className="ot-profile-kpi">
                <strong>{friendsCount}</strong>
                <span>Friends</span>
              </div>

              <div className="ot-profile-kpi">
                <strong>{photosCount}</strong>
                <span>Photos</span>
              </div>

              <div className="ot-profile-kpi">
                <strong>{communitiesCount}</strong>
                <span>Groups</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="ot-profile-center">
          <div className="ot-profile-tabs">
            <Link
              href="?tab=posts"
              scroll={false}
              className={currentTab === "posts" ? "active" : ""}
            >
              Posts
            </Link>

            <Link
              href="?tab=about"
              scroll={false}
              className={currentTab === "about" ? "active" : ""}
            >
              About
            </Link>

            <Link
              href="?tab=photos"
              scroll={false}
              className={currentTab === "photos" ? "active" : ""}
            >
              Photos
            </Link>
          </div>

          {saved && (
            <div className="profile-save-success">
              Profile updated successfully.
            </div>
          )}

          {saved && (
            <div className="profile-save-success">
              Profile updated successfully.
            </div>
          )}

          

          {currentTab === "posts" && (
            <div className="ot-profile-feed">
              <div className="ot-profile-composer-wrap">
                <PostComposer />
              </div>

              {userPosts.length === 0 ? (
                <div className="ot-profile-empty">
                  <h2>No posts yet</h2>
                  <p>
                    Create your first post and share updates, announcements or
                    thoughts.
                  </p>
                </div>
              ) : (
                userPosts.map((post) => (
                  <article key={post.id} className="ot-profile-post">
                    <div className="ot-profile-post-avatar">{safeInitial}</div>

                    <div className="ot-profile-post-content">
                      <div className="ot-profile-post-head">
                        <strong>{safeName}</strong>
                        <span>
                          {new Date(post.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p>{post.content}</p>

                      {post.imageUrl ? (
                        <img
                          src={post.imageUrl}
                          alt="Post attachment"
                          className="ot-profile-post-media"
                        />
                      ) : null}

                      <div className="ot-profile-post-actions">
                        <span>❤️ {post.likesCount}</span>
                        <span>💬 {post.commentsCount}</span>

                        <form action={deletePost}>
                          <input type="hidden" name="postId" value={post.id} />
                          <button type="submit">Delete</button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {currentTab === "about" && (
            <div className="ot-profile-about-grid">
              <div className="ot-profile-side-card">
                <h3 className="ot-profile-side-title">Personal info</h3>

                <div className="ot-profile-about-item">
                  <span>Full name</span>
                  <strong>{safeName}</strong>
                </div>

                <div className="ot-profile-about-item">
                  <span>Username</span>
                  <strong>{safeUsername}</strong>
                </div>

                <div className="ot-profile-about-item">
                  <span>Email</span>
                  <strong>{safeEmail}</strong>
                </div>

                <div className="ot-profile-about-item">
                  <span>Faculty</span>
                  <strong>{safeFaculty}</strong>
                </div>

                <div className="ot-profile-about-item">
                  <span>Joined</span>
                  <strong>{joinedAt}</strong>
                </div>
              </div>

              <div className="ot-profile-side-card">
                <h3 className="ot-profile-side-title">Bio</h3>
                <p className="ot-profile-bio" style={{ marginBottom: 0 }}>
                  {safeBio}
                </p>
              </div>
            </div>
          )}

          {currentTab === "photos" && (
            <div className="ot-profile-photos-wrap">
              {userPhotos.length === 0 ? (
                <div className="ot-profile-empty">
                  <h2>No photos yet</h2>
                  <p>Upload your first photo to make your profile more alive.</p>
                </div>
              ) : (
                <PhotoGallery photos={userPhotos} />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}