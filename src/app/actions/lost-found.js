"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { lostFoundItems } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { saveUploadFile } from "@/lib/upload";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function createLostFoundItem(formData) {
  const userId = await requireUserId();

  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const type = String(formData.get("type") || "").trim();
  const description = String(formData.get("description") || "").trim().slice(0, 1000) || null;
  const location = String(formData.get("location") || "").trim().slice(0, 200);
  const contact = String(formData.get("contact") || "").trim().slice(0, 200) || null;
  const communityId = String(formData.get("communityId") || "").trim() || null;

  if (!title) throw new Error("Title is required");
  if (!["lost", "found"].includes(type)) throw new Error("Invalid type");
  if (!location) throw new Error("Location is required");

  const image = formData.get("image");
  let imageUrl = null;
  if (image && image.size > 0) {
    imageUrl = await saveUploadFile(image, {
      subdir: "lost-found",
      prefix: "item",
      maxSize: 5 * 1024 * 1024,
      allowedMimePrefix: "image/",
    });
  }

  const itemDate = formData.get("itemDate")?.toString().trim();
  const [inserted] = await db
    .insert(lostFoundItems)
    .values({
      title,
      type,
      description,
      location,
      itemDate: itemDate ? new Date(itemDate) : new Date(),
      imageUrl,
      contact,
      communityId,
      ownerId: userId,
    })
    .returning({ id: lostFoundItems.id });

  revalidatePath("/lost-found");
  return { ok: true, id: inserted.id };
}

export async function updateLostFoundStatus(formData) {
  const userId = await requireUserId();
  const itemId = String(formData.get("itemId") || "").trim();
  const status = String(formData.get("status") || "").trim();
  if (!itemId || !["open", "returned", "expired"].includes(status)) {
    throw new Error("Invalid data");
  }

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
  const itemId = String(formData.get("itemId") || "").trim();
  if (!itemId) throw new Error("Invalid item");

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
