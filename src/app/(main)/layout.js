import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { logoutUser } from "@/app/actions/auth";

export default async function MainLayout({ children }) {
  const session = await getSession();

  let currentUser = null;

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
  }

  const safeName = currentUser?.fullName || session?.fullName || "User";
  const safeInitial = safeName.charAt(0).toUpperCase();
  const avatarImage = currentUser?.image || "";

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Link href="/" className="brand-link">
              <div className="logo-circle">U</div>
              <span className="brand-name">UFARnet</span>
            </Link>
          </div>

          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search students, groups, materials..."
            />
          </div>

          <div className="topbar-actions">
            <Link href="/messages" className="action-icon-btn">
              💬
            </Link>

            <button className="action-icon-btn" type="button">
              🔔
            </button>

            <div className="user-dropdown-btn">
              <Link href="/profile" className="topbar-avatar-link">
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt={safeName}
                    className="topbar-avatar-img"
                  />
                ) : (
                  <div className="avatar-blank-sm">
                    {safeInitial}
                  </div>
                )}
              </Link>

              <form action={logoutUser}>
                <button type="submit" className="logout-btn">
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="app-container">
        <aside className="sidebar-left">
          <nav className="student-nav card">
            <div className="nav-section">
              <Link href="/" className="nav-item">
                <span className="nav-icon">📰</span>
                <span className="nav-label">My News</span>
              </Link>

              <Link href="/messages" className="nav-item">
                <span className="nav-icon">💬</span>
                <span className="nav-label">Messages</span>
              </Link>

              <Link href="/friends" className="nav-item">
                <span className="nav-icon">👥</span>
                <span className="nav-label">Friends</span>
              </Link>

              <Link href="/profile" className="nav-item">
                <span className="nav-icon">👤</span>
                <span className="nav-label">My Profile</span>
              </Link>

              <Link href="/communities" className="nav-item">
                <span className="nav-icon">🤝</span>
                <span className="nav-label">Communities</span>
              </Link>

              <Link href="/photos" className="nav-item">
                <span className="nav-icon">🖼️</span>
                <span className="nav-label">Photos</span>
              </Link>
            </div>

            <div className="divider"></div>

            <div className="nav-section">
              <h4 className="nav-section-title">University Help</h4>

              <Link href="/library" className="nav-item">
                <span className="nav-icon">📚</span>
                <span className="nav-label">UFAR Library</span>
              </Link>

              <Link href="/study-materials" className="nav-item">
                <span className="nav-icon">📁</span>
                <span className="nav-label">Materials</span>
              </Link>
            </div>
          </nav>
        </aside>

        <main className="main-content">
          {children}
        </main>

        <aside className="sidebar-right">
          <div className="card contextual-search-card">
            <input type="text" className="right-search-input" placeholder="Search..." />
          </div>

          <div className="card">
            <h4 className="widget-title">You may also know</h4>
            <div className="empty-state-mini">
              <p>No suggestions.</p>
            </div>
          </div>

          <div className="card" style={{ padding: "0" }}>
            <h4 className="widget-title" style={{ borderBottom: "none" }}>
              FOLLOWING
            </h4>

            <ul className="subscriptions-list">
              <li className="sub-item">
                <span className="sub-icon">👥</span>
                <span className="sub-label">followed students</span>
                <span className="sub-count">--</span>
              </li>

              <li className="sub-item">
                <span className="sub-icon">🤝</span>
                <span className="sub-label">followed groups</span>
                <span className="sub-count">--</span>
              </li>
            </ul>
          </div>

          <div className="card">
            <h4 className="widget-title">Birthdays</h4>
            <div className="empty-state-mini">
              <p>No birthdays today.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}