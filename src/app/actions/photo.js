"use server";

import { db } from "@/lib/db";
import { photos, photoAlbums } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function uploadPhoto(formData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const image = formData.get("image");
  const caption = formData.get("caption") || "";
  const isPrivate = formData.get("isPrivate") === "true";
  const albumId = formData.get("albumId");

  if (!image || image.size === 0) {
    throw new Error("No image file provided");
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const filename = `photo-${Date.now()}-${image.name.replaceAll(" ", "_")}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "photos");
    await mkdir(uploadDir, { recursive: true });
    
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    await db.insert(photos).values({
      imageUrl: `/uploads/photos/${filename}`,
      caption: caption.trim(),
      isPrivate: isPrivate,
      albumId: albumId || null,
      ownerId: session.userId,
    });

    revalidatePath("/photos");
  } catch (e) {
    console.error("Photo upload failed:", e);
    throw new Error("Server error during upload");
  }
}

export async function deletePhotoAlbum(formData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const albumId = formData.get("albumId");

  try {
    await db.delete(photoAlbums).where(
      and(
        eq(photoAlbums.id, albumId),
        eq(photoAlbums.ownerId, session.userId)
      )
    );
    revalidatePath("/photos");
  } catch (e) {
    console.error("Delete Album Error:", e);
    throw new Error("Failed to delete album");
  }
}

export async function deletePhoto(formData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const photoId = formData.get("photoId");

  try {
    await db.delete(photos).where(
      and(
        eq(photos.id, photoId),
        eq(photos.ownerId, session.userId)
      )
    );
    revalidatePath("/photos");
    revalidatePath("/profile");
  } catch (e) {
    console.error("Delete Photo Error:", e);
    throw new Error("Failed to delete photo");
  }
}