"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { lostFoundItems } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { saveUploadFileWithMeta } from "@/shared/storage/upload";
import {
  parseFormDataWith,
  lostFoundCreateSchema,
  lostFoundUpdateStatusSchema,
  lostFoundDeleteSchema,
} from "@/shared/validations/validations";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function createLostFoundItem(formData) {
  const userId = await requireUserId();

  const data = parseFormDataWith(lostFoundCreateSchema, formData);

  const image = formData.get("image");
  let imageUrl = null;
  if (image && image.size > 0) {
    const result = await saveUploadFileWithMeta(image, {
      subdir: "lost-found",
      prefix: "item",
      maxSize: 5 * 1024 * 1024,
      allowedMimePrefix: "image/",
      processImage: true,
    });
    imageUrl = result?.url ?? null;
  }

  const [inserted] = await db
    .insert(lostFoundItems)
    .values({
      title: data.title,
      type: data.type,
      description: data.description || null,
      location: data.location,
      itemDate: data.itemDate ? new Date(data.itemDate) : new Date(),
      imageUrl,
      contact: data.contact || null,
      communityId: data.communityId || null,
      ownerId: userId,
    })
    .returning({ id: lostFoundItems.id });

  revalidatePath("/lost-found");
  return { ok: true, id: inserted.id };
}

export async function updateLostFoundStatus(formData) {
  const userId = await requireUserId();
  const { itemId, status } = parseFormDataWith(
    lostFoundUpdateStatusSchema,
    formData,
  );

  const [item] = await db
    .select({ ownerId: lostFoundItems.ownerId })
    .from(lostFoundItems)
    .where(eq(lostFoundItems.id, itemId))
    .limit(1);

  if (!item) throw new Error("Item not found");
  if (item.ownerId !== userId) throw new Error("Only the owner can update");

  await db
    .update(lostFoundItems)
    .set({ status, updatedAt: new Date() })
    .where(eq(lostFoundItems.id, itemId));

  revalidatePath("/lost-found");
  return { ok: true };
}

export async function deleteLostFoundItem(formData) {
  const userId = await requireUserId();
  const { itemId } = parseFormDataWith(lostFoundDeleteSchema, formData);

  const [item] = await db
    .select({ ownerId: lostFoundItems.ownerId })
    .from(lostFoundItems)
    .where(eq(lostFoundItems.id, itemId))
    .limit(1);

  if (!item) throw new Error("Item not found");
  if (item.ownerId !== userId) throw new Error("Only the owner can delete");

  await db.delete(lostFoundItems).where(eq(lostFoundItems.id, itemId));

  revalidatePath("/lost-found");
  return { ok: true };
}
