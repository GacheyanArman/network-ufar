import Link from "next/link";
import Image from "next/image";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { logoutUser } from "@/features/auth/server/actions";
import { followUser } from "@/features/profile/server/follow";
import { getFacultyLabel } from "@/features/profile/server/utils";
import {
  getCachedUserBasicInfo,
  getCachedUnreadNotifications,
  getCachedFollowingSummary,
  getCachedPeopleYouMayKnow,
} from "@/shared/cache/cache";
import UiIcon from "@/shared/ui/UiIcon";
import LanguageSwitcher from "@/shared/ui/LanguageSwitcher";
import NavigationMenu from "@/shared/ui/NavigationMenu";
import TopbarSearch from "@/shared/ui/TopbarSearch";
import TopbarNotifications from "@/shared/ui/TopbarNotifications";
import RightPanelWidgets from "@/features/dashboard/components/RightPanelWidgets";

// Routes where the right sidebar is intentionally hidden.
// Keeping this list server-side lets us skip the DB fetches entirely
// instead of just CSS-hiding the panel after the queries already ran.
const HIDE_RIGHT_PANEL_PREFIXES = ["/messages", "/group-chats"];

export default async function MainLayout({ children }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";

  // Derive the current pathname from request headers so we can skip
  // the right-panel queries on routes where the sidebar is hidden.
  const headerStore = await headers();
  const pathname =
    headerStore.get("x-pathname") ||
    headerStore.get("next-url") ||
    "";
  const showRightPanel = !HIDE_RIGHT_PANEL_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Fetch user info + notifications unconditionally; social widget data
  // only when the right panel will actually be rendered.
  const [currentUser, unreadNotifications, followingSummary, peopleYouMayKnow] =
    await Promise.all([
      getCachedUserBasicInfo(session.userId),
      getCachedUnreadNotifications(session.userId),
      showRightPanel ? getCachedFollowingSummary(session.userId, 5) : Promise.resolve({ count: 0, users: [] }),
      showRightPanel ? getCachedPeopleYouMayKnow(session.userId, 5) : Promise.resolve([]),
    ]);

  if (currentUser && !currentUser.onboardingComplete) {
    redirect("/onboarding");
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

          <div className="topbar-actions">
            <TopbarSearch />
            <TopbarNotifications unread={unreadNotifications} />
          </div>

          <div className="clean-topbar-profile">
            <LanguageSwitcher />

            <Link href="/profile" className="topbar-avatar-link">
              {avatarImage ? (
                <Image
                  src={avatarImage}
                  alt={safeName}
                  width={42}
                  height={42}
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
          <NavigationMenu userRole={currentUser?.role || "user"} />
        </aside>

        <main className="main-content">{children}</main>

        {showRightPanel && (
          <aside className="sidebar-right">
            <RightPanelWidgets userId={session.userId} />

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
                          <Image
                            src={user.image || user.avatarUrl}
                            alt={user.fullName}
                            width={40}
                            height={40}
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
                          <Image
                            src={user.image || user.avatarUrl}
                            alt={user.fullName}
                            width={40}
                            height={40}
                          />
                        ) : (
                          user.fullName?.[0] || "U"
                        )}
                      </div>

                      <div className="mini-user-main">
                        <strong>{user.fullName}</strong>
                        <span>
                          {user.faculty
                            ? getFacultyLabel(user.faculty, lang)
                            : user.username || "Student"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
