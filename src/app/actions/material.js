"use server";

import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function uploadMaterial(formData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const title = formData.get("title");
  const description = formData.get("description") || "";
  const file = formData.get("file");

  if (!title || title.trim().length === 0) {
    throw new Error("Title is required");
  }

  if (!file || file.size === 0) {
    throw new Error("No file provided");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFilename = file.name.replaceAll(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `doc-${Date.now()}-${safeFilename}`;
    
    const uploadDir = path.join(process.cwd(), "public", "uploads", "materials");
    await mkdir(uploadDir, { recursive: true });
    
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    await db.insert(studyMaterials).values({
      title: title.trim(),
      description: description.trim(),
      fileUrl: `/uploads/materials/${filename}`,
      ownerId: session.userId,
    });

    revalidatePath("/study-materials");
  } catch (e) {
    console.error("Material upload failed:", e);
    throw new Error("Failed to upload material");
  }
}

export async function deleteMaterial(formData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const materialId = formData.get("materialId");

  try {
    await db.delete(studyMaterials).where(
      and(
        eq(studyMaterials.id, materialId),
        eq(studyMaterials.ownerId, session.userId)
      )
    );
    revalidatePath("/study-materials");
  } catch (e) {
    console.error("Delete Material Error:", e);
    throw new Error("Failed to delete material");
  }
}