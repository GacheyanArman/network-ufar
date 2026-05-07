import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { studyMaterials, studyMaterialSaves, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, desc } from "drizzle-orm";
import MaterialsPageClient from "@/components/MaterialsPageClient";

export const metadata = {
  title: "Materials | Network",
  description: "Find notes, summaries, slides, exam prep files and study resources shared by UFAR students.",
};

export default async function MaterialsPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  // Fetch approved materials
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
    .where(eq(studyMaterials.status, "approved"))
    .orderBy(desc(studyMaterials.createdAt));

  // Fetch user's saved materials
  const savedItems = await db
    .select({
      materialId: studyMaterialSaves.materialId,
    })
    .from(studyMaterialSaves)
    .where(eq(studyMaterialSaves.userId, session.userId as string));

  const savedMaterialIds = savedItems.filter(i => i.materialId).map(i => i.materialId as string);

  return (
    <MaterialsPageClient
      materials={materials}
      savedMaterialIds={savedMaterialIds}
      currentUserId={session.userId as string}
    />
  );
}
