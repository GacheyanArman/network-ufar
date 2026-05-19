import { redirect } from "next/navigation";
import { db } from "@/shared/db/db";
import { schedule, users } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq, or } from "drizzle-orm";
import { PageShell } from "@/shared/ui/Layout";
import ScheduleClient from "@/features/courses/components/ScheduleClient";

export default async function SchedulePage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  // Get all schedule entries (public + user's own)
  const entries = await db
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
        eq(schedule.createdBy, session.userId)
      )
    )
    .orderBy(schedule.dayOfWeek, schedule.startTime);

  return (
    <PageShell>
      <ScheduleClient entries={entries} currentUserId={session.userId} />
    </PageShell>
  );
}
