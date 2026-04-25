"use server";

import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

export async function createPost(formData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const content = formData.get("content");
  if (!content || content.trim().length === 0) {
    return;
  }

  await db.insert(posts).values({
    content: content.trim(),
    authorId: session.userId,
  });

  revalidatePath("/");
  revalidatePath("/profile");
}

export async function deletePost(formData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const postId = formData.get("postId");

  try {
    await db.delete(posts).where(
      and(
        eq(posts.id, postId),
        eq(posts.authorId, session.userId)
      )
    );

    revalidatePath("/");
    revalidatePath("/profile");
  } catch (e) {
    console.error("Delete Error:", e);
  }
}