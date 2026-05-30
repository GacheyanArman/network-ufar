import { redirect } from "next/navigation";
import { db } from "@/shared/db/db";
import { schedule, users, semesters, courseEnrollments, courses, faculties, studyMaterials } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq, or, and, sql } from "drizzle-orm";
import { PageShell } from "@/shared/ui/Layout";
import CoursesHub from "@/features/courses/components/CoursesHub";

export default async function SchedulePage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  // 1. Find active semester
  const activeSemesterResult = await db
    .select()
    .from(semesters)
    .where(eq(semesters.isActive, true))
    .limit(1);
  const activeSemester = activeSemesterResult[0] || null;

  // 2. Get schedule entries (existing query from page.js)
  const scheduleEntries = (await db
    .select({
      id: schedule.id,
      courseName: schedule.courseName,
      courseCode: schedule.courseCode,
      instructor: schedule.instructor,
      room: schedule.room,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      faculty: schedule.faculty,
      semester: schedule.semester,
      isPublic: schedule.isPublic,
      createdBy: schedule.createdBy,
      creatorName: users.fullName,
      createdAt: schedule.createdAt,
    })
    .from(schedule)
    .innerJoin(users, eq(schedule.createdBy, users.id))
    .where(
      or(
        eq(schedule.isPublic, true),
        eq(schedule.createdBy, session.userId as string)
      )
    )
    .orderBy(schedule.dayOfWeek, schedule.startTime)) as any[];

  let enrolledCourses: any[] = [];

  if (activeSemester) {
    // 3. Get user's enrolled courses from courseEnrollments joined with courses and faculties
    const enrollments = await db
      .select({
        courseId: courses.id,
        courseName: courses.name,
        courseCode: courses.code,
        courseDescription: courses.description,
        courseCredits: courses.credits,
        facultyName: faculties.name,
        role: courseEnrollments.role,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .leftJoin(faculties, eq(courses.facultyId, faculties.id))
      .where(
        and(
          eq(courseEnrollments.userId, session.userId as string),
          eq(courseEnrollments.semesterId, activeSemester.id)
        )
      );

    // 4. Counts materials from studyMaterials where courseId matches
    const materialCounts = (await db
      .select({
        courseId: studyMaterials.courseId,
        count: sql`count(*)`.mapWith(Number),
      })
      .from(studyMaterials)
      .groupBy(studyMaterials.courseId)) as { courseId: string | null; count: number }[];

    const materialsCountMap = new Map(
      materialCounts
        .filter((m) => m.courseId)
        .map((m) => [m.courseId, m.count])
    );

    // 5. Construct enrolledCourses with materialsCount and scheduleSnippet
    const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    enrolledCourses = (enrollments as any[]).map((env) => {
      // Small schedule snippet: the next class day/time from the schedule entries that match this course code
      // We look at schedule entries where courseCode matches the enrolled course code
      const courseSchedule = scheduleEntries.filter(
        (e) => e.courseCode?.toLowerCase() === env.courseCode?.toLowerCase()
      );
      let scheduleSnippet: string | null = null;
      if (courseSchedule.length > 0) {
        const first = courseSchedule[0];
        scheduleSnippet = `${DAYS_SHORT[first.dayOfWeek]} ${first.startTime} - ${first.endTime}`;
      }

      return {
        courseId: env.courseId,
        courseName: env.courseName,
        courseCode: env.courseCode,
        courseDescription: env.courseDescription,
        courseCredits: env.courseCredits,
        facultyName: env.facultyName,
        role: env.role,
        materialsCount: materialsCountMap.get(env.courseId) || 0,
        scheduleSnippet,
      };
    });
  }

  return (
    <PageShell>
      <CoursesHub
        enrolledCourses={enrolledCourses}
        scheduleEntries={scheduleEntries}
        currentUserId={session.userId as string}
        activeSemesterName={activeSemester ? activeSemester.name : null}
      />
    </PageShell>
  );
}
