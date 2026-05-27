import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/shared/db/db";
import {
  studyMaterials,
  courseEnrollments,
  courses,
} from "@/shared/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  getCachedUserSchedule,
  getCachedUpcomingDeadlines,
} from "@/shared/cache/cache";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";
import {
  EmptyState,
  PageHeader,
  PageShell,
} from "@/shared/ui/Layout";
import { Button } from "@/shared/ui/Button";
import { Language } from "@/shared/i18n/i18n";
import { getServerTranslator } from "@/shared/i18n/server";

let DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type TodayDashboardProps = {
  userId: string;
  currentUser: { fullName: string | null } | null;
};

export default async function TodayDashboard({
  userId,
  currentUser,
}: TodayDashboardProps) {
  // await the cookies, Next.js requires this now
  let cookieStore = await cookies();
  let langCookie = cookieStore.get("language");
  
  let lang = "en";
  if (langCookie != undefined) {
    lang = langCookie.value;
  }
  
  let t = getServerTranslator(lang as Language);
  
  let localeStr = "en-US";
  if (lang == "hy") {
    localeStr = "hy-AM";
  } else if (lang == "fr") {
    localeStr = "fr-FR";
  }

  let now = new Date();

  let enrollments = await db
    .select({ courseId: courseEnrollments.courseId })
    .from(courseEnrollments)
    .where(eq(courseEnrollments.userId, userId));

  let resolvedName = "";
  if (currentUser != null && currentUser.fullName != null) {
    resolvedName = currentUser.fullName;
  }

  let greeting = "Campus Hub";
  if (resolvedName != "") {
    let firstName = resolvedName.split(" ")[0];
    greeting = t("today.title") + ", " + firstName;
  }
    
  // explicitly define type to prevent TS7034
  let myCourseIds: string[] = [];
  for (let i = 0; i < enrollments.length; i++) {
    if (enrollments[i].courseId != null) {
      myCourseIds.push(enrollments[i].courseId as string);
    }
  }

  let currentDayOfWeek = now.getDay() - 1;
  if (now.getDay() == 0) {
    currentDayOfWeek = 6;
  }
  
  let currentTime = now.toTimeString().slice(0, 5);

  let mySchedule = await getCachedUserSchedule(userId);
  let cachedDeadlines = await getCachedUpcomingDeadlines(userId);

  type MaterialItem = {
    id: string;
    title: string;
    type: string | null;
    courseCode: string | null;
    createdAt: Date | null;
  };
  let newMaterials: MaterialItem[] = [];
  if (myCourseIds.length > 0) {
    newMaterials = await db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        type: studyMaterials.type,
        courseCode: courses.code,
        createdAt: studyMaterials.createdAt,
      })
      .from(studyMaterials)
      .leftJoin(courses, eq(studyMaterials.courseId, courses.id))
      .where(
        and(
          eq(studyMaterials.status, "approved"),
          inArray(studyMaterials.courseId, myCourseIds),
        ),
      )
      .orderBy(desc(studyMaterials.createdAt))
      .limit(2);
  }



  let nextClass = null;
  for (let i = 0; i < mySchedule.length; i++) {
    if (mySchedule[i].dayOfWeek == currentDayOfWeek && mySchedule[i].startTime >= currentTime) {
      nextClass = mySchedule[i];
      break;
    }
  }
  
  let isNextWeek = false;
  if (nextClass == null) {
    for (let i = 0; i < mySchedule.length; i++) {
      if (mySchedule[i].dayOfWeek > currentDayOfWeek) {
        nextClass = mySchedule[i];
        break;
      }
    }
  }
  
  if (nextClass == null && mySchedule.length > 0) {
    nextClass = mySchedule[0];
    isNextWeek = true;
  }

  let upcomingDeadlines: typeof cachedDeadlines = [];
  for (let i = 0; i < cachedDeadlines.length; i++) {
    if (i < 3) {
      upcomingDeadlines.push(cachedDeadlines[i]);
    }
  }

  return (
    <PageShell variant="wide" className="dashboard-page">
      <PageHeader
        title={greeting}
        description={now.toLocaleDateString(localeStr, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      />

      {/* Quick Actions */}
      <div className="dashboard-quick-actions">
        <QuickActionLink
          href="/study-materials"
          icon="upload"
          label={t("emptyStates.materials.upload")}
        />
        <QuickActionLink
          href="/feed"
          icon="message-circle"
          label={t("communities.questions")}
        />
      </div>

      <div className="dashboard-grid">
        {/* Section 1: Next Class */}
        <section className="dashboard-section">
          <h2 className="dash-section-title">
            <UiIcon name="book-open" size={20} color="var(--french-gold)" /> {t("today.nextClass")}
          </h2>
          <Card padding="none">
            {nextClass != null ? (
              <div className="dash-next-class">
                <div>
                  <div className="dash-next-class-code">
                    {nextClass.courseCode || nextClass.courseName}
                  </div>
                  <div className="dash-next-class-room">
                    {t("today.room")}: {nextClass.room || "TBA"}
                  </div>
                </div>
                <div className="dash-next-class-meta">
                  <div className="dash-next-class-time">{nextClass.startTime}</div>
                  <div className="dash-next-class-day">
                    {nextClass.dayOfWeek == currentDayOfWeek && isNextWeek == false
                      ? t("today.title")
                      : DAY_LABELS[nextClass.dayOfWeek]}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon="calendar"
                title={t("today.noClasses")}
                action={
                  <Link href="/schedule">
                    <Button variant="outline" size="sm">
                      {t("today.seeSchedule")}
                    </Button>
                  </Link>
                }
              />
            )}
          </Card>
        </section>

        {/* Section 2: Upcoming Deadlines */}
        <section className="dashboard-section">
          <h2 className="dash-section-title">
            <UiIcon name="clock" size={20} color="var(--french-gold)" /> {t("today.deadlines")}
          </h2>
          {upcomingDeadlines.length > 0 ? (
            <div className="dash-list">
              {upcomingDeadlines.map((d: any) => (
                <Card key={d.id} padding="sm" interactive>
                  <div className="dash-deadline-row">
                    <div className="dash-deadline-date">
                      <div className="dash-deadline-month">
                        {new Date(d.dueDate).toLocaleString(localeStr, {
                          month: "short",
                        })}
                      </div>
                      <div className="dash-deadline-day">
                        {new Date(d.dueDate).getDate()}
                      </div>
                    </div>
                    <div>
                      <div className="dash-deadline-title">{d.title}</div>
                      <div className="dash-deadline-type">{d.eventType}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card padding="md">
              <EmptyState icon="check-circle" title={t("today.noDeadlines")} />
            </Card>
          )}
        </section>

        {/* Section 3: New Materials */}
        <section className="dashboard-section">
          <h2 className="dash-section-title">
            <UiIcon name="folder" size={20} color="var(--french-gold)" /> {t("today.newMaterials")}
          </h2>
          {newMaterials.length > 0 ? (
            <div className="dash-list">
              {newMaterials.map((m) => (
                <Link
                  key={m.id}
                  href={`/study-materials/${m.id}`}
                  className="dash-link-reset"
                >
                  <Card padding="sm" interactive>
                    <div className="dash-material-row">
                      <div className="dash-material-icon">
                        <UiIcon name="file-text" size={18} />
                      </div>
                      <div className="dash-material-meta">
                        <div className="dash-material-title">{m.title}</div>
                        <div className="dash-material-sub">
                          <span className="dash-accent">
                            {m.courseCode || "General"}
                          </span>{" "}
                          • {m.type}
                        </div>
                      </div>
                      <UiIcon name="chevron-right" size={18} color="var(--text-muted)" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card padding="md">
              <EmptyState
                icon="folder"
                title={t("today.noMaterials")}
                description={
                  myCourseIds.length > 0
                    ? t("today.noMaterials")
                    : t("emptyStates.materials.noUploadedHint")
                }
                action={
                  <Link
                    href={myCourseIds.length > 0 ? "/study-materials" : "/courses?tab=enroll"}
                  >
                    <Button variant="outline" size="sm">
                      {myCourseIds.length > 0
                        ? t("emptyStates.materials.browse")
                        : t("nav.courses")}
                    </Button>
                  </Link>
                }
              />
            </Card>
          )}
        </section>


      </div>
    </PageShell>
  );
}

function QuickActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link href={href} className="dash-link-reset">
      <Card padding="sm" interactive className="dash-quick-action">
        <div className="dash-quick-action-icon">
          <UiIcon name={icon} size={18} />
        </div>
        <span className="dash-quick-action-label">{label}</span>
      </Card>
    </Link>
  );
}