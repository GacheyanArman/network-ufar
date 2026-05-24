"use client";

import Link from "next/link";
import { useId, useState, useEffect } from "react";
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
      <span className="nav-label">{t(translationKey)}</span>
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

// Use correct dot notation keys for i18n mapping
const PRIMARY_ITEMS = [
  { href: "/", icon: "home", key: "nav.today" },
  { href: "/feed", icon: "message-circle", key: "nav.feed" },
  { href: "/schedule", icon: "calendar", key: "nav.courses" },
  { href: "/study-materials", icon: "folder", key: "nav.materials" },
  { href: "/events", icon: "calendar", key: "nav.events" },
  { href: "/communities", icon: "group", key: "nav.communities" },
  { href: "/messages", icon: "message", key: "nav.messages" },
];

const MORE_ITEMS = [
  { href: "/profile", icon: "user", key: "nav.myProfile" },
  { href: "/friends", icon: "users", key: "nav.friends" },
  { href: "/photos", icon: "image", key: "nav.photos" },
  { href: "/library", icon: "book", key: "nav.library" },
  { href: "/study-groups", icon: "users", key: "nav.studyGroups" },
  { href: "/lost-found", icon: "search", key: "nav.lostFound" },
  { href: "/calendar", icon: "calendar", key: "nav.calendar" },
];

export default function NavigationMenu({ userRole }: NavigationMenuProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  
  // Unique ARIA identifier for the expandable region
  const morePanelId = useId();

  const checkMoreRoute = () => {
    if (!pathname) return false;
    for (let i = 0; i < MORE_ITEMS.length; i++) {
      if (pathname.startsWith(MORE_ITEMS[i].href)) {
        return true;
      }
    }
    return false;
  };

  const [isMoreOpen, setIsMoreOpen] = useState(checkMoreRoute());

  // Auto-expand if navigating directly to a nested route
  useEffect(() => {
    if (checkMoreRoute()) {
      setIsMoreOpen(true);
    }
  }, [pathname]);

  const showAdmin = userRole === "admin" || userRole === "moderator";

  const toggleMenu = () => setIsMoreOpen((prev) => !prev);

  return (
    <nav 
      className="student-nav card" 
      aria-label={t("nav.primary") || "Primary navigation"}
    >
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
          onClick={toggleMenu}
          // The critical ARIA pair
          aria-expanded={isMoreOpen}
          aria-controls={isMoreOpen ? morePanelId : undefined}
        >
          <span className="nav-icon">
            <UiIcon name={isMoreOpen ? "chevron-up" : "chevron-down"} />
          </span>
          <span className="nav-label">{t("nav.more")}</span>
        </button>

        {isMoreOpen ? (
          <div 
            id={morePanelId} 
            className="nav-more-panel" 
            role="region"
            aria-label={t("nav.more")}
          >
            {MORE_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                translationKey={item.key}
              />
            ))}
          </div>
        ) : null}
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