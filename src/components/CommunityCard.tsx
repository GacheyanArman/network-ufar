"use client";

import Link from "next/link";
import { joinCommunity, leaveCommunity } from "@/app/actions/community";
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
    category?: string | null;
  };
  isJoined: boolean;
  currentUserId?: string;
  isCreator?: boolean;
};

export default function CommunityCard({
  community,
  isJoined,
  currentUserId,
  isCreator = false,
}: CommunityCardProps) {
  const initial = community.name.charAt(0).toUpperCase();

  return (
    <div className="card" style={{ padding: "16px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
      <Link
        href={`/communities/${community.id}`}
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, var(--french-blue) 0%, var(--french-navy) 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          fontWeight: "900",
          textDecoration: "none",
          flexShrink: 0,
          overflow: "hidden"
        }}
      >
        {community.avatar ? (
          <img src={community.avatar} alt={community.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initial
        )}
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/communities/${community.id}`}
          style={{
            color: "var(--text-primary)",
            fontSize: "15px",
            fontWeight: "900",
            textDecoration: "none",
            display: "block",
            marginBottom: "4px"
          }}
        >
          {community.name}
        </Link>

        {community.description && (
          <p style={{
            margin: "0 0 8px 0",
            color: "var(--text-secondary)",
            fontSize: "13px",
            lineHeight: "1.4",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}>
            {community.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: "700" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <UiIcon name="users" size={14} />
            {community.memberCount || 0} members
          </span>
          {community.newPostsCount !== undefined && community.newPostsCount > 0 && (
            <span style={{ color: "var(--french-blue)", fontWeight: "800" }}>
              • {community.newPostsCount} new posts
            </span>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {isJoined ? (
          <form action={leaveCommunity}>
            <input type="hidden" name="communityId" value={community.id} />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={isCreator}
              style={{ minHeight: "44px", padding: "0 20px", fontSize: "15px" }}
            >
              {isCreator ? "Owner" : "Leave"}
            </button>
          </form>
        ) : (
          <form action={joinCommunity}>
            <input type="hidden" name="communityId" value={community.id} />
            <button type="submit" className="btn btn-primary" style={{ minHeight: "44px", padding: "0 20px", fontSize: "15px" }}>
              Join
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
