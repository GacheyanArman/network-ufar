"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/shared/ui/UiIcon";

type NavItemProps = {
  href: string;
  icon: string;
  translationKey: string;
  badge?: number;
};

function NavItem({ href, icon, translationKey, badge }: NavItemProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      className={`nav-item${isActive ? " active" : ""}`}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="nav-icon">
        <UiIcon name={icon} />
      </span>
      <span className="nav-label">{t(translationKey)}</span>
      {badge !== undefined && badge > 0 && (
        <span className="nav-notification-badge">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

type NavigationMenuProps = {
  /**
   * Kept for backward compatibility — Notifications now live in the topbar,
   * but other consumers may still pass this prop.
   */
  unreadNotifications?: number;
  userRole?: string;
};

const PRIMARY_ITEMS = [
  { href: "/", icon: "home", key: "Today" },
  { href: "/schedule", icon: "calendar", key: "Courses" },
  { href: "/study-materials", icon: "folder", key: "Materials" },
  { href: "/events", icon: "calendar", key: "Events" },
  { href: "/communities", icon: "group", key: "Communities" },
  { href: "/messages", icon: "message", key: "Messages" },
] as const;

const MORE_ITEMS = [
  { href: "/feed", icon: "message-circle", key: "Feed" },
  { href: "/profile", icon: "user", key: "Profile" },
  { href: "/friends", icon: "users", key: "Friends" },
  { href: "/photos", icon: "image", key: "Photos" },
  { href: "/library", icon: "book", key: "Library" },
  { href: "/study-groups", icon: "users", key: "Study Groups" },
  { href: "/lost-found", icon: "search", key: "Lost & Found" },
  { href: "/calendar", icon: "calendar", key: "Calendar" },
] as const;

function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Primary navigation: 7 top-level entries.
 *
 * Today, Courses, Materials, Events, Communities, Messages, More.
 * "More" expands inline (accordion) to reveal secondary destinations,
 * and auto-opens whenever the current route is one of those secondary
 * destinations so users don't lose their place.
 *
 * Search and Notifications were moved to the top bar — they are not
 * duplicated in the More accordion to avoid two competing entry points.
 */
export default function NavigationMenu({ userRole }: NavigationMenuProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const moreId = useId();
  const showAdmin = userRole === "admin" || userRole === "moderator";

  const isOnMoreRoute = useMemo(
    () => MORE_ITEMS.some((item) => isActivePath(pathname, item.href)),
    [pathname],
  );

  // The accordion auto-opens on a More-route on first render and remains
  // user-controllable thereafter (clicking the toggle overrides the route
  // hint until the user navigates away).
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const isMoreOpen = userToggled ?? isOnMoreRoute;

  return (
    <nav className="student-nav card">
      <div className="nav-section">
        {PRIMARY_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            translationKey={item.key}
          />
        ))}

        <button
          type="button"
          className={`nav-item nav-item-more ${isMoreOpen ? "is-open" : ""}`}
          aria-expanded={isMoreOpen}
          aria-controls={moreId}
          onClick={() => setUserToggled(!isMoreOpen)}
        >
          <span className="nav-icon">
            <UiIcon name={isMoreOpen ? "chevron-up" : "chevron-down"} />
          </span>
          <span className="nav-label">{t("More")}</span>
        </button>

        {isMoreOpen && (
          <div id={moreId} className="nav-more-panel" role="region">
            {MORE_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                translationKey={item.key}
              />
            ))}
          </div>
        )}
      </div>

      {showAdmin && (
        <>
          <div className="divider"></div>
          <div className="nav-section">
            <NavItem
              href="/admin"
              icon="shield"
              translationKey="Admin"
            />
          </div>
        </>
      )}
    </nav>
  );
}
