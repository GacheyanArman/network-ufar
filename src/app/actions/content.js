"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  communities,
  friendships,
  messages,
  photoAlbums,
  photos,
  studyMaterials,
} from "@/lib/schema";

async function requireUser() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  return session;
}

export async function addFriend(formData) {
  const session = await requireUser();
  const receiverId = formData.get("receiverId");

  if (!receiverId || receiverId === session.userId) return;

  const existing = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.requesterId, session.userId),
        eq(friendships.receiverId, receiverId)
      )
    );

  if (existing.length === 0) {
    await db.insert(friendships).values({
      requesterId: session.userId,
      receiverId,
      status: "pending",
    });
  }

  revalidatePath("/friends");
}

export async function sendMessage(formData) {
  const session = await requireUser();

  const receiverId = formData.get("receiverId");
  const content = formData.get("content")?.toString().trim();

  if (!receiverId || !content) return;

  await db.insert(messages).values({
    senderId: session.userId,
    receiverId,
    content,
  });

  revalidatePath("/messages");
}

export async function createCommunity(formData) {
  const session = await requireUser();

  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();

  if (!name) return;

  await db.insert(communities).values({
    name,
    description,
    ownerId: session.userId,
  });

  revalidatePath("/communities");
}

export async function createPhotoAlbum(formData) {
  const session = await requireUser();

  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();

  if (!title) return;

  await db.insert(photoAlbums).values({
    title,
    description,
    ownerId: session.userId,
  });

  revalidatePath("/photos");
}

export async function addPhoto(formData) {
  const session = await requireUser();

  const imageUrl = formData.get("imageUrl")?.toString().trim();
  const caption = formData.get("caption")?.toString().trim();
  const albumId = formData.get("albumId")?.toString();

  if (!imageUrl) return;

  await db.insert(photos).values({
    imageUrl,
    caption,
    albumId: albumId || null,
    ownerId: session.userId,
  });

  revalidatePath("/photos");
}

export async function createStudyMaterial(formData) {
  const session = await requireUser();

  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const fileUrl = formData.get("fileUrl")?.toString().trim();

  if (!title) return;

  await db.insert(studyMaterials).values({
    title,
    description,
    fileUrl,
    ownerId: session.userId,
  });

  revalidatePath("/study-materials");
}