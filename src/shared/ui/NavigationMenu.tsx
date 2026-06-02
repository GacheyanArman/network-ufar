"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/shared/ui/UiIcon";
import { useState, useEffect, Suspense } from "react";

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
  const searchParams = useSearchParams();

  // Split href to base path and query parameters
  const [baseHref, queryStr] = href.split("?");

  let isActive = false;
  if (queryStr) {
    const urlParams = new URLSearchParams(queryStr);
    const allQueryMatches = Array.from(urlParams.entries()).every(([key, val]) => {
      return searchParams ? searchParams.get(key) === val : false;
    });
    if (pathname === baseHref && allQueryMatches) {
      isActive = true;
    }
  } else {
    if (pathname === href) {
      isActive = true;
    } else if (href !== "/" && pathname && pathname.startsWith(href)) {
      isActive = true;
    }
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

const PRIMARY_ITEMS = [
  { href: "/feed", icon: "message-circle", key: "nav.feed" },
  { href: "/today", icon: "home", key: "nav.today" },
  { href: "/schedule", icon: "graduation", key: "nav.courses" },
  { href: "/study-materials", icon: "folder", key: "nav.materials" },
  { href: "/messages", icon: "message", key: "nav.messages" },
];

const MORE_ITEMS = [
  { href: "/events", icon: "calendar", key: "nav.events" },
  { href: "/communities", icon: "users", key: "nav.communities" },
  { href: "/profile", icon: "user", key: "nav.myProfile" },
  { href: "/settings", icon: "settings", key: "nav.settings" },
  { href: "/help", icon: "help", key: "nav.help" },
];

function NavigationMenuContent({ userRole }: NavigationMenuProps) {
  const { t } = useLanguage();
  const pathname = usePathname();

  const showAdmin = userRole === "admin" || userRole === "moderator";

  // Determine if a sub-route is active to auto-expand the More section
  const isSubRouteActive = 
    pathname === "/events" || pathname.startsWith("/events/") ||
    pathname === "/communities" || pathname.startsWith("/communities/") ||
    pathname === "/help" || pathname.startsWith("/help/");

  const [isMoreOpen, setIsMoreOpen] = useState(isSubRouteActive);

  // Auto-expand if the route changes to a sub-route
  useEffect(() => {
    if (isSubRouteActive) {
      setIsMoreOpen(true);
    }
  }, [pathname, isSubRouteActive]);

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
      </div>



      {/* Collapsible More Section */}
      <button
        type="button"
        onClick={() => setIsMoreOpen(!isMoreOpen)}
        className={`nav-item nav-more-trigger ${isMoreOpen ? "expanded" : ""}`}
        aria-expanded={isMoreOpen}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center" }}
      >
        <span className="nav-icon">
          <UiIcon name="more" />
        </span>
        <div className="nav-text-wrapper" style={{ flex: 1 }}>
          <span className="nav-label" style={{ display: "block" }}>{t("nav.more") || "More"}</span>
          <span className="nav-desc" style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>
            {t("nav.moreDesc") || "Extra sections"}
          </span>
        </div>
        <span className="nav-chevron" style={{ opacity: 0.6, display: "flex", alignItems: "center" }}>
          <UiIcon name={isMoreOpen ? "chevron-up" : "chevron-down"} size={16} />
        </span>
      </button>

      <div className={`nav-more-wrapper ${isMoreOpen ? "open" : ""}`}>
        <div className="nav-more-content">
          <div className="nav-section nav-submenu" style={{ paddingTop: "4px", width: "auto", marginRight: "26px", paddingRight: "8px" }}>
            {MORE_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                translationKey={item.key}
              />
            ))}
          </div>
        </div>
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

export default function NavigationMenu(props: NavigationMenuProps) {
  return (
    <Suspense fallback={<div className="student-nav card animate-pulse" style={{ height: 320, background: "#fff" }} />}>
      <NavigationMenuContent {...props} />
    </Suspense>
  );
}