"use server";

import { and, eq, desc, ilike, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { studyMaterials, studyMaterialSaves, studyMaterialRequests, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { saveUploadFile } from "@/lib/upload";

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId as string;
}

export async function getMaterials({ query, faculty, year, subject, type }: { query?: string, faculty?: string, year?: string, subject?: string, type?: string }) {
  const session = await getSession();
  
  let conditions = [eq(studyMaterials.status, "approved")];

  if (query) {
    conditions.push(
      or(
        ilike(studyMaterials.title, `%${query}%`),
        ilike(studyMaterials.description, `%${query}%`),
        ilike(studyMaterials.subject, `%${query}%`)
      )
    );
  }

  if (faculty) conditions.push(eq(studyMaterials.faculty, faculty));
  if (year) conditions.push(eq(studyMaterials.year, year));
  if (subject) conditions.push(eq(studyMaterials.subject, subject));
  if (type) conditions.push(eq(studyMaterials.type, type as any));

  const materials = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      description: studyMaterials.description,
      fileUrl: studyMaterials.fileUrl,
      type: studyMaterials.type,
      faculty: studyMaterials.faculty,
      year: studyMaterials.year,
      subject: studyMaterials.subject,
      professorCourse: studyMaterials.professorCourse,
      isVerified: studyMaterials.isVerified,
      downloadsCount: studyMaterials.downloadsCount,
      helpfulCount: studyMaterials.helpfulCount,
      createdAt: studyMaterials.createdAt,
      ownerId: studyMaterials.ownerId,
      ownerName: users.fullName,
      ownerAvatar: users.avatarUrl,
    })
    .from(studyMaterials)
    .innerJoin(users, eq(studyMaterials.ownerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(studyMaterials.createdAt));

  // Get user saves if logged in
  let savedMaterialIds: string[] = [];
  if (session?.userId) {
    const saves = await db
      .select({ materialId: studyMaterialSaves.materialId })
      .from(studyMaterialSaves)
      .where(eq(studyMaterialSaves.userId, session.userId as string));
    savedMaterialIds = saves.map(s => s.materialId);
  }

  return materials.map(m => ({
    ...m,
    isSaved: savedMaterialIds.includes(m.id)
  }));
}

export async function getMyMaterials() {
  const userId = await requireUserId();

  const [uploaded, savedData, requested] = await Promise.all([
    db.select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      type: studyMaterials.type,
      subject: studyMaterials.subject,
      status: studyMaterials.status,
      createdAt: studyMaterials.createdAt,
    }).from(studyMaterials).where(eq(studyMaterials.ownerId, userId)).orderBy(desc(studyMaterials.createdAt)),
    
    db.select({
      material: studyMaterials
    })
    .from(studyMaterialSaves)
    .innerJoin(studyMaterials, eq(studyMaterialSaves.materialId, studyMaterials.id))
    .where(eq(studyMaterialSaves.userId, userId))
    .orderBy(desc(studyMaterialSaves.createdAt)),

    db.select().from(studyMaterialRequests).where(eq(studyMaterialRequests.userId, userId)).orderBy(desc(studyMaterialRequests.createdAt))
  ]);

  return {
    uploaded,
    saved: savedData.map(s => s.material),
    requested
  };
}

export async function uploadMaterial(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const faculty = String(formData.get("faculty") || "").trim();
  const year = String(formData.get("year") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const type = String(formData.get("type") || "other").trim() as any;
  const professorCourse = String(formData.get("professorCourse") || "").trim();
  const visibility = String(formData.get("visibility") || "all").trim() as any;
  const file = formData.get("file") as File;

  if (!title) throw new Error("Title is required");
  if (!file || file.size === 0) throw new Error("No file provided");

  const fileUrl = await saveUploadFile(file, {
    subdir: "materials",
    prefix: "mat",
    maxSize: 20 * 1024 * 1024,
  });

  await db.insert(studyMaterials).values({
    title: title.slice(0, 160),
    description: description.slice(0, 500),
    faculty,
    year,
    subject,
    type,
    professorCourse,
    visibility,
    fileUrl,
    ownerId: userId,
    status: "pending", // Moderator needs to approve
  });

  revalidatePath("/study-materials");
  return { ok: true };
}

export async function toggleSaveMaterial(materialId: string) {
  const userId = await requireUserId();

  const existing = await db
    .select()
    .from(studyMaterialSaves)
    .where(and(eq(studyMaterialSaves.userId, userId), eq(studyMaterialSaves.materialId, materialId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(studyMaterialSaves)
      .where(eq(studyMaterialSaves.id, existing[0].id));
  } else {
    await db.insert(studyMaterialSaves).values({
      userId,
      materialId,
    });
  }

  revalidatePath("/study-materials");
  return { ok: true, saved: existing.length === 0 };
}

export async function requestMaterial(formData: FormData) {
  const userId = await requireUserId();
  
  await db.insert(studyMaterialRequests).values({
    userId,
    faculty: String(formData.get("faculty") || "").trim(),
    year: String(formData.get("year") || "").trim(),
    subject: String(formData.get("subject") || "").trim(),
    materialType: String(formData.get("materialType") || "").trim(),
    topic: String(formData.get("topic") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    urgency: String(formData.get("urgency") || "medium") as any,
  });

  revalidatePath("/study-materials");
  return { ok: true };
}
