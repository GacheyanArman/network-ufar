import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getMaterials, getOpenMaterialRequests } from "@/features/materials/server/actions";
import { PageShell } from "@/shared/ui/Layout";
import MaterialsPageClient from "@/features/materials/components/MaterialsPageClient";
import { db } from "@/shared/db/db";
import { courses, courseEnrollments, semesters } from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";

export const metadata = {
  title: "Study Materials | UFAR Network",
  description:
    "Find notes, summaries, slides, exam prep files and study resources shared by UFAR students.",
};

export default async function MaterialsPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  // 1. Get active semester
  const activeSemesterResult = await db
    .select()
    .from(semesters)
    .where(eq(semesters.isActive, true))
    .limit(1);
  const activeSemester = activeSemesterResult[0] || null;

  // 2. Get user's enrolled course codes
  let enrolledCourseCodes: string[] = [];
  if (activeSemester) {
    const enrollments = await db
      .select({
        code: courses.code,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(
        and(
          eq(courseEnrollments.userId, session.userId as string),
          eq(courseEnrollments.semesterId, activeSemester.id)
        )
      );
    enrolledCourseCodes = (enrollments as any[])
      .map((e) => e.code?.toLowerCase())
      .filter(Boolean) as string[];
  }

  // 3. Get all courses for select dropdown
  const allCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
    })
    .from(courses)
    .orderBy(courses.code);

  const [materials, openRequests] = await Promise.all([
    getMaterials({ sort: "newest" }),
    getOpenMaterialRequests(),
  ]);

  return (
    <PageShell>
      <MaterialsPageClient
        materials={materials}
        openRequests={openRequests}
        currentUserId={session.userId as string}
        enrolledCourseCodes={enrolledCourseCodes}
        allCourses={allCourses}
      />
    </PageShell>
  );
}
