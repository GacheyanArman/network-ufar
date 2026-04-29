"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { saveUploadFile } from "@/lib/upload";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const createPostSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Post content cannot be empty" })
    .max(3000, { message: "Post content exceeds 3000 characters limit" })
    .trim(),
    
  image: z
    .any()
    .optional()
    .refine((file) => {
      if (!file || file.size === 0) return true;
      return file.size <= MAX_FILE_SIZE;
    }, { message: "Image must be less than 5MB." })
    .refine((file) => {
      if (!file || file.size === 0) return true;
      return ACCEPTED_IMAGE_TYPES.includes(file.type);
    }, { message: "Only .jpg, .jpeg, .png and .webp formats are supported." })
});

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function createPost(formData) {
  const userId = await requireUserId();

  const validatedFields = createPostSchema.safeParse({
    content: formData.get("content"),
    image: formData.get("image"),
  });


  if (!validatedFields.success) {
    return { 
      ok: false, 
      error: validatedFields.error.errors[0].message 
    };
  }


  const { content, image } = validatedFields.data;

  let imageUrl = null;

  if (image && image.size > 0) {
    imageUrl = await saveUploadFile(image, {
      subdir: "posts",
      prefix: "post",
      maxSize: MAX_FILE_SIZE,
    });
  }

  const [post] = await db
    .insert(posts)
    .values({
      content,
      imageUrl,
      authorId: userId,
    })
    .returning();

  revalidatePath("/");
  revalidatePath("/profile");

  return { ok: true, post };
}