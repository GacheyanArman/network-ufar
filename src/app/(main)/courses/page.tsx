import { db } from "@/shared/db/db";
import { courseEnrollments, courses, semesters, studyMaterials } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq, and, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCachedUserSchedule } from "@/shared/cache/cache";
import CoursesHub from "@/features/courses/components/CoursesHub";
import { getCalendarFeed } from "@/features/courses/server/calendar";
import { getCampusNow, CAMPUS_TZ } from "@/features/dashboard/server/today-utils";
import { PageHeader } from "@/shared/ui/Layout";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CoursesDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = session.userId as string;

  const { tab } = (await searchParams) || {};

  // Get current semester
  const [currentSem] = await db
    .select()
    .from(semesters)
    .where(eq(semesters.isActive, true))
    .limit(1);

  let enrollmentsRaw = [];
  if (currentSem) {
    enrollmentsRaw = await db
      .select({
        courseId: courses.id,
        courseName: courses.name,
        courseCode: courses.code,
        courseDescription: courses.description,
        courseCredits: courses.credits,
        facultyId: courses.facultyId,
        role: courseEnrollments.role,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(
        and(
          eq(courseEnrollments.userId, userId),
          eq(courseEnrollments.semesterId, currentSem.id)
        )
      );
  }

  // Get materials count
  const materialsData = await db
    .select({ courseId: studyMaterials.courseId, total: count(studyMaterials.id) })
    .from(studyMaterials)
    .groupBy(studyMaterials.courseId);
  
  const materialsMap = new Map(materialsData.map((m: any) => [m.courseId, m.total]));

  // Get user schedule, calendar feed and campus time
  const mySchedule = await getCachedUserSchedule(userId);
  const { entries: calendarEntries, myCommunities } = await getCalendarFeed();
  const campus = getCampusNow(CAMPUS_TZ);

  const enrichedEnrollments = enrollmentsRaw.map((enr: any) => {
    // Find course schedule entries
    const courseSchedule = mySchedule.filter((s: any) => s.courseCode === enr.courseCode);
    
    // Default status for courses in active semester
    const status: "active" | "finished" | "upcoming" = "active";
    
    let instructor: string | null = null;
    let nextClassSnippet: string | null = null;
    let scheduleSnippet: string | null = null;

    if (courseSchedule.length > 0) {
      instructor = courseSchedule.find((s: any) => s.instructor)?.instructor || null;
      
      const todayClasses = courseSchedule.filter((s: any) => s.dayOfWeek === campus.dayOfWeek);
      const futureToday = todayClasses.find((s: any) => s.startTime >= campus.timeStr);
      
      if (futureToday) {
         nextClassSnippet = `Today ${futureToday.startTime} - ${futureToday.endTime}`;
      } else {
         const nextDay = courseSchedule.find((s: any) => s.dayOfWeek > campus.dayOfWeek) || courseSchedule[0];
         if (nextDay) {
           nextClassSnippet = `${DAYS_SHORT[nextDay.dayOfWeek]} ${nextDay.startTime} - ${nextDay.endTime}`;
         }
      }

      const first = courseSchedule[0];
      scheduleSnippet = `${DAYS_SHORT[first.dayOfWeek]} ${first.startTime} - ${first.endTime}`;
    }

    return {
      courseId: enr.courseId,
      courseName: enr.courseName,
      courseCode: enr.courseCode,
      courseDescription: enr.courseDescription,
      courseCredits: enr.courseCredits,
      facultyName: null, 
      role: enr.role || "student",
      materialsCount: materialsMap.get(enr.courseId) || 0,
      scheduleSnippet,
      instructor,
      status,
      nextClassSnippet,
    };
  });

  return (
    <>
      {/* We can place the top header here or let CoursesHub handle it. 
          The user wanted it cohesive. CoursesHub already has a header, 
          but if we want to keep PageHeader, we can just use the Hub for content.
          Since I redesigned CoursesHub to have its own header, I'll pass the data.
      */}
      <div style={{ padding: "0", maxWidth: "100%", margin: "0 auto" }}>
        <CoursesHub
          enrolledCourses={enrichedEnrollments as any}
          scheduleEntries={mySchedule as any}
          currentUserId={userId}
          activeSemesterName={currentSem ? currentSem.name : null}
          calendarEntries={calendarEntries as any}
          calendarCommunities={myCommunities as any}
          initialTab={tab}
        />
      </div>
    </>
  );
}
