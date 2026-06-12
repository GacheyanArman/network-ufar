import Link from "next/link";
import Image from "next/image";
import { getServerTranslator } from "@/shared/i18n/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { logoutUser } from "@/features/auth/server/actions";
import { getCachedUserBasicInfo } from "@/shared/cache/cache";
import UiIcon from "@/shared/ui/UiIcon";
import LanguageSwitcher from "@/shared/ui/LanguageSwitcher";
import NavigationMenu from "@/shared/ui/NavigationMenu";
import RightPanelWidgets from "@/features/dashboard/components/RightPanelWidgets";
import MobileBottomNav from "@/shared/ui/MobileBottomNav";
import TopbarSearch from "@/shared/ui/TopbarSearch";
import TopbarNotifications from "@/shared/ui/TopbarNotifications";
import { getCachedUnreadNotifications } from "@/shared/cache/cache";

export default async function MainLayout({ children }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = getServerTranslator(lang);

  const currentUser = await getCachedUserBasicInfo(session.userId);

  if (currentUser && !currentUser.onboardingComplete) {
    redirect("/onboarding");
  }

  const unreadNotifications = await getCachedUnreadNotifications(session.userId);

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

          <div className="topbar-actions topbar-nav-links">
            <Link href="/courses" className="topbar-nav-link">
              <UiIcon name="graduation" size={16} />
              <span>{t("nav.courses")}</span>
            </Link>
          </div>

          <div className="clean-topbar-profile">
            <TopbarSearch />
            <TopbarNotifications unread={unreadNotifications} />
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

        <aside className="sidebar-right">
          <RightPanelWidgets userId={session.userId} />
        </aside>
      </div>

      <MobileBottomNav />
    </>
  );
}
