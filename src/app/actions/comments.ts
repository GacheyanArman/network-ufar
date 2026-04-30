"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { comments, posts, notifications } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, desc, sql } from "drizzle-orm";
import { commentSchema } from "@/lib/validations";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";

export async function createComment(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  // Check rate limit
  const rateLimitResult = checkRateLimit(userId, "createComment");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime!) };
  }

  const postId = formData.get("postId") as string;
  const content = formData.get("content") as string;

  // Validate with Zod
  const validatedFields = commentSchema.safeParse({
    postId,
    content,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Invalid data" };
  }

  const validatedData = validatedFields.data;

  try {
    // Create comment - using explicit type assertion
    const [comment] = await db
      .insert(comments)
      .values({
        postId: validatedData.postId as string,
        authorId: userId,
        content: validatedData.content as string,
      } as any)
      .returning();

    // Increment comments count on post
    await db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} + 1`,
      })
      .where(eq(posts.id, validatedData.postId));

    // Get post author to create notification
    const [post] = await db
      .select({ authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, validatedData.postId))
      .limit(1);

    // Create notification if commenting on someone else's post
    if (post && post.authorId !== userId) {
      await db.insert(notifications).values({
        userId: post.authorId,
        actorId: userId,
        type: "comment",
        postId: validatedData.postId,
        entityId: comment.id,
      } as any);
    }

    revalidatePath("/");
    revalidatePath(`/profile/${userId}`);

    return { success: true, comment };
  } catch (error) {
    console.error("Error creating comment:", error);
    return { error: "Failed to create comment" };
  }
}

export async function deleteComment(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const commentId = formData.get("commentId") as string;

  if (!commentId) {
    return { error: "Comment ID is required" };
  }

  try {
    // Check if user owns the comment
    const [comment] = await db
      .select({ authorId: comments.authorId, postId: comments.postId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!comment) {
      return { error: "Comment not found" };
    }

    if (comment.authorId !== userId) {
      return { error: "You can only delete your own comments" };
    }

    // Delete comment
    await db.delete(comments).where(eq(comments.id, commentId));

    // Decrement comments count on post
    await db
      .update(posts)
      .set({
        commentsCount: sql`GREATEST(0, ${posts.commentsCount} - 1)`,
      })
      .where(eq(posts.id, comment.postId));

    revalidatePath("/");
    revalidatePath(`/profile/${userId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { error: "Failed to delete comment" };
  }
}

export async function getComments(postId: string) {
  try {
    const commentsList = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        authorId: comments.authorId,
      })
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));

    return commentsList;
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
}
