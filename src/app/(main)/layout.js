import Link from "next/link";
import Image from "next/image";
import { getServerTranslator } from "@/shared/i18n/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { logoutUser } from "@/features/auth/server/actions";
import { followUser } from "@/features/profile/server/follow";
import { getFacultyLabel } from "@/features/profile/server/utils";
import {
  getCachedUserBasicInfo,
  getCachedUnreadNotifications,
} from "@/shared/cache/cache";
import UiIcon from "@/shared/ui/UiIcon";
import LanguageSwitcher from "@/shared/ui/LanguageSwitcher";
import NavigationMenu from "@/shared/ui/NavigationMenu";
import TopbarSearch from "@/shared/ui/TopbarSearch";
import TopbarNotifications from "@/shared/ui/TopbarNotifications";
import RightPanelWidgets from "@/features/dashboard/components/RightPanelWidgets";
import RightPanelSocialWidgets from "@/features/dashboard/components/RightPanelSocialWidgets";

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
  const t = getServerTranslator(lang);

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
  const [currentUser, unreadNotifications] =
    await Promise.all([
      getCachedUserBasicInfo(session.userId),
      getCachedUnreadNotifications(session.userId),
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

          <div className="topbar-actions" />

          <div className="clean-topbar-profile">
            <LanguageSwitcher />

            <TopbarNotifications unread={unreadNotifications} />

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
                <span>{t("common.logout")}</span>
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
            <div className="card right-widget" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", overflow: "visible", position: "relative", zIndex: 100 }}>
              <h4 className="widget-title" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--french-navy)", margin: 0 }}>
                <UiIcon name="search" size={16} color="var(--french-gold)" /> {t("nav.search") || "Search"}
              </h4>
              <TopbarSearch />
            </div>
            <RightPanelWidgets userId={session.userId} />
            <RightPanelSocialWidgets userId={session.userId} lang={lang} />
          </aside>
        )}
      </div>
    </>
  );
}
