"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/shared/db/db";
import { posts, photos } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { saveUploadFileWithMeta } from "@/shared/storage/upload";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 80 * 1024 * 1024;

const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
];

export type CreatePostState = {
  ok: boolean;
  error: string | null;
  post?: typeof posts.$inferSelect;
};

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

function getMaxMediaSize(file: File): number {
  return isVideoFile(file) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
}

function isFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

const createPostSchema = z
  .object({
    content: z
      .string()
      .trim()
      .max(3000, { message: "Post exceeds 3000 characters" })
      .default(""),

    image: z
  .custom<File | null>()
  .optional()
  .refine(
    (file) => {
      if (!file || file.size === 0) return true;
      return file.size <= getMaxMediaSize(file);
    },
    { message: "Media file is too large." }
  )
  .refine(
    (file) => {
      if (!file || file.size === 0) return true;
      return ACCEPTED_MEDIA_TYPES.includes(file.type);
    },
    { message: "Invalid media format." }
  ),
  })
  .refine(
    (data) =>
      data.content.length > 0 || Boolean(data.image && data.image.size > 0),
    {
      message: "Post cannot be completely empty.",
      path: ["content"],
    }
  );

const deletePostSchema = z.object({
  postId: z.string().min(1, "Invalid post ID").trim(),
});

async function requireUserId(): Promise<string> {
  const session = await getSession();

  const userId = session?.userId;

  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Unauthorized");
  }

  return userId;
}

export async function createPost(
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const userId = await requireUserId();

  // Check rate limit
  const rateLimitResult = await checkRateLimitAsync(userId, "createPost");
  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      error: getRateLimitError(rateLimitResult.resetTime!),
    };
  }

  const imageEntry = formData.get("image");
  const image = isFile(imageEntry) ? imageEntry : null;

  const validatedFields = createPostSchema.safeParse({
    content: String(formData.get("content") ?? ""),
    image,
  });

  if (!validatedFields.success) {
    return {
      ok: false,
      error: validatedFields.error.issues[0]?.message || "Invalid data",
    };
  }

  const content = validatedFields.data.content;
  const validatedImage = validatedFields.data.image ?? null;

  let imageUrl: string | null = null;

  try {
    if (validatedImage && validatedImage.size > 0) {
      const isVideo = isVideoFile(validatedImage);
      const result = await saveUploadFileWithMeta(validatedImage, {
        subdir: "posts",
        prefix: isVideo ? "video" : "post",
        maxSize: getMaxMediaSize(validatedImage),
        access: "public",
        processImage: !isVideo,
      });
      imageUrl = result?.url ?? null;
    }

    const [post] = await db
      .insert(posts)
      .values({
        content,
        imageUrl,
        authorId: userId,
      })
      .returning();

    // If post has an image (not video), also add it to photos table
    if (imageUrl && validatedImage && !isVideoFile(validatedImage)) {
      await db.insert(photos).values({
        imageUrl,
        caption: content || null,
        isPrivate: false,
        ownerId: userId,
      });
    }

    revalidatePath("/");
    revalidatePath("/profile");
    revalidateTag(`feed-${userId}`, {});

    return {
      ok: true,
      post,
      error: null,
    };
  } catch (err) {
    console.error("Post creation failed:", err);

    return {
      ok: false,
      error: "Server error. Please try again.",
    };
  }
}

export async function deletePost(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const validatedFields = deletePostSchema.safeParse({
    postId: formData.get("postId"),
  });

  if (!validatedFields.success) {
    throw new Error(
      validatedFields.error.issues[0]?.message || "Invalid post ID"
    );
  }

  const { postId } = validatedFields.data;

  await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.authorId, userId)));

  revalidatePath("/");
  revalidatePath("/profile");
  revalidateTag(`feed-${userId}`, {});
}