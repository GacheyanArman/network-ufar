"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { photoAlbums, photos } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { saveUploadFile } from "@/lib/upload";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function uploadPhoto(formData) {
  const userId = await requireUserId();
  const image = formData.get("image");
  const caption = String(formData.get("caption") || "").trim();
  const isPrivate = formData.get("isPrivate") === "true";
  const albumId = formData.get("albumId")?.toString().trim() || null;

  if (!image || image.size === 0) {
    throw new Error("No image file provided");
  }

  const imageUrl = await saveUploadFile(image, {
    subdir: "photos",
    prefix: "photo",
    maxSize: 5 * 1024 * 1024,
    allowedMimePrefix: "image/",
  });

  await db.insert(photos).values({
    imageUrl,
    caption: caption.slice(0, 240),
    isPrivate,
    albumId,
    ownerId: userId,
  });

  revalidatePath("/photos");
  revalidatePath("/profile");
  return { ok: true };
}

export async function createPhotoAlbum(formData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!title) throw new Error("Album title is required");

  await db.insert(photoAlbums).values({
    title: title.slice(0, 120),
    description: description.slice(0, 400),
    ownerId: userId,
  });

  revalidatePath("/photos");
  return { ok: true };
}

export async function deletePhotoAlbum(formData) {
  const userId = await requireUserId();
  const albumId = formData.get("albumId")?.toString().trim();

  if (!albumId) throw new Error("Invalid album");

  await db
    .delete(photoAlbums)
    .where(and(eq(photoAlbums.id, albumId), eq(photoAlbums.ownerId, userId)));

  revalidatePath("/photos");
  return { ok: true };
}

export async function deletePhoto(formData) {
  const userId = await requireUserId();
  const photoId = formData.get("photoId")?.toString().trim();

  if (!photoId) throw new Error("Invalid photo");

  await db
    .delete(photos)
    .where(and(eq(photos.id, photoId), eq(photos.ownerId, userId)));

  revalidatePath("/photos");
  revalidatePath("/profile");
  return { ok: true };
}
