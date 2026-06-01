"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/shared/ui/UiIcon";

type NavItemProps = {
  href: string;
  icon: string;
  translationKey: string;
  descriptionKey?: string;
  badge?: number;
};

function NavItem({ href, icon, translationKey, descriptionKey, badge }: NavItemProps) {
  const { t } = useLanguage();
  const pathname = usePathname();

  // Strict matching for home route, prefix matching for nested routes
  let isActive = false;
  if (pathname === href) {
    isActive = true;
  } else if (href !== "/" && pathname && pathname.startsWith(href)) {
    isActive = true;
  }

  return (
    <Link
      href={href}
      className={`nav-item ${isActive ? "active" : ""}`}
      // Screen reader context for active page
      aria-current={isActive ? "page" : undefined}
    >
      <span className="nav-icon">
        <UiIcon name={icon} />
      </span>
      <div className="nav-text-wrapper">
        <span className="nav-label">{t(translationKey)}</span>
        {descriptionKey ? (
          <span className="nav-desc">{t(descriptionKey)}</span>
        ) : null}
      </div>
      {badge ? (
        <span className="nav-notification-badge" aria-hidden="true">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

type NavigationMenuProps = {
  userRole?: string;
};

const NAV_ITEMS = [
  { href: "/feed", icon: "message-circle", key: "nav.feed", desc: "nav.feedDesc" },
  { href: "/schedule", icon: "calendar", key: "nav.courses", desc: "nav.schedulDesc" },
  { href: "/study-materials", icon: "folder", key: "nav.materials", desc: "nav.materialsDesc" },
  { href: "/events", icon: "calendar", key: "nav.events", desc: "nav.eventsDesc" },
  { href: "/communities", icon: "group", key: "nav.communities", desc: "nav.communitiesDesc" },
  { href: "/messages", icon: "message", key: "nav.messages", desc: "nav.messagesDesc" },
  { href: "/today", icon: "home", key: "nav.today", desc: "nav.todayDesc" },
  { href: "/profile", icon: "user", key: "nav.myProfile", desc: "nav.profileDesc" },
];

export default function NavigationMenu({ userRole }: NavigationMenuProps) {
  const { t } = useLanguage();

  const showAdmin = userRole === "admin" || userRole === "moderator";

  return (
    <nav
      className="student-nav card"
      aria-label={t("nav.primary") || "Primary navigation"}
    >
      <div className="nav-section">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            translationKey={item.key}
            descriptionKey={item.desc}
          />
        ))}
      </div>

      {showAdmin ? (
        <>
          <div className="divider" aria-hidden="true"></div>
          <div className="nav-section">
            <NavItem
              href="/admin"
              icon="shield"
              translationKey="nav.admin"
            />
          </div>
        </>
      ) : null}
    </nav>
  );
}