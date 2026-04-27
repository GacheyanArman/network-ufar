"use server";

import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function createPost(formData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const content = formData.get("content");
  const image = formData.get("image");
  
  if ((!content || content.trim().length === 0) && (!image || image.size === 0)) {
    return;
  }

  let imageUrl = null;

  if (image && image.size > 0) {
    try {
      const buffer = Buffer.from(await image.arrayBuffer());
      const filename = `${Date.now()}-${image.name.replaceAll(" ", "_")}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");

      await mkdir(uploadDir, { recursive: true });

      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      
      imageUrl = `/uploads/${filename}`;
    } catch (e) {
      console.error("Image upload failed:", e);
      throw new Error("Failed to upload image. Server log has details.");
    }
  }

  await db.insert(posts).values({
    content: content ? content.trim() : "",
    imageUrl: imageUrl,
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