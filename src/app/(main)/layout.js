import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutUser } from "@/app/actions/auth";

const menuItems = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/profile", label: "Profile", icon: "◉" },
  { href: "/friends", label: "Friends", icon: "♢" },
  { href: "/messages", label: "Messages", icon: "✉" },
  { href: "/photos", label: "Photos", icon: "▧" },
  { href: "/communities", label: "Communities", icon: "◎" },
  { href: "/library", label: "Library", icon: "▤" },
  { href: "/study-materials", label: "Study", icon: "◌" },
];
export default async function MainLayout({ children }) {
  const session = await getSession();

  return (
    <>
      <style>{`
        .app-container:has(.messenger-card) {
          grid-template-columns: 220px minmax(0, 1fr) !important;
        }
        .app-container:has(.messenger-card) .sidebar-right {
          display: none !important;
        }
      `}</style>

      <header className="topbar">
        <div className="topbar-inner old-topbar-inner">
          <Link href="/" className="brand-logo">
            UFARnet
          </Link>

          <form action="/search" className="topbar-search">
            <input
              name="q"
              placeholder="Search UFARnet"
              autoComplete="off"
            />
            <button type="submit">🔍</button>
          </form>

          <nav className="topbar-actions">
            <Link href="/">Home</Link>
            <Link href="/messages">Messages</Link>
            <Link href="/profile" className="user-dropdown-btn">
              <span className="avatar-blank-sm">
                {session?.fullName?.charAt(0) || "U"}
              </span>
              <span>{session?.fullName || "Profile"}</span>
            </Link>
            <form action={logoutUser}>
               <button type="submit" style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold', padding: '0 8px'}}>
                 Logout
               </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="app-container old-social-grid">
        <aside className="sidebar-left">
          <section className="card old-profile-card">
            <div className="old-profile-mini">
              <div className="old-avatar">
                {session?.fullName?.charAt(0) || "U"}
              </div>
              <div>
                <strong>{session?.fullName || "UFAR Student"}</strong>
                <span>{session?.email || "student@ufar.am"}</span>
              </div>
            </div>
          </section>

          <section className="card old-menu-card">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href} className="old-menu-link">
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </section>
        </aside>

        <main className="main-content">
          {children}
        </main>

        <aside className="sidebar-right">
          
          <section className="card old-widget">
            <h3>Requests</h3>
            <div className="old-empty" style={{padding: '20px 10px'}}>
              <p>No pending requests.</p>
            </div>
          </section>

          <section className="card old-widget">
            <h3>Who to follow</h3>
            <div className="old-empty" style={{padding: '20px 10px'}}>
              <p>No suggestions yet.</p>
            </div>
          </section>

          <section className="card old-widget">
            <h3>Trends</h3>
            <div className="old-empty" style={{padding: '20px 10px'}}>
              <p>Nothing trending right now.</p>
            </div>
          </section>

        </aside>
      </div>
    </>
  );
}