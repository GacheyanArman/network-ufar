"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/shared/ui/UiIcon";
import { Suspense } from "react";

type MobileNavItemProps = {
  href: string;
  icon: string;
  translationKey: string;
  activeHrefs?: string[];
};

function MobileNavItem({ href, icon, translationKey, activeHrefs = [] }: MobileNavItemProps) {
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
      className={`mobile-nav-item ${isActive ? "active" : ""}`}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="mobile-nav-icon-wrapper">
        <UiIcon name={icon} size={20} />
      </span>
      <span className="mobile-nav-label">{t(translationKey)}</span>
    </Link>
  );
}

const MOBILE_ITEMS = [
  { href: "/today", icon: "home", key: "nav.today" },
  { href: "/feed", icon: "message-circle", key: "nav.feed" },
  { href: "/study-materials", icon: "folder", key: "nav.materials", activeHrefs: ["/materials", "/library"] },
  { href: "/communities", icon: "users", key: "nav.communities", activeHrefs: ["/groups", "/study-groups"] },
  { href: "/messages", icon: "send", key: "nav.messages" },
];

function MobileBottomNavContent() {
  const { t } = useLanguage();

  return (
    <nav className="mobile-bottom-nav" aria-label={t("nav.primary") || "Mobile navigation"}>
      {MOBILE_ITEMS.map((item) => (
        <MobileNavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          translationKey={item.key}
          activeHrefs={item.activeHrefs}
        />
      ))}
    </nav>
  );
}

export default function MobileBottomNav() {
  return (
    <Suspense fallback={
      <nav className="mobile-bottom-nav" style={{ height: "64px", background: "rgba(255, 255, 255, 0.8)" }}>
        <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse" style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e2e8f0" }} />
          ))}
        </div>
      </nav>
    }>
      <MobileBottomNavContent />
    </Suspense>
  );
}
