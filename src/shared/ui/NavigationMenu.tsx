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
      // Prevent highlighting /profile if we are on /profile?tab=settings
      if (href === "/profile" && searchParams && searchParams.get("tab") === "settings") {
        isActive = false;
      } else {
        isActive = true;
      }
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
  { href: "/feed", icon: "message-circle", key: "nav.feed", desc: "nav.feedDesc" },
  { href: "/today", icon: "home", key: "nav.today", desc: "nav.todayDesc" },
  { href: "/schedule", icon: "graduation", key: "nav.courses", desc: "nav.schedulDesc" },
  { href: "/study-materials", icon: "folder", key: "nav.materials", desc: "nav.materialsDesc" },
  { href: "/messages", icon: "message", key: "nav.messages", desc: "nav.messagesDesc" },
];

const MORE_ITEMS = [
  { href: "/events", icon: "calendar", key: "nav.events", desc: "nav.eventsDesc" },
  { href: "/communities", icon: "users", key: "nav.communities", desc: "nav.communitiesDesc" },
  { href: "/profile", icon: "user", key: "nav.myProfile", desc: "nav.profileDesc" },
  { href: "/settings", icon: "settings", key: "nav.settings", desc: "nav.settingsDesc" },
  { href: "/help", icon: "help", key: "nav.help", desc: "nav.helpDesc" },
];

function NavigationMenuContent({ userRole }: NavigationMenuProps) {
  const { t } = useLanguage();
  const pathname = usePathname();

  const showAdmin = userRole === "admin" || userRole === "moderator";

  // Determine if a sub-route is active to auto-expand the More section
  const isSubRouteActive = 
    pathname === "/events" || pathname.startsWith("/events/") ||
    pathname === "/communities" || pathname.startsWith("/communities/") ||
    pathname === "/profile" || pathname.startsWith("/profile/") ||
    pathname === "/settings" ||
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
            descriptionKey={item.desc}
          />
        ))}
      </div>

      <div className="divider" aria-hidden="true"></div>

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
          <div className="nav-section nav-submenu" style={{ paddingTop: "4px" }}>
            {MORE_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                translationKey={item.key}
                descriptionKey={item.desc}
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