import { db } from "@/shared/db/db";
import { courseEnrollments, courses, semesters } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { redirect } from "next/navigation";
import { Card } from "@/shared/ui/Card";
import { Badge, EmptyState, PageHeader } from "@/shared/ui/Layout";
import { Button } from "@/shared/ui/Button";

type CourseEnrollment = {
  courseId: string;
  courseName: string;
  courseCode: string;
  role: string | null;
};

export default async function CoursesDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Get current semester
  const [currentSem] = await db.select().from(semesters).where(eq(semesters.isActive, true)).limit(1);

  let enrollments: CourseEnrollment[] = [];
  if (currentSem) {
    enrollments = await db
      .select({
        courseId: courses.id,
        courseName: courses.name,
        courseCode: courses.code,
        role: courseEnrollments.role,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(
        and(
          eq(courseEnrollments.userId, session.userId as string),
          eq(courseEnrollments.semesterId, currentSem.id)
        )
      );
  }

  return (
    <div style={{ padding: "32px 16px", maxWidth: "1200px", margin: "0 auto" }}>
      <PageHeader
        title="My Courses"
        description={currentSem ? currentSem.name : "No active semester"}
        action={
          <Link href="/onboarding">
            <Button variant="outline" size="sm">Update Enrolment</Button>
          </Link>
        }
      />

      {enrollments.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon="book"
            title="Not enrolled in any courses"
            description="You haven't added any courses for the current semester."
            action={
              <Link href="/onboarding">
                <Button variant="primary">Update Courses</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {enrollments.map((enr) => (
            <Link
              key={enr.courseId}
              href={`/courses/${enr.courseId}`}
              style={{ textDecoration: "none" }}
            >
              <Card padding="md" interactive>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <Badge variant="navy">{enr.courseCode}</Badge>
                  {enr.role && enr.role !== "student" && (
                    <Badge variant="gold">{enr.role.toUpperCase()}</Badge>
                  )}
                </div>
                <h2 style={{ fontSize: "1.2rem", margin: "0 0 16px", color: "var(--french-navy)", fontFamily: "Georgia, serif" }}>
                  {enr.courseName}
                </h2>
                <div style={{ display: "flex", gap: "12px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <UiIcon name="file-text" size={16} /> Materials
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <UiIcon name="message-square" size={16} /> Discussions
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

