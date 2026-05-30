"use client";

import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";

type TabDefinition = {
  id: string;
  label: string;
  icon: string;
  postType?: string;
};

type CommunityTabsProps = {
  communityId: string;
  activeTab: string;
  tabs: TabDefinition[];
  counts: Record<string, number>;
};

export default function CommunityTabs({
  communityId,
  activeTab,
  tabs,
  counts,
}: CommunityTabsProps) {
  return (
    <nav className="uf-community-tabs" aria-label="Community sections">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const count = counts[tab.id] ?? 0;
        const href =
          tab.id === "all"
            ? `/communities/${communityId}`
            : `/communities/${communityId}?tab=${tab.id}`;

        return (
          <Link
            key={tab.id}
            href={href}
            scroll={false}
            className={`uf-community-tab ${isActive ? "is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <UiIcon name={tab.icon} size={16} />
            <span>{tab.label}</span>
            {count > 0 ? (
              <span className="uf-community-tab-count">{count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
