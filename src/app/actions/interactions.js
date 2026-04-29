"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { comments, postLikes, posts } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

function cleanText(value, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

async function getPost(postId) {
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

export async function toggleLike(formData) {
  const userId = await requireUserId();
  const postId = formData.get("postId")?.toString().trim();

  if (!postId) throw new Error("Invalid post");

  const post = await getPost(postId);
  if (!post) throw new Error("Post not found");

  const [existingLike] = await db
    .select({ id: postLikes.id })
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);

  if (existingLike) {
    await db
      .delete(postLikes)
      .where(eq(postLikes.id, existingLike.id));

    await db
      .update(posts)
      .set({ likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)` })
      .where(eq(posts.id, postId));
  } else {
    await db.insert(postLikes).values({ postId, userId });

    await db
      .update(posts)
      .set({ likesCount: sql`${posts.likesCount} + 1` })
      .where(eq(posts.id, postId));

    await createNotification({
      userId: post.authorId,
      actorId: userId,
      type: "like",
      entityId: postId,
      postId,
    });
  }

  revalidatePath("/");
  revalidatePath("/profile");
  if (post.communityId) revalidatePath(`/communities?community=${post.communityId}`);

  return { ok: true };
}

export async function addComment(formData) {
  const userId = await requireUserId();
  const postId = formData.get("postId")?.toString().trim();
  const content = cleanText(formData.get("content"));

  if (!postId) throw new Error("Invalid post");
  if (!content) throw new Error("Comment cannot be empty");

  const post = await getPost(postId);
  if (!post) throw new Error("Post not found");

  const [comment] = await db
    .insert(comments)
    .values({ postId, authorId: userId, content })
    .returning();

  await db
    .update(posts)
    .set({ commentsCount: sql`${posts.commentsCount} + 1` })
    .where(eq(posts.id, postId));

  await createNotification({
    userId: post.authorId,
    actorId: userId,
    type: "comment",
    entityId: comment.id,
    postId,
  });

  revalidatePath("/");
  revalidatePath("/profile");
  if (post.communityId) revalidatePath(`/communities?community=${post.communityId}`);

  return { ok: true, comment };
}

export async function deleteComment(formData) {
  const userId = await requireUserId();
  const commentId = formData.get("commentId")?.toString().trim();

  if (!commentId) throw new Error("Invalid comment");

  const [comment] = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      authorId: comments.authorId,
      postAuthorId: posts.authorId,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!comment) throw new Error("Comment not found");

  if (comment.authorId !== userId && comment.postAuthorId !== userId) {
    throw new Error("Forbidden");
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  await db
    .update(posts)
    .set({ commentsCount: sql`GREATEST(${posts.commentsCount} - 1, 0)` })
    .where(eq(posts.id, comment.postId));

  revalidatePath("/");
  revalidatePath("/profile");

  return { ok: true };
}
