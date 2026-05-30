import { notFound, redirect } from "next/navigation";
import { db } from "@/shared/db/db";
import { courses, courseEnrollments, studyMaterials, schedule, users, faculties, events } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq, and } from "drizzle-orm";
import { PageShell } from "@/shared/ui/Layout";
import CourseDetail from "@/features/courses/components/CourseDetail";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const { courseId } = await params;

  const courseDataResult = await db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
      description: courses.description,
      credits: courses.credits,
      facultyName: faculties.name,
    })
    .from(courses)
    .leftJoin(faculties, eq(courses.facultyId, faculties.id))
    .where(eq(courses.id, courseId))
    .limit(1);
  const courseData = courseDataResult[0] || null;

  if (!courseData) {
    notFound();
  }

  const enrollmentResult = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.userId, session.userId as string)
      )
    )
    .limit(1);
  const enrollment = enrollmentResult[0] || null;

  if (!enrollment) {
    redirect("/schedule");
  }

  // 3. Loads materials for this course (from studyMaterials where courseId matches, limit 10)
  const materialsData = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      type: studyMaterials.type,
      downloadsCount: studyMaterials.downloadsCount,
      createdAt: studyMaterials.createdAt,
      ownerName: users.fullName,
      fileUrl: studyMaterials.fileUrl,
    })
    .from(studyMaterials)
    .leftJoin(users, eq(studyMaterials.ownerId, users.id))
    .where(eq(studyMaterials.courseId, courseId))
    .orderBy(studyMaterials.createdAt)
    .limit(10);

  // 4. Loads schedule entries matching the course code
  const scheduleItems = await db
    .select({
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room,
      instructor: schedule.instructor,
    })
    .from(schedule)
    .where(eq(schedule.courseCode, courseData.code))
    .orderBy(schedule.dayOfWeek, schedule.startTime);

  // 5. Loads events for this course
  const courseEvents = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      location: events.location,
      startTime: events.startTime,
      endTime: events.endTime,
    })
    .from(events)
    .where(
      and(
        eq(events.courseId, courseId),
        eq(events.status, "approved"),
        eq(events.isCancelled, false)
      )
    )
    .orderBy(events.startTime)
    .limit(10);

  const serializedEvents = courseEvents.map((e: any) => ({
    ...e,
    startTime: e.startTime ? e.startTime.toISOString() : null,
    endTime: e.endTime ? e.endTime.toISOString() : null,
  }));

  return (
    <PageShell>
      <CourseDetail
        course={courseData}
        materials={materialsData}
        scheduleItems={scheduleItems}
        events={serializedEvents}
      />
    </PageShell>
  );
}
