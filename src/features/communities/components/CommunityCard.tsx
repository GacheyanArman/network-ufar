"use client";

import Image from "next/image";
import Link from "next/link";
import CommunityJoinButton, {
  JoinState,
} from "@/features/communities/components/CommunityJoinButton";
import UiIcon from "@/shared/ui/UiIcon";

type CommunityCardProps = {
  community: {
    id: string;
    name: string;
    description?: string | null;
    avatar?: string | null;
    thumbnailUrl?: string | null;
    memberCount?: number;
    newPostsCount?: number;
    lastActivity?: string | null;
    isPrivate?: boolean | null;
    facultyTag?: string | null;
    yearTag?: string | null;
<<<<<<< HEAD
    interests?: string | null;
=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
  };
  joinState: JoinState;
};

<<<<<<< HEAD
const typeLabels: Record<string, string> = {
  faculty_group: "Faculty Group",
  year_group: "Year Group",
  club: "Club",
  student_council: "Student Council",
  interest_group: "Interest Group",
};

const typeStyles: Record<string, { bg: string; color: string }> = {
  faculty_group: { bg: "var(--purple-soft, #f3e8ff)", color: "var(--purple, #7c3aed)" },
  year_group: { bg: "var(--french-blue-soft, #eff6ff)", color: "var(--french-blue, #2563eb)" },
  club: { bg: "#fffbeb", color: "var(--warning, #d97706)" },
  student_council: { bg: "var(--success-soft, #f0fdf4)", color: "var(--success, #16a34a)" },
  interest_group: { bg: "var(--bg-hover, #f1f5f9)", color: "var(--text-secondary, #475569)" },
};

=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
export default function CommunityCard({
  community,
  joinState,
}: CommunityCardProps) {
  const initial = community.name.charAt(0).toUpperCase();
  const isPrivate = Boolean(community.isPrivate);

<<<<<<< HEAD
  const firstInterest = (community.interests || "").split(",")[0]?.trim();
  let groupType = "interest_group";
  if (["faculty_group", "year_group", "club", "student_council", "interest_group"].includes(firstInterest)) {
    groupType = firstInterest;
  } else {
    // Fallback/deduction:
    if (community.facultyTag) groupType = "faculty_group";
    else if (community.yearTag) groupType = "year_group";
    else if (community.name.toLowerCase().includes("club")) groupType = "club";
    else if (community.name.toLowerCase().includes("council")) groupType = "student_council";
  }
  const typeLabel = typeLabels[groupType];
  const styleMeta = typeStyles[groupType] || typeStyles.interest_group;

=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
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
        style={{ textDecoration: "none", position: "relative", overflow: "hidden" }}
      >
        {(community.thumbnailUrl || community.avatar) ? (
          <Image
            src={(community.thumbnailUrl || community.avatar) as string}
            alt={community.name}
            fill
            style={{ objectFit: "cover" }}
          />
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

<<<<<<< HEAD
          <span
            style={{
              background: styleMeta.bg,
              color: styleMeta.color,
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {typeLabel}
          </span>

=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
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
