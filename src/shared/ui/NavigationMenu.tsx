"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/shared/ui/UiIcon";
import { Suspense } from "react";

type NavItemProps = {
  href: string;
  icon: string;
  translationKey: string;
  badge?: number;
  activeHrefs?: string[];
};

function NavItem({ href, icon, translationKey, badge, activeHrefs = [] }: NavItemProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [baseHref, queryStr] = href.split("?");
  const activeTargets = [baseHref, ...activeHrefs];

  let isActive = false;
  if (queryStr) {
    const urlParams = new URLSearchParams(queryStr);
    const allQueryMatches = Array.from(urlParams.entries()).every(([key, val]) =>
      searchParams ? searchParams.get(key) === val : false
    );
    isActive = pathname === baseHref && allQueryMatches;
  } else {
    isActive = activeTargets.some((target) =>
      pathname === target || (target !== "/" && pathname?.startsWith(`${target}/`))
    );
  }

  return (
    <Link
      href={href}
      className={`nav-item ${isActive ? "active" : ""}`}
      aria-current={isActive ? "page" : undefined}
      title={t(translationKey)}
    >
      <span className="nav-icon">
        <UiIcon name={icon} />
      </span>
      <div className="nav-text-wrapper">
        <span className="nav-label">{t(translationKey)}</span>
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
  { href: "/today", icon: "home", key: "nav.today" },
  { href: "/feed", icon: "message-circle", key: "nav.feed" },
  { href: "/courses", icon: "graduation", key: "nav.courses", activeHrefs: ["/schedule", "/calendar"] },
  { href: "/study-materials", icon: "folder", key: "nav.materials", activeHrefs: ["/materials", "/library"] },
  { href: "/communities", icon: "users", key: "nav.communities", activeHrefs: ["/groups", "/study-groups", "/group-chats"] },
  { href: "/messages", icon: "send", key: "nav.messages" },
];

const MORE_ITEMS = [
  { href: "/lost-found", icon: "search", key: "nav.lostFound" },
  { href: "/help", icon: "help", key: "nav.help" },
  { href: "/settings", icon: "settings", key: "nav.settings" },
];

function NavigationMenuContent({ userRole }: NavigationMenuProps) {
  const { t } = useLanguage();
  const showAdmin = userRole === "admin" || userRole === "moderator";

  return (
    <nav className="student-nav card" aria-label={t("nav.primary") || "Primary navigation"}>
      <div className="nav-section">
        {PRIMARY_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            translationKey={item.key}
            activeHrefs={item.activeHrefs}
          />
        ))}
      </div>

      <div className="divider" aria-hidden="true" />
      <div className="nav-section nav-secondary-section" aria-label={t("nav.more") || "More"}>
        <div className="nav-section-title">{t("nav.more") || "More"}</div>
        {MORE_ITEMS.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} translationKey={item.key} />
        ))}
      </div>

      {showAdmin ? (
        <>
          <div className="divider" aria-hidden="true" />
          <div className="nav-section">
            <NavItem href="/admin" icon="shield-check" translationKey="nav.admin" />
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
