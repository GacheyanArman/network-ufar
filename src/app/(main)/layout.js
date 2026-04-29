import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { logoutUser } from "@/app/actions/auth";
import { followUser } from "@/app/actions/follow";
import {
  getFollowingSummary,
  getPeopleYouMayKnow,
} from "@/lib/social";
import UiIcon from "@/components/UiIcon";

export default async function MainLayout({ children }) {
  const session = await getSession();

  let currentUser = null;
  let unreadNotifications = 0;
  let followingSummary = { count: 0, users: [] };
  let peopleYouMayKnow = [];

  if (session?.userId) {
    const result = await db
      .select({
        fullName: users.fullName,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    currentUser = result[0] || null;

    const [unreadRow] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.userId),
          eq(notifications.isRead, false)
        )
      );

    unreadNotifications = Number(unreadRow?.value || 0);

    [followingSummary, peopleYouMayKnow] = await Promise.all([
      getFollowingSummary(session.userId, 5),
      getPeopleYouMayKnow(session.userId, 5),
    ]);
  }

  const safeName = currentUser?.fullName || session?.fullName || "User";
  const safeInitial = safeName.charAt(0).toUpperCase();
  const avatarImage = currentUser?.image || "";

  return (
    <>
      <header className="topbar clean-topbar">
        <div className="topbar-inner clean-topbar-inner">
          <div className="brand">
            <Link href="/" className="brand-link">
              <div className="logo-circle">U</div>
              <span className="brand-name">UFARnet</span>
            </Link>
          </div>

          <div className="clean-topbar-profile">
            <Link href="/profile" className="topbar-avatar-link">
              {avatarImage ? (
                <img
                  src={avatarImage}
                  alt={safeName}
                  className="topbar-avatar-img"
                />
              ) : (
                <div className="avatar-blank-sm">{safeInitial}</div>
              )}
            </Link>

            <form action={logoutUser}>
              <button type="submit" className="logout-btn clean-logout-btn">
                <UiIcon name="logout" size={16} />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="app-container">
        <aside className="sidebar-left">
          <nav className="student-nav card">
            <div className="nav-section">
              <Link href="/" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="news" />
                </span>
                <span className="nav-label">My News</span>
              </Link>

              <Link href="/search" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="search" />
                </span>
                <span className="nav-label">Search</span>
              </Link>

              <Link href="/notifications" className="nav-item nav-item-notifications">
                <span className="nav-icon">
                  <UiIcon name="bell" />
                </span>

                <span className="nav-label">Notifications</span>

                {unreadNotifications > 0 && (
                  <span className="nav-notification-badge">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>

              <Link href="/messages" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="message" />
                </span>
                <span className="nav-label">Messages</span>
              </Link>

              <Link href="/friends" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="users" />
                </span>
                <span className="nav-label">Friends</span>
              </Link>

              <Link href="/profile" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="user" />
                </span>
                <span className="nav-label">My Profile</span>
              </Link>

              <Link href="/communities" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="group" />
                </span>
                <span className="nav-label">Communities</span>
              </Link>

              <Link href="/photos" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="image" />
                </span>
                <span className="nav-label">Photos</span>
              </Link>

              <Link href="/library" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="book" />
                </span>
                <span className="nav-label">UFAR Library</span>
              </Link>

              <Link href="/study-materials" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="folder" />
                </span>
                <span className="nav-label">Materials</span>
              </Link>
            </div>

            <div className="divider"></div>

            <div className="nav-section">
              <h4 className="nav-section-title">University Help</h4>

              <Link href="/library" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="book" />
                </span>
                <span className="nav-label">UFAR Library</span>
              </Link>

              <Link href="/study-materials" className="nav-item">
                <span className="nav-icon">
                  <UiIcon name="folder" />
                </span>
                <span className="nav-label">Materials</span>
              </Link>
            </div>
          </nav>
        </aside>

        <main className="main-content">{children}</main>

        <aside className="sidebar-right">
          <div className="card contextual-search-card">
            <form action="/search">
              <input
                name="q"
                type="text"
                className="right-search-input"
                placeholder="Search..."
              />
            </form>
          </div>

          <div className="card">
            <div className="old-widget-head">
              <h4 className="widget-title">You may also know</h4>
              <Link href="/friends" className="old-widget-link">
                View all
              </Link>
            </div>

            {peopleYouMayKnow.length === 0 ? (
              <div className="empty-state-mini">
                <p>No suggestions.</p>
              </div>
            ) : (
              <div className="mini-user-list">
                {peopleYouMayKnow.map((user) => (
                  <div className="mini-user-row" key={user.id}>
                    <Link
                      href={`/profile/${user.id}`}
                      className="mini-user-avatar"
                      style={{ textDecoration: "none" }}
                    >
                      {user.image || user.avatarUrl ? (
                        <img
                          src={user.image || user.avatarUrl}
                          alt={user.fullName}
                        />
                      ) : (
                        user.fullName?.[0] || "U"
                      )}
                    </Link>

                    <Link
                      href={`/profile/${user.id}`}
                      className="mini-user-main"
                    >
                      <strong>{user.fullName}</strong>
                      <span>{user.reason}</span>
                    </Link>

                    <form action={followUser}>
                      <input type="hidden" name="targetId" value={user.id} />
                      <button className="btn btn-secondary">Follow</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: "0" }}>
            <div
              className="old-widget-head"
              style={{ padding: "8px 8px 0" }}
            >
              <h4 className="widget-title" style={{ borderBottom: "none" }}>
                FOLLOWING
              </h4>
              <span className="old-widget-count">
                {followingSummary.count}
              </span>
            </div>

            {followingSummary.users.length === 0 ? (
              <div className="empty-state-mini" style={{ padding: "8px" }}>
                <p>You are not following anyone yet.</p>
              </div>
            ) : (
              <div
                className="mini-user-list"
                style={{ padding: "0 8px 8px" }}
              >
                {followingSummary.users.map((user) => (
                  <Link
                    href={`/profile/${user.id}`}
                    className="mini-user-row mini-user-row-link"
                    key={user.id}
                  >
                    <div className="mini-user-avatar">
                      {user.image || user.avatarUrl ? (
                        <img
                          src={user.image || user.avatarUrl}
                          alt={user.fullName}
                        />
                      ) : (
                        user.fullName?.[0] || "U"
                      )}
                    </div>

                    <div className="mini-user-main">
                      <strong>{user.fullName}</strong>
                      <span>
                        {user.faculty || user.username || "Student"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="uf-birthday-widget">
            <div className="uf-birthday-head">
              <div className="uf-birthday-icon">
                <UiIcon name="cake" size={18} />
              </div>

              <div>
                <h4>Birthdays</h4>
                <p>Today</p>
              </div>
            </div>

            <div className="uf-birthday-empty">
              <div className="uf-birthday-empty-icon">
                <UiIcon name="calendar" size={20} />
              </div>

              <p>No birthdays today.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}