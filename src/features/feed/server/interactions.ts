"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/shared/db/db";
import {
  comments,
  commentLikes,
  postLikes,
  postSaves,
  posts,
  users,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { createNotification } from "@/features/notifications/server/queries";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import {
  parseFormDataWith,
  postIdFormSchema,
  addCommentFormSchema,
  commentIdFormSchema,
} from "@/shared/validations/validations";

type ActionResult<T = unknown> = {
  ok: boolean;
  error?: string;
} & T;

async function requireUserId(): Promise<string> {
  const session = await getSession();
  const userId = session?.userId;

  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Unauthorized");
  }

  return userId;
}

async function getPost(postId: string) {
  const [post] = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      communityId: posts.communityId,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  return post || null;
}

async function revalidatePostPlaces(post: {
  authorId: string;
  communityId?: string | null;
}) {
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath(`/profile/${post.authorId}`);

  if (post.communityId) {
    revalidatePath("/communities");
  }
}

export async function toggleLike(
  formData: FormData
): Promise<ActionResult<{ liked: boolean; likesCountDelta: number }>> {
  const userId = await requireUserId();

  // Check rate limit
  const rateLimitResult = await checkRateLimitAsync(userId, "toggleLike");
  if (!rateLimitResult.allowed) {
    throw new Error(getRateLimitError(rateLimitResult.resetTime ?? Date.now()));
  }

  const { postId } = parseFormDataWith(postIdFormSchema, formData);

  const post = await getPost(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  const [existingLike] = await db
    .select({ id: postLikes.id })
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);

  if (existingLike) {
    await db.delete(postLikes).where(eq(postLikes.id, existingLike.id));

    await db
      .update(posts)
      .set({
        likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)`,
      })
      .where(eq(posts.id, postId));

    await revalidatePostPlaces(post);
    revalidateTag(`feed-${userId}`, {});

    return {
      ok: true,
      liked: false,
      likesCountDelta: -1,
    };
  }

  await db
    .insert(postLikes)
    .values({
      postId,
      userId,
    })
    .onConflictDoNothing();

  await db
    .update(posts)
    .set({
      likesCount: sql`${posts.likesCount} + 1`,
    })
    .where(eq(posts.id, postId));

  await createNotification({
    userId: post.authorId,
    actorId: userId,
    type: "like",
    entityId: postId,
    postId,
  });

  await revalidatePostPlaces(post);
  revalidateTag(`feed-${userId}`, {});

  return {
    ok: true,
    liked: true,
    likesCountDelta: 1,
  };
}

export async function addComment(
  formData: FormData
): Promise<
  ActionResult<{
    comment: {
      id: string;
      postId: string;
      authorId: string;
      authorName: string;
      content: string;
      createdAt: Date;
    };
  }>
> {
  const userId = await requireUserId();

  // Check rate limit
  const rateLimitResult = await checkRateLimitAsync(userId, "createComment");
  if (!rateLimitResult.allowed) {
    throw new Error(getRateLimitError(rateLimitResult.resetTime ?? Date.now()));
  }

  const parsed = parseFormDataWith(addCommentFormSchema, formData);
  const postId = parsed.postId;
  const content = parsed.content.replace(/\s+/g, " ");
  const parentId = parsed.parentId || null;

  const post = await getPost(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  // Verify the parent comment belongs to the same post (and is a top-level
  // comment, so we don't end up with infinitely deep threads).
  let resolvedParent: { id: string; authorId: string; parentId: string | null } | null = null;
  if (parentId) {
    const [parent] = await db
      .select({
        id: comments.id,
        authorId: comments.authorId,
        postId: comments.postId,
        parentId: comments.parentId,
      })
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);

    if (!parent || parent.postId !== postId) {
      throw new Error("Invalid parent comment");
    }

    // Flatten replies-to-replies into the same thread (parent of parent).
    resolvedParent = {
      id: parent.parentId || parent.id,
      authorId: parent.authorId,
      parentId: parent.parentId,
    };
  }

  const [author] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [comment] = await db
    .insert(comments)
    .values({
      postId,
      authorId: userId,
      content,
      parentId: resolvedParent?.id || null,
    })
    .returning({
      id: comments.id,
      postId: comments.postId,
      authorId: comments.authorId,
      content: comments.content,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
    });

  await db
    .update(posts)
    .set({
      commentsCount: sql`${posts.commentsCount} + 1`,
    })
    .where(eq(posts.id, postId));

  // Notify the parent-comment author for replies, otherwise the post author.
  const notifyTarget =
    resolvedParent && resolvedParent.authorId !== userId
      ? resolvedParent.authorId
      : post.authorId;

  if (notifyTarget !== userId) {
    await createNotification({
      userId: notifyTarget,
      actorId: userId,
      type: "comment",
      entityId: comment.id,
      postId,
    });
  }

  await revalidatePostPlaces(post);
  revalidateTag(`feed-${userId}`, {});

  return {
    ok: true,
    comment: {
      ...comment,
      authorName: author?.fullName || "Student",
    },
  };
}

/**
 * Toggle like on a post comment. Returns the new state.
 */
export async function togglePostCommentLike(
  formData: FormData
): Promise<ActionResult<{ liked: boolean; likesCount: number }>> {
  const userId = await requireUserId();
  const { commentId } = parseFormDataWith(commentIdFormSchema, formData);

  const [comment] = await db
    .select({ id: comments.id, postId: comments.postId, authorId: comments.authorId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!comment) throw new Error("Comment not found");

  const [existing] = await db
    .select({ id: commentLikes.id })
    .from(commentLikes)
    .where(
      and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)),
    )
    .limit(1);

  let liked: boolean;
  if (existing) {
    await db.delete(commentLikes).where(eq(commentLikes.id, existing.id));
    await db
      .update(comments)
      .set({ likesCount: sql`GREATEST(${comments.likesCount} - 1, 0)` })
      .where(eq(comments.id, commentId));
    liked = false;
  } else {
    try {
      await db.insert(commentLikes).values({ commentId, userId });
      await db
        .update(comments)
        .set({ likesCount: sql`${comments.likesCount} + 1` })
        .where(eq(comments.id, commentId));
      liked = true;
    } catch {
      // Unique-violation: another tab raced us to like the same comment.
      liked = true;
    }
  }

  // Notify the comment author when someone else likes their comment.
  if (liked && comment.authorId !== userId) {
    await createNotification({
      userId: comment.authorId,
      actorId: userId,
      type: "like",
      entityId: comment.id,
      postId: comment.postId,
    });
  }

  const [{ count }] = await db
    .select({ count: comments.likesCount })
    .from(comments)
    .where(eq(comments.id, commentId));

  return { ok: true, liked, likesCount: Number(count || 0) };
}

type ViewerComment = {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  parentId: string | null;
  likesCount: number;
  isLikedByMe: boolean;
  replies?: ViewerComment[];
};

/**
 * Fetch all comments for a post, hydrated with like state and grouped into a
 * 2-level tree (top-level comment + flat replies, Instagram-style).
 */
export async function getPostCommentsForViewer(
  postId: string,
): Promise<ViewerComment[]> {
  if (!postId) return [];
  const session = await getSession();
  const currentUserId =
    typeof session?.userId === "string" ? session.userId : null;

  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.fullName,
      authorImage: sql<string | null>`coalesce(${users.image}, ${users.avatarUrl})`,
      parentId: comments.parentId,
      likesCount: comments.likesCount,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));

  // Pre-fetch which of these the current user has liked, in one query.
  let likedSet = new Set<string>();
  if (currentUserId && rows.length > 0) {
    const ids = rows.map((r: any) => r.id);
    const likedRows = await db
      .select({ commentId: commentLikes.commentId })
      .from(commentLikes)
      .where(
        and(
          eq(commentLikes.userId, currentUserId),
          inArray(commentLikes.commentId, ids),
        ),
      );
    likedSet = new Set(likedRows.map((r: any) => r.commentId));
  }

  const byId = new Map<string, ViewerComment>();
  const tree: ViewerComment[] = [];
  for (const row of rows) {
    const node: ViewerComment = {
      ...row,
      likesCount: Number(row.likesCount || 0),
      isLikedByMe: likedSet.has(row.id),
      replies: [],
    };
    byId.set(row.id, node);
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId)!.replies!.push(node);
    } else {
      tree.push(node);
    }
  }
  return tree;
}

export async function deleteComment(
  formData: FormData
): Promise<ActionResult> {
  const userId = await requireUserId();
  const { commentId } = parseFormDataWith(commentIdFormSchema, formData);

  const [comment] = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      authorId: comments.authorId,
      postAuthorId: posts.authorId,
      communityId: posts.communityId,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!comment) {
    throw new Error("Comment not found");
  }

  const canDelete =
    comment.authorId === userId || comment.postAuthorId === userId;

  if (!canDelete) {
    throw new Error("Forbidden");
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  await db
    .update(posts)
    .set({
      commentsCount: sql`GREATEST(${posts.commentsCount} - 1, 0)`,
    })
    .where(eq(posts.id, comment.postId));

  await revalidatePostPlaces({
    authorId: comment.postAuthorId,
    communityId: comment.communityId,
  });
  revalidateTag(`feed-${userId}`, {});

  return {
    ok: true,
  };
}

export async function toggleSavePost(
  formData: FormData
): Promise<ActionResult<{ saved: boolean }>> {
  const userId = await requireUserId();

  const { postId } = parseFormDataWith(postIdFormSchema, formData);

  const post = await getPost(postId);
  if (!post) {
    throw new Error("Post not found");
  }

  const [existingSave] = await db
    .select({ id: postSaves.id })
    .from(postSaves)
    .where(and(eq(postSaves.postId, postId), eq(postSaves.userId, userId)))
    .limit(1);

  if (existingSave) {
    await db.delete(postSaves).where(eq(postSaves.id, existingSave.id));
    await revalidatePostPlaces(post);
    revalidateTag(`feed-${userId}`, {});
    return {
      ok: true,
      saved: false,
    };
  }

  await db
    .insert(postSaves)
    .values({
      postId,
      userId,
    })
    .onConflictDoNothing();

  if (post.authorId !== userId) {
    await createNotification({
      userId: post.authorId,
      actorId: userId,
      type: "save",
      entityId: postId,
      postId,
    });
  }

  await revalidatePostPlaces(post);
  revalidateTag(`feed-${userId}`, {});

  return {
    ok: true,
    saved: true,
  };
}