"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/components/UiIcon";

type NavItemProps = {
  href: string;
  icon: string;
  translationKey: string;
  badge?: number;
};

function NavItem({ href, icon, translationKey, badge }: NavItemProps) {
  const { t } = useLanguage();

  return (
    <Link href={href} className="nav-item">
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

export default function NavigationMenu({ unreadNotifications }: { unreadNotifications: number }) {
  return (
    <nav className="student-nav card">
      <div className="nav-section">
        <NavItem href="/" icon="news" translationKey="nav.myNews" />
        <NavItem href="/search" icon="search" translationKey="nav.search" />
        <NavItem
          href="/notifications"
          icon="bell"
          translationKey="nav.notifications"
          badge={unreadNotifications}
        />
        <NavItem href="/messages" icon="message" translationKey="nav.messages" />
        <NavItem href="/friends" icon="users" translationKey="nav.friends" />
        <NavItem href="/profile" icon="user" translationKey="nav.myProfile" />
        <NavItem href="/communities" icon="group" translationKey="nav.communities" />
        <NavItem href="/photos" icon="image" translationKey="nav.photos" />
        <NavItem href="/events" icon="calendar" translationKey="nav.events" />
        <NavItem href="/calendar" icon="calendar" translationKey="nav.calendar" />
      </div>

      <div className="divider"></div>

      <div className="nav-section">
        <NavItem href="/library" icon="book" translationKey="nav.library" />
        <NavItem href="/study-materials" icon="folder" translationKey="nav.materials" />
      </div>
    </nav>
  );
}
