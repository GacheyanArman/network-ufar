"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { saveUploadFile } from "@/lib/upload";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function uploadMaterial(formData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const file = formData.get("file");

  if (!title) throw new Error("Title is required");
  if (!file || file.size === 0) throw new Error("No file provided");

  const fileUrl = await saveUploadFile(file, {
    subdir: "materials",
    prefix: "doc",
    maxSize: 20 * 1024 * 1024,
  });

  await db.insert(studyMaterials).values({
    title: title.slice(0, 160),
    description: description.slice(0, 500),
    fileUrl,
    ownerId: userId,
  });

  revalidatePath("/study-materials");
  return { ok: true };
}

export async function deleteMaterial(formData) {
  const userId = await requireUserId();
  const materialId = formData.get("materialId")?.toString().trim();

  if (!materialId) throw new Error("Invalid material");

  await db
    .delete(studyMaterials)
    .where(
      and(
        eq(studyMaterials.id, materialId),
        eq(studyMaterials.ownerId, userId)
      )
    );

  revalidatePath("/study-materials");
  return { ok: true };
}
