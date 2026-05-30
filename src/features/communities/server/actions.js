"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import {
  communities,
  communityMembers,
  communityJoinRequests,
  comments,
  posts,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { saveUploadFileWithMeta } from "@/shared/storage/upload";
import {
  POST_TYPES,
  getCommunityContext,
  isModeratorRole,
  requireModerator,
  requireOwner,
} from "@/features/communities/server/queries";

// ======================================================
// Helpers
// ======================================================

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

function clean(value, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanCsv(value, max = 240) {
  return clean(value, max)
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20)
    .join(", ");
}

function revalidateCommunity(id) {
  revalidatePath("/communities");
  if (id) revalidatePath(`/communities/${id}`);
}

// ======================================================
// Community lifecycle
// ======================================================

export async function createCommunity(formData) {
  const userId = await requireUserId();
  const name = clean(formData.get("name"), 80);
  const description = clean(formData.get("description"), 500);
  const rules = clean(formData.get("rules"), 2000);
  const facultyTag = clean(formData.get("facultyTag"), 80) || null;
  const yearTag = clean(formData.get("yearTag"), 20) || null;

  const groupType = clean(formData.get("groupType"), 40) || "interest_group";
  const userInterests = cleanCsv(formData.get("interests"), 240) || "";
  const cleanInterests = userInterests
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter((t) => !["faculty_group", "year_group", "club", "student_council", "interest_group"].includes(t))
    .filter(Boolean)
    .join(", ");

  const interests = cleanInterests ? `${groupType}, ${cleanInterests}` : groupType;

  const isPrivate = formData.get("isPrivate") === "true" || formData.get("isPrivate") === "on";
  const avatarFile = formData.get("avatar");
  const hasAvatar =
    avatarFile &&
    typeof avatarFile !== "string" &&
    "size" in avatarFile &&
    avatarFile.size > 0;

  if (!name) throw new Error("Group name is required");

  const avatarResult = hasAvatar
    ? await saveUploadFileWithMeta(avatarFile, {
        subdir: "communities",
        prefix: "community",
        maxSize: 5 * 1024 * 1024,
        allowedMimePrefix: "image/",
        processImage: true,
      })
    : null;
  const avatar = avatarResult?.url ?? null;

  const [community] = await db
    .insert(communities)
    .values({
      name,
      description: description || null,
      rules: rules || null,
      facultyTag,
      yearTag,
      interests,
      isPrivate,
      avatar,
      creatorId: userId,
    })
    .returning();

  await db.insert(communityMembers).values({
    communityId: community.id,
    userId,
    role: "owner",
  });

  revalidateCommunity(community.id);
  return { ok: true, community };
}

export async function updateCommunity(formData) {
  const userId = await requireUserId();
  const communityId = clean(formData.get("communityId"));
  if (!communityId) throw new Error("Invalid community");

  await requireOwner(communityId, userId);

  const patch = {};
  if (formData.has("name")) {
    const name = clean(formData.get("name"), 80);
    if (!name) throw new Error("Group name is required");
    patch.name = name;
  }
  if (formData.has("description"))
    patch.description = clean(formData.get("description"), 500) || null;
  if (formData.has("rules"))
    patch.rules = clean(formData.get("rules"), 2000) || null;
  if (formData.has("facultyTag"))
    patch.facultyTag = clean(formData.get("facultyTag"), 80) || null;
  if (formData.has("yearTag"))
    patch.yearTag = clean(formData.get("yearTag"), 20) || null;

  if (formData.has("groupType") || formData.has("interests")) {
    const groupType = clean(formData.get("groupType"), 40) || "interest_group";
    let userInterests = "";
    if (formData.has("interests")) {
      userInterests = cleanCsv(formData.get("interests"), 240) || "";
    } else {
      const [existing] = await db
        .select({ interests: communities.interests })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);
      userInterests = existing?.interests || "";
    }

    const cleanInterests = userInterests
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter((t) => !["faculty_group", "year_group", "club", "student_council", "interest_group"].includes(t))
      .filter(Boolean)
      .join(", ");

    patch.interests = cleanInterests ? `${groupType}, ${cleanInterests}` : groupType;
  }
  if (formData.has("isPrivate")) {
    const v = formData.get("isPrivate");
    patch.isPrivate = v === "true" || v === "on";
  }

  const avatarFile = formData.get("avatar");
  if (
    avatarFile &&
    typeof avatarFile !== "string" &&
    "size" in avatarFile &&
    avatarFile.size > 0
  ) {
    patch.avatar = (await saveUploadFileWithMeta(avatarFile, {
      subdir: "communities",
      prefix: "community",
      maxSize: 5 * 1024 * 1024,
      allowedMimePrefix: "image/",
      processImage: true,
    }))?.url ?? null;
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = sql`now()`;
    await db.update(communities).set(patch).where(eq(communities.id, communityId));
  }

  revalidateCommunity(communityId);
  return { ok: true };
}

export async function deleteCommunity(formData) {
  const userId = await requireUserId();
  const communityId = clean(formData.get("communityId"));
  if (!communityId) throw new Error("Invalid community");

  await requireOwner(communityId, userId);
  await db.delete(communities).where(eq(communities.id, communityId));

  revalidatePath("/communities");
  return { ok: true };
}

// ======================================================
// Membership / join flow
// ======================================================

/**
 * For public communities → adds the user as a member.
 * For private communities → creates a pending join request.
 */
export async function joinCommunity(formData) {
  const userId = await requireUserId();
  const communityId = clean(formData.get("communityId"));
  const message = clean(formData.get("message"), 500);

  if (!communityId) throw new Error("Invalid community");

  const ctx = await getCommunityContext(communityId, userId);
  if (!ctx.community) throw new Error("Community not found");
  if (ctx.isMember) {
    revalidateCommunity(communityId);
    return { ok: true, joined: true };
  }

  if (ctx.community.isPrivate) {
    // Insert or re-open request
    await db
      .insert(communityJoinRequests)
      .values({
        communityId,
        userId,
        message: message || null,
      })
      .onConflictDoUpdate({
        target: [communityJoinRequests.communityId, communityJoinRequests.userId],
        set: {
          status: "pending",
          message: message || null,
          decidedAt: null,
          decidedBy: null,
        },
      });

    revalidateCommunity(communityId);
    return { ok: true, requested: true };
  }

  await db
    .insert(communityMembers)
    .values({ communityId, userId, role: "member" })
    .onConflictDoNothing();

  revalidateCommunity(communityId);
  return { ok: true, joined: true };
}

export async function leaveCommunity(formData) {
  const userId = await requireUserId();
  const communityId = clean(formData.get("communityId"));
  if (!communityId) throw new Error("Invalid community");

  const [community] = await db
    .select({ creatorId: communities.creatorId })
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);

  if (!community) throw new Error("Community not found");
  if (community.creatorId === userId) {
    throw new Error("Owner cannot leave the community. Transfer ownership or delete it instead.");
  }

  await db
    .delete(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId)
      )
    );

  revalidateCommunity(communityId);
  return { ok: true };
}

export async function cancelJoinRequest(formData) {
  const userId = await requireUserId();
  const communityId = clean(formData.get("communityId"));
  if (!communityId) throw new Error("Invalid community");

  // Only clear the pending request — leave approved/rejected rows for audit.
  await db
    .delete(communityJoinRequests)
    .where(
      and(
        eq(communityJoinRequests.communityId, communityId),
        eq(communityJoinRequests.userId, userId),
        sql`${communityJoinRequests.status}::text = 'pending'`
      )
    );

  revalidateCommunity(communityId);
  return { ok: true };
}

export async function approveJoinRequest(formData) {
  const userId = await requireUserId();
  const requestId = clean(formData.get("requestId"));
  if (!requestId) throw new Error("Invalid request");

  const [request] = await db
    .select({
      id: communityJoinRequests.id,
      communityId: communityJoinRequests.communityId,
      userId: communityJoinRequests.userId,
      status: communityJoinRequests.status,
    })
    .from(communityJoinRequests)
    .where(eq(communityJoinRequests.id, requestId))
    .limit(1);

  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") throw new Error("Request already handled");

  await requireModerator(request.communityId, userId);

  await db
    .insert(communityMembers)
    .values({
      communityId: request.communityId,
      userId: request.userId,
      role: "member",
    })
    .onConflictDoNothing();

  await db
    .update(communityJoinRequests)
    .set({
      status: "approved",
      decidedBy: userId,
      decidedAt: sql`now()`,
    })
    .where(eq(communityJoinRequests.id, requestId));

  revalidateCommunity(request.communityId);
  return { ok: true };
}

export async function rejectJoinRequest(formData) {
  const userId = await requireUserId();
  const requestId = clean(formData.get("requestId"));
  if (!requestId) throw new Error("Invalid request");

  const [request] = await db
    .select({
      id: communityJoinRequests.id,
      communityId: communityJoinRequests.communityId,
      status: communityJoinRequests.status,
    })
    .from(communityJoinRequests)
    .where(eq(communityJoinRequests.id, requestId))
    .limit(1);

  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") throw new Error("Request already handled");

  await requireModerator(request.communityId, userId);

  await db
    .update(communityJoinRequests)
    .set({
      status: "rejected",
      decidedBy: userId,
      decidedAt: sql`now()`,
    })
    .where(eq(communityJoinRequests.id, requestId));

  revalidateCommunity(request.communityId);
  return { ok: true };
}

// ======================================================
// Moderator / member management
// ======================================================

export async function setMemberRole(formData) {
  const userId = await requireUserId();
  const communityId = clean(formData.get("communityId"));
  const targetUserId = clean(formData.get("targetUserId"));
  const role = clean(formData.get("role"), 20);
  if (!communityId || !targetUserId) throw new Error("Invalid arguments");
  if (!["member", "moderator"].includes(role)) {
    throw new Error("Invalid role");
  }

  const ctx = await requireOwner(communityId, userId);

  if (targetUserId === ctx.community.creatorId) {
    throw new Error("Owner role cannot be changed");
  }

  const [target] = await db
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, targetUserId)
      )
    )
    .limit(1);
  if (!target) throw new Error("Member not found");

  await db
    .update(communityMembers)
    .set({ role })
    .where(eq(communityMembers.id, target.id));

  revalidateCommunity(communityId);
  return { ok: true };
}

export async function removeMember(formData) {
  const userId = await requireUserId();
  const communityId = clean(formData.get("communityId"));
  const targetUserId = clean(formData.get("targetUserId"));
  if (!communityId || !targetUserId) throw new Error("Invalid arguments");

  const ctx = await requireModerator(communityId, userId);

  if (targetUserId === ctx.community.creatorId) {
    throw new Error("Owner cannot be removed");
  }

  // Non-owner moderators cannot remove other moderators
  if (!ctx.isOwner) {
    const [target] = await db
      .select({ role: communityMembers.role })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, targetUserId)
        )
      )
      .limit(1);
    if (target && isModeratorRole(target.role)) {
      throw new Error("Only the owner can remove a moderator");
    }
  }

  await db
    .delete(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, targetUserId)
      )
    );

  revalidateCommunity(communityId);
  return { ok: true };
}

// ======================================================
// Posts
// ======================================================

export async function createCommunityPost(formData) {
  const userId = await requireUserId();
  const communityId = clean(formData.get("communityId"));
  const content = clean(formData.get("content"), 3000);
  const tags = cleanCsv(formData.get("tags"), 200) || null;
  const postType = (clean(formData.get("postType"), 40) || "discussion").toLowerCase();
  const imageEntry = formData.get("image");
  const hasImage =
    imageEntry &&
    typeof imageEntry !== "string" &&
    "size" in imageEntry &&
    imageEntry.size > 0;

  if (!communityId) throw new Error("Invalid community");
  if (!content && !hasImage) {
    return { ok: false, error: "Post cannot be empty" };
  }
  if (!POST_TYPES.includes(postType)) {
    throw new Error("Invalid post type");
  }

  const ctx = await getCommunityContext(communityId, userId);
  if (!ctx.community) throw new Error("Community not found");
  if (!ctx.isMember && !ctx.isPlatformStaff) {
    throw new Error("Join the community before posting");
  }

  // Only moderators/owners can post announcements
  if (postType === "announcement" && !ctx.isModerator) {
    throw new Error("Only moderators and the owner can post announcements");
  }

  const imageUrl = hasImage
    ? (await saveUploadFileWithMeta(imageEntry, {
        subdir: "posts",
        prefix: "post",
        maxSize: 5 * 1024 * 1024,
        allowedMimePrefix: "image/",
        processImage: true,
      }))?.url ?? null
    : null;

  await db.insert(posts).values({
    content,
    imageUrl,
    tags,
    postType,
    communityId,
    authorId: userId,
  });

  await db
    .update(communities)
    .set({ updatedAt: sql`now()` })
    .where(eq(communities.id, communityId));

  revalidateCommunity(communityId);
  return { ok: true };
}

async function getPostForModeration(postId) {
  const [row] = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      communityId: posts.communityId,
      postType: posts.postType,
      isPinned: posts.isPinned,
      isSolved: posts.isSolved,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  return row || null;
}

export async function togglePinPost(formData) {
  const userId = await requireUserId();
  const postId = clean(formData.get("postId"));
  if (!postId) throw new Error("Invalid post");

  const post = await getPostForModeration(postId);
  if (!post?.communityId) throw new Error("Post not found");

  await requireModerator(post.communityId, userId);

  const nextPinned = !post.isPinned;
  await db
    .update(posts)
    .set({
      isPinned: nextPinned,
      pinnedAt: nextPinned ? sql`now()` : null,
      pinnedBy: nextPinned ? userId : null,
    })
    .where(eq(posts.id, postId));

  revalidateCommunity(post.communityId);
  return { ok: true, isPinned: nextPinned };
}

export async function deleteCommunityPost(formData) {
  const userId = await requireUserId();
  const postId = clean(formData.get("postId"));
  if (!postId) throw new Error("Invalid post");

  const post = await getPostForModeration(postId);
  if (!post) throw new Error("Post not found");

  const isAuthor = post.authorId === userId;
  if (!isAuthor) {
    // Must be a community moderator or platform staff
    if (post.communityId) {
      await requireModerator(post.communityId, userId);
    } else {
      throw new Error("Forbidden");
    }
  }

  await db.delete(posts).where(eq(posts.id, postId));

  if (post.communityId) revalidateCommunity(post.communityId);
  revalidatePath("/");
  return { ok: true };
}

export async function markQuestionSolved(formData) {
  const userId = await requireUserId();
  const postId = clean(formData.get("postId"));
  const bestCommentId = clean(formData.get("bestCommentId")) || null;
  if (!postId) throw new Error("Invalid post");

  const post = await getPostForModeration(postId);
  if (!post) throw new Error("Post not found");
  if (post.postType !== "question") throw new Error("Not a question post");

  const isAuthor = post.authorId === userId;
  if (!isAuthor && post.communityId) {
    await requireModerator(post.communityId, userId);
  } else if (!isAuthor && !post.communityId) {
    throw new Error("Forbidden");
  }

  // Validate best comment belongs to this post if provided
  if (bestCommentId) {
    const [c] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.id, bestCommentId), eq(comments.postId, postId)))
      .limit(1);
    if (!c) throw new Error("Best answer must be a comment on this post");
  }

  await db
    .update(posts)
    .set({
      isSolved: true,
      bestCommentId: bestCommentId,
      solvedAt: sql`now()`,
    })
    .where(eq(posts.id, postId));

  if (post.communityId) revalidateCommunity(post.communityId);
  return { ok: true };
}

export async function unmarkQuestionSolved(formData) {
  const userId = await requireUserId();
  const postId = clean(formData.get("postId"));
  if (!postId) throw new Error("Invalid post");

  const post = await getPostForModeration(postId);
  if (!post) throw new Error("Post not found");

  const isAuthor = post.authorId === userId;
  if (!isAuthor && post.communityId) {
    await requireModerator(post.communityId, userId);
  } else if (!isAuthor && !post.communityId) {
    throw new Error("Forbidden");
  }

  await db
    .update(posts)
    .set({
      isSolved: false,
      bestCommentId: null,
      solvedAt: null,
    })
    .where(eq(posts.id, postId));

  if (post.communityId) revalidateCommunity(post.communityId);
  return { ok: true };
}
