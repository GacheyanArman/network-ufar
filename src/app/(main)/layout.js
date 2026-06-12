import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { logoutUser } from "@/features/auth/server/actions";
import { getCachedUserBasicInfo } from "@/shared/cache/cache";
import NavigationMenu from "@/shared/ui/NavigationMenu";
import RightPanelWidgets from "@/features/dashboard/components/RightPanelWidgets";
import MobileBottomNav from "@/shared/ui/MobileBottomNav";
import TopbarSearch from "@/shared/ui/TopbarSearch";
import TopbarNotifications from "@/shared/ui/TopbarNotifications";
import TopbarAvatarMenu from "@/shared/ui/TopbarAvatarMenu";
import { getCachedUnreadNotifications } from "@/shared/cache/cache";

export default async function MainLayout({ children }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const currentUser = await getCachedUserBasicInfo(session.userId);

  if (currentUser && !currentUser.onboardingComplete) {
    redirect("/onboarding");
  }

  const unreadNotifications = await getCachedUnreadNotifications(session.userId);

  const safeName = currentUser?.fullName || session?.fullName || "User";
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
            <TopbarSearch />
            <TopbarNotifications unread={unreadNotifications} />
            <TopbarAvatarMenu name={safeName} image={avatarImage} logoutAction={logoutUser} />
          </div>
        </div>
      </header>

      <div className="app-container">
        <aside className="sidebar-left">
          <NavigationMenu userRole={currentUser?.role || "user"} />
        </aside>

        <main className="main-content">{children}</main>

        <aside className="sidebar-right">
          <RightPanelWidgets userId={session.userId} />
        </aside>
      </div>

      <MobileBottomNav />
    </>
  );
}
