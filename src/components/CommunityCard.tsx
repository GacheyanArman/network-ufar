"use client";

import Link from "next/link";
import CommunityJoinButton, {
  JoinState,
} from "@/components/CommunityJoinButton";
import UiIcon from "@/components/UiIcon";

type CommunityCardProps = {
  community: {
    id: string;
    name: string;
    description?: string | null;
    avatar?: string | null;
    memberCount?: number;
    newPostsCount?: number;
    lastActivity?: string | null;
    isPrivate?: boolean | null;
    facultyTag?: string | null;
    yearTag?: string | null;
  };
  joinState: JoinState;
};

export default function CommunityCard({
  community,
  joinState,
}: CommunityCardProps) {
  const initial = community.name.charAt(0).toUpperCase();
  const isPrivate = Boolean(community.isPrivate);

  return (
    <div
      className="card"
      style={{
        padding: 16,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <Link
        href={`/communities/${community.id}`}
        className="uf-community-avatar small"
        style={{ textDecoration: "none" }}
      >
        {community.avatar ? (
          <img src={community.avatar} alt={community.name} />
        ) : (
          initial
        )}
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 4,
          }}
        >
          <Link
            href={`/communities/${community.id}`}
            style={{
              color: "var(--text-primary)",
              fontSize: "15px",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            {community.name}
          </Link>

          {isPrivate ? (
            <span className="uf-privacy-badge private">
              <UiIcon name="eye" size={12} />
              Private
            </span>
          ) : null}
        </div>

        {community.description && (
          <p
            style={{
              margin: "0 0 8px 0",
              color: "var(--text-secondary)",
              fontSize: 13,
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {community.description}
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            fontSize: 13,
            color: "var(--text-secondary)",
            fontWeight: 700,
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <UiIcon name="users" size={14} />
            {community.memberCount || 0} members
          </span>

          {community.facultyTag ? (
            <span className="uf-community-pill">{community.facultyTag}</span>
          ) : null}
          {community.yearTag ? (
            <span className="uf-community-pill">{community.yearTag}</span>
          ) : null}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <CommunityJoinButton
          communityId={community.id}
          isPrivate={isPrivate}
          state={joinState}
          size="sm"
        />
      </div>
    </div>
  );
}
