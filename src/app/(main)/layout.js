import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logoutUser } from "@/app/actions/auth";
import { followUser } from "@/app/actions/follow";
import {
  getFollowingSummary,
  getPeopleYouMayKnow,
} from "@/lib/social";
import { getTodayBirthdays } from "@/lib/birthdays";
import { getCachedUserBasicInfo, getCachedUnreadNotifications } from "@/lib/cache";
import UiIcon from "@/components/UiIcon";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NavigationMenu from "@/components/NavigationMenu";
import SearchBar from "@/components/SearchBar";

export default async function MainLayout({ children }) {
  const session = await getSession();

  let currentUser = null;
  let unreadNotifications = 0;
  let followingSummary = { count: 0, users: [] };
  let peopleYouMayKnow = [];
  let todayBirthdays = [];

  if (session?.userId) {
    // Объединяем все запросы в один Promise.all для параллельного выполнения
    // Используем кэшированные функции для часто запрашиваемых данных
    [currentUser, unreadNotifications, followingSummary, peopleYouMayKnow, todayBirthdays] = await Promise.all([
      getCachedUserBasicInfo(session.userId),
      getCachedUnreadNotifications(session.userId),
      getFollowingSummary(session.userId, 5),
      getPeopleYouMayKnow(session.userId, 5),
      getTodayBirthdays(session.userId, 5),
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
            <LanguageSwitcher />

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
          <NavigationMenu unreadNotifications={unreadNotifications} />
        </aside>

        <main className="main-content">{children}</main>

        <aside className="sidebar-right">
          <div className="card contextual-search-card">
            <SearchBar />
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

            {todayBirthdays.length === 0 ? (
              <div className="uf-birthday-empty">
                <div className="uf-birthday-empty-icon">
                  <UiIcon name="calendar" size={20} />
                </div>

                <p>No birthdays today.</p>
              </div>
            ) : (
              <div className="uf-birthday-list">
                {todayBirthdays.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.id}`}
                    className="uf-birthday-item"
                  >
                    <div className="uf-birthday-avatar">
                      {user.image ? (
                        <img src={user.image} alt={user.fullName} />
                      ) : (
                        user.fullName?.[0] || "U"
                      )}
                    </div>

                    <div className="uf-birthday-info">
                      <strong>{user.fullName}</strong>
                      <span>🎂 Happy Birthday!</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}