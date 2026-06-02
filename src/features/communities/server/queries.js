import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db/db";
import { communities, communityMembers } from "@/shared/db/schema";
import { getUserRole, isStaff } from "@/shared/auth/roles";

// --------- Canonical post types ---------
export const POST_TYPES = [
  "discussion",
  "question",
  "study_group",
  "material",
  "event",
  "announcement",
];

export const POST_TYPE_LABELS = {
  discussion: "Discussion",
  question: "Question",
  study_group: "Study Group",
  material: "Material",
  event: "Event",
  announcement: "Announcement",
};

// --------- Tab configuration ---------
export const COMMUNITY_TABS = [
  { id: "all", label: "Posts", icon: "news" },
  { id: "materials", label: "Materials", icon: "book", postType: "material" },
  { id: "events", label: "Events", icon: "calendar", postType: "event" },
];

export function resolveTab(tabId) {
  return COMMUNITY_TABS.find((t) => t.id === tabId) || COMMUNITY_TABS[0];
}

// --------- Community roles ---------
export const COMMUNITY_ROLES = {
  OWNER: "owner",
  MODERATOR: "moderator",
  MEMBER: "member",
};

export function isOwnerRole(role) {
  return role === COMMUNITY_ROLES.OWNER || role === "admin";
}

export function isModeratorRole(role) {
  return role === COMMUNITY_ROLES.MODERATOR || isOwnerRole(role);
}

export function roleBadge(role) {
  if (isOwnerRole(role)) return { label: "Owner", tone: "gold" };
  if (role === COMMUNITY_ROLES.MODERATOR) return { label: "Moderator", tone: "blue" };
  return null;
}

// --------- Membership lookup ---------
export async function getMembership(communityId, userId) {
  if (!communityId || !userId) return null;

  const [row] = await db
    .select({
      id: communityMembers.id,
      role: communityMembers.role,
      createdAt: communityMembers.createdAt,
      userId: communityMembers.userId,
      communityId: communityMembers.communityId,
    })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId)
      )
    )
    .limit(1);

  return row || null;
}

export async function getCommunityBasics(communityId) {
  if (!communityId) return null;
  const [row] = await db
    .select({
      id: communities.id,
      name: communities.name,
      creatorId: communities.creatorId,
      isPrivate: communities.isPrivate,
    })
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);

  return row || null;
}

// --------- Authorization helpers ---------
/**
 * Returns the user's community context:
 *   { community, membership, role, isOwner, isModerator, isMember, isStaff }
 */
export async function getCommunityContext(communityId, userId) {
  const community = await getCommunityBasics(communityId);
  if (!community) {
    return {
      community: null,
      membership: null,
      role: null,
      isOwner: false,
      isModerator: false,
      isMember: false,
      isPlatformStaff: false,
    };
  }

  const [membership, platformRole] = await Promise.all([
    userId ? getMembership(communityId, userId) : null,
    userId ? getUserRole(userId) : "user",
  ]);

  const role = membership?.role || null;
  const isOwner = userId ? community.creatorId === userId || isOwnerRole(role) : false;
  const isModerator = isOwner || isModeratorRole(role);
  const isMember = Boolean(membership);
  const isPlatformStaff = isStaff(platformRole);

  return {
    community,
    membership,
    role: isOwner ? COMMUNITY_ROLES.OWNER : role,
    isOwner,
    isModerator: isModerator || isPlatformStaff,
    isMember,
    isPlatformStaff,
  };
}

export async function requireMembership(communityId, userId) {
  const membership = await getMembership(communityId, userId);
  if (!membership) throw new Error("You must join the community first");
  return membership;
}

export async function requireModerator(communityId, userId) {
  const ctx = await getCommunityContext(communityId, userId);
  if (!ctx.community) throw new Error("Community not found");
  if (!ctx.isModerator) throw new Error("Forbidden");
  return ctx;
}

export async function requireOwner(communityId, userId) {
  const ctx = await getCommunityContext(communityId, userId);
  if (!ctx.community) throw new Error("Community not found");
  if (!ctx.isOwner && !ctx.isPlatformStaff) throw new Error("Forbidden");
  return ctx;
}

// --------- Recommendations scoring ---------
/**
 * Score a community against a user based on faculty, year, interests.
 * Interests are comma-separated strings on both sides.
 */
export function scoreCommunity(community, user) {
  if (!community || !user) return 0;
  let score = 0;

  const userFaculty = (user.faculty || "").toLowerCase();
  const userInterests = (user.bio || "")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);

  const cFaculty = (community.facultyTag || "").toLowerCase();
  const cName = (community.name || "").toLowerCase();
  const cInterests = (community.interests || "")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);

  // Faculty match — strongest signal
  if (userFaculty && cFaculty && userFaculty === cFaculty) score += 10;
  else if (userFaculty && cName.includes(userFaculty)) score += 6;

  // Year tag in name
  if (community.yearTag && cName.includes(String(community.yearTag).toLowerCase())) {
    score += 3;
  }

  // Interests overlap
  for (const interest of userInterests) {
    if (!interest) continue;
    if (cInterests.includes(interest)) score += 2;
    if (cName.includes(interest)) score += 1;
  }

  // Newer communities get a tiny nudge
  if (community.createdAt) {
    const days =
      (Date.now() - new Date(community.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (days < 30) score += 1;
  }

  return score;
}

// Utility: can this user post an announcement?
export function canPostAnnouncement(ctx) {
  return Boolean(ctx?.isModerator);
}

// Utility: can this user pin/unpin?
export function canPin(ctx) {
  return Boolean(ctx?.isModerator);
}

// Utility: can mark as solved?
//   - original question author
//   - or community moderator
export function canMarkSolved(ctx, question) {
  if (!ctx || !question) return false;
  if (ctx.isModerator) return true;
  return ctx.membership?.userId
    ? ctx.membership.userId === question.authorId
    : false;
}
