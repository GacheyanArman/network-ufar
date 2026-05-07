import Link from "next/link";
import { and, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { friendships, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import {
  acceptRequest,
  rejectRequest,
  sendFriendRequest,
  unfriend,
} from "@/app/actions/friends";
import { followUser, unfollowUser } from "@/app/actions/follow";
import {
  getFollowingSummary,
  getPeopleYouMayKnow,
} from "@/lib/social";

function avatar(user) {
  return (
    <div
      style={{
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #0b3aa8 0%, #062fae 100%)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2rem",
        fontWeight: "900",
        marginBottom: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(11, 58, 168, 0.16)",
      }}
    >
      {user.image || user.avatarUrl ? (
        <img
          src={user.image || user.avatarUrl}
          alt={user.fullName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        user.fullName?.[0] || "U"
      )}
    </div>
  );
}

function ProfileAvatarLink({ user }) {
  return (
    <Link href={`/profile/${user.id}`} style={{ textDecoration: "none" }}>
      {avatar(user)}
    </Link>
  );
}

function ProfileNameLink({ user }) {
  return (
    <Link
      href={`/profile/${user.id}`}
      style={{
        textDecoration: "none",
        color: "var(--text-primary)",
        fontWeight: "bold",
      }}
    >
      {user.fullName}
    </Link>
  );
}

export default async function FriendsPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const relationships = await db
    .select()
    .from(friendships)
    .where(
      or(
        eq(friendships.requesterId, session.userId),
        eq(friendships.receiverId, session.userId)
      )
    );

  const pendingRequests = await db
    .select({
      friendshipId: friendships.id,
      id: users.id,
      fullName: users.fullName,
      faculty: users.faculty,
      email: users.email,
      image: users.image,
      avatarUrl: users.avatarUrl,
    })
    .from(friendships)
    .innerJoin(users, eq(friendships.requesterId, users.id))
    .where(
      and(
        eq(friendships.receiverId, session.userId),
        eq(friendships.status, "pending")
      )
    );

  const accepted = relationships.filter((item) => item.status === "accepted");

  const friendIds = accepted.map((item) =>
    item.requesterId === session.userId ? item.receiverId : item.requesterId
  );

  const friends =
    friendIds.length > 0
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            faculty: users.faculty,
            email: users.email,
            image: users.image,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(or(...friendIds.map((id) => eq(users.id, id))))
      : [];

  const [followingSummary, smartSuggestions] = await Promise.all([
    getFollowingSummary(session.userId, 24),
    getPeopleYouMayKnow(session.userId, 24),
  ]);

  const suggestions = smartSuggestions;
  const followingPeople = followingSummary.users;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="card">
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--border-color-light)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>
            Friends
          </h2>

          <Link
            href="/search"
            className="btn btn-primary"
            style={{ padding: "8px 16px", textDecoration: "none" }}
          >
            Find Friends
          </Link>
        </div>

        <div style={{ display: "flex", gap: "24px", padding: "0 20px" }}>
          <div
            style={{
              padding: "16px 0",
              borderBottom: "3px solid var(--ufar-blue)",
              color: "var(--ufar-blue)",
              fontWeight: "600",
            }}
          >
            Suggestions
          </div>

          <div
            style={{
              padding: "16px 0",
              color: "var(--text-secondary)",
              fontWeight: "500",
              borderBottom: "3px solid transparent",
            }}
          >
            All Friends ({friends.length})
          </div>
        </div>
      </div>

      <section className="card">
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--border-color-light)",
          }}
        >
          <h3 style={{ fontSize: "1.1rem" }}>Pending Requests</h3>
        </div>

        {pendingRequests.length === 0 ? (
          <div
            style={{
              padding: "28px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            No pending requests.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "16px",
              padding: "16px",
            }}
          >
            {pendingRequests.map((user) => (
              <div
                key={user.friendshipId}
                style={{
                  border: "1px solid var(--border-color-light)",
                  padding: "16px",
                  borderRadius: "12px",
                }}
              >
                <ProfileNameLink user={user} />

                <p
                  style={{
                    margin: "4px 0 12px",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {user.faculty || user.email}
                </p>

                <div style={{ display: "flex", gap: "8px" }}>
                  <form action={acceptRequest}>
                    <input
                      type="hidden"
                      name="friendshipId"
                      value={user.friendshipId}
                    />
                    <button type="submit" className="btn btn-primary">
                      Accept
                    </button>
                  </form>

                  <form action={rejectRequest}>
                    <input
                      type="hidden"
                      name="friendshipId"
                      value={user.friendshipId}
                    />
                    <button type="submit" className="btn btn-secondary">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--border-color-light)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.1rem" }}>Following</h3>
            <p
              style={{
                margin: "4px 0 0",
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
              }}
            >
              Accounts you follow.
            </p>
          </div>

          <strong style={{ color: "var(--ufar-blue)" }}>
            {followingSummary.count}
          </strong>
        </div>

        {followingPeople.length === 0 ? (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            You are not following anyone yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "16px",
              padding: "16px",
            }}
          >
            {followingPeople.map((user) => (
              <div
                key={user.id}
                style={{
                  border: "1px solid var(--border-color-light)",
                  padding: "16px",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <ProfileAvatarLink user={user} />
                <ProfileNameLink user={user} />

                <p
                  style={{
                    margin: "4px 0 12px",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {user.faculty || user.username || "Student"}
                </p>

                <form action={unfollowUser} style={{ width: "100%" }}>
                  <input type="hidden" name="targetId" value={user.id} />
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                  >
                    Unfollow
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--border-color-light)",
          }}
        >
          <h3 style={{ fontSize: "1.1rem" }}>People you may know</h3>
          <p
            style={{
              margin: "4px 0 0",
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
            }}
          >
            Smart suggestions based on your faculty, friends, followers and
            communities.
          </p>
        </div>

        {suggestions.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            No suggestions right now.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
              padding: "16px",
            }}
          >
            {suggestions.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  border: "1px solid var(--border-color-light)",
                  padding: "16px",
                  borderRadius: "12px",
                }}
              >
                <ProfileAvatarLink user={user} />
                <ProfileNameLink user={user} />

                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    marginTop: "4px",
                  }}
                >
                  {user.reason}
                </span>

                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    marginBottom: "12px",
                  }}
                >
                  {user.faculty || user.username || "Student"}
                </span>

                <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                  <form action={followUser} style={{ flex: 1 }}>
                    <input type="hidden" name="targetId" value={user.id} />
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                    >
                      Follow
                    </button>
                  </form>

                  <form action={sendFriendRequest} style={{ flex: 1 }}>
                    <input type="hidden" name="targetId" value={user.id} />
                    <button
                      className="btn btn-secondary"
                      style={{ width: "100%" }}
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--border-color-light)",
          }}
        >
          <h3 style={{ fontSize: "1.1rem" }}>All Friends</h3>
        </div>

        {friends.length === 0 ? (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            You have no friends yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "16px",
              padding: "16px",
            }}
          >
            {friends.map((friend) => (
              <div
                key={friend.id}
                style={{
                  border: "1px solid var(--border-color-light)",
                  padding: "16px",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <ProfileAvatarLink user={friend} />
                <ProfileNameLink user={friend} />

                <p
                  style={{
                    margin: "4px 0 12px",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {friend.faculty || friend.email}
                </p>

                <form action={unfriend} style={{ width: "100%" }}>
                  <input type="hidden" name="friendId" value={friend.id} />
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                  >
                    Unfriend
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}