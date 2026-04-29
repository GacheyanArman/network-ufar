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
import UiIcon from "@/components/UiIcon";

export default async function PublicProfilePage({ params, searchParams }) {
    const session = await getSession();
    if (!session?.userId) redirect("/login");

    const routeParams = await params;
    const pageParams = await searchParams;

    const profileId = routeParams?.id?.toString();
    const currentTab = pageParams?.tab || "posts";

    if (!profileId) notFound();

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

    if (!profileUser) notFound();

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

    let isFollowing = false;

    try {
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

        isFollowing = Boolean(followRow);
    } catch {
        isFollowing = false;
    }

    const safeName = profileUser.fullName || "Student";
    const safeInitial = safeName.charAt(0).toUpperCase() || "U";
    const safeEmail = profileUser.email || "No email provided";
    const safeUsername = profileUser.username ? `@${profileUser.username}` : "@username";
    const safeFaculty = profileUser.faculty || "Faculty not specified";
    const safeBio = profileUser.bio || "No bio yet.";
    const avatarImage = profileUser.image || profileUser.avatarUrl || "";
    const coverImage = profileUser.coverImage || "";

    const postsCount = userPosts.length;
    const photosCount = userPhotos.length;
    const friendsCount = Number(friendsRow?.value || 0);
    const communitiesCount = Number(communitiesRow?.value || 0);

    const joinedAt = profileUser.createdAt
        ? new Date(profileUser.createdAt).toLocaleDateString("en-US", {
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
                            href={`/profile/${profileId}?tab=posts`}
                            scroll={false}
                            className={currentTab === "posts" ? "active" : ""}
                        >
                            <span>POSTS</span>
                            <strong>{postsCount}</strong>
                        </Link>

                        <Link
                            href={`/profile/${profileId}?tab=photos`}
                            scroll={false}
                            className={currentTab === "photos" ? "active" : ""}
                        >
                            <span>PHOTOS</span>
                            <strong>{photosCount}</strong>
                        </Link>

                        <Link
                            href={`/profile/${profileId}?tab=about`}
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
                            <div><UiIcon name="mail" className="meta-icon" /> {safeEmail}</div>
                            <div><UiIcon name="users" className="meta-icon" /> {friendsCount} friend{friendsCount === 1 ? "" : "s"}</div>
                            <div><UiIcon name="group" className="meta-icon" /> {communitiesCount} communit{communitiesCount === 1 ? "y" : "ies"}</div>
                            <div><UiIcon name="image" className="meta-icon" /> {photosCount} photo{photosCount === 1 ? "" : "s"}</div>
                        </div>

                        <div className="ot-profile-action-row">
                            {isFollowing ? (
                                <form action={unfollowUser}>
                                    <input type="hidden" name="targetId" value={profileId} />
                                    <button className="ot-profile-secondary-btn" type="submit">
                                        Following
                                    </button>
                                </form>
                            ) : (
                                <form action={followUser}>
                                    <input type="hidden" name="targetId" value={profileId} />
                                    <button className="ot-profile-message-btn" type="submit">
                                        Follow
                                    </button>
                                </form>
                            )}

                            <Link
                                href={`/messages?user=${profileId}`}
                                className="ot-profile-secondary-btn"
                            >
                                Message
                            </Link>

                            {!relationship ? (
                                <form action={sendFriendRequest}>
                                    <input type="hidden" name="targetId" value={profileId} />
                                    <button className="ot-profile-secondary-btn" type="submit">
                                        Add friend
                                    </button>
                                </form>
                            ) : (
                                <span className="ot-profile-secondary-btn">
                                    {relationship.status === "accepted" ? "Friends" : "Request sent"}
                                </span>
                            )}
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
                            href={`/profile/${profileId}?tab=posts`}
                            scroll={false}
                            className={currentTab === "posts" ? "active" : ""}
                        >
                            Posts
                        </Link>

                        <Link
                            href={`/profile/${profileId}?tab=about`}
                            scroll={false}
                            className={currentTab === "about" ? "active" : ""}
                        >
                            About
                        </Link>

                        <Link
                            href={`/profile/${profileId}?tab=photos`}
                            scroll={false}
                            className={currentTab === "photos" ? "active" : ""}
                        >
                            Photos
                        </Link>
                    </div>

                    {currentTab === "posts" && (
                        <div className="ot-profile-feed">
                            {userPosts.length === 0 ? (
                                <div className="ot-profile-empty">
                                    <h2>No posts yet</h2>
                                    <p>This student has not posted anything yet.</p>
                                </div>
                            ) : (
                                userPosts.map((post) => (
                                    <article key={post.id} className="ot-profile-post">
                                        <div className="ot-profile-post-avatar">
                                            {avatarImage ? (
                                                <img
                                                    src={avatarImage}
                                                    alt={safeName}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            ) : (
                                                safeInitial
                                            )}
                                        </div>

                                        <div className="ot-profile-post-content">
                                            <div className="ot-profile-post-head">
                                                <strong>{safeName}</strong>
                                                <span>{new Date(post.createdAt).toLocaleString()}</span>
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
                                    <h2>No public photos yet</h2>
                                    <p>This student has not shared public photos yet.</p>
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