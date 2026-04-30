"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { comments, postLikes, posts, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { createNotification } from "@/lib/notifications";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";

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

function cleanText(value: FormDataEntryValue | null, max = 1000): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
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
  const rateLimitResult = checkRateLimit(userId, "toggleLike");
  if (!rateLimitResult.allowed) {
    throw new Error(getRateLimitError(rateLimitResult.resetTime!));
  }

  const postId = String(formData.get("postId") || "").trim();

  if (!postId) {
    throw new Error("Invalid post");
  }

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
  const rateLimitResult = checkRateLimit(userId, "createComment");
  if (!rateLimitResult.allowed) {
    throw new Error(getRateLimitError(rateLimitResult.resetTime!));
  }

  const postId = String(formData.get("postId") || "").trim();
  const content = cleanText(formData.get("content"));

  if (!postId) {
    throw new Error("Invalid post");
  }

  if (!content) {
    throw new Error("Comment cannot be empty");
  }

  const post = await getPost(postId);

  if (!post) {
    throw new Error("Post not found");
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
    })
    .returning({
      id: comments.id,
      postId: comments.postId,
      authorId: comments.authorId,
      content: comments.content,
      createdAt: comments.createdAt,
    });

  await db
    .update(posts)
    .set({
      commentsCount: sql`${posts.commentsCount} + 1`,
    })
    .where(eq(posts.id, postId));

  await createNotification({
    userId: post.authorId,
    actorId: userId,
    type: "comment",
    entityId: comment.id,
    postId,
  });

  await revalidatePostPlaces(post);

  return {
    ok: true,
    comment: {
      ...comment,
      authorName: author?.fullName || "Student",
    },
  };
}

export async function deleteComment(
  formData: FormData
): Promise<ActionResult> {
  const userId = await requireUserId();
  const commentId = String(formData.get("commentId") || "").trim();

  if (!commentId) {
    throw new Error("Invalid comment");
  }

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

  return {
    ok: true,
  };
}