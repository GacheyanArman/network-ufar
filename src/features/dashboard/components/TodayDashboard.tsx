import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/shared/db/db";
import {
  studyMaterials,
  courseEnrollments,
  courses,
  events,
  communities,
} from "@/shared/db/schema";
import { eq, and, desc, inArray, asc, gte } from "drizzle-orm";
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
  let upcomingEvents = await db
    .select({
      id: events.id,
      title: events.title,
      startTime: events.startTime,
      location: events.location,
      eventType: events.eventType,
      description: events.description,
      communityName: communities.name,
      courseCode: courses.code,
    })
    .from(events)
    .leftJoin(communities, eq(events.communityId, communities.id))
    .leftJoin(courses, eq(events.courseId, courses.id))
    .where(
      and(
        gte(events.startTime, now),
        eq(events.status, "approved"),
        eq(events.isCancelled, false)
      )
    )
    .orderBy(asc(events.startTime))
    .limit(3);

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

        {/* Section 4: Upcoming Events */}
        <section className="dashboard-section">
          <h2 className="dash-section-title">
            <UiIcon name="calendar" size={20} color="var(--french-gold)" /> {t("today.eventsThisWeek") || "Upcoming Events"}
          </h2>
          {upcomingEvents.length > 0 ? (
            <div className="dash-list">
              {upcomingEvents.map((ev: any) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="dash-link-reset"
                >
                  <Card padding="sm" interactive>
                    <div className="dash-material-row" style={{ display: "flex", gap: 10 }}>
                      <div className="dash-deadline-date" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 46, background: "var(--bg-hover)", borderRadius: 8, padding: "4px 8px" }}>
                        <div className="dash-deadline-month" style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--french-blue)" }}>
                          {new Date(ev.startTime).toLocaleString(localeStr, {
                            month: "short",
                          })}
                        </div>
                        <div className="dash-deadline-day" style={{ fontSize: "1.05rem", fontWeight: 900 }}>
                          {new Date(ev.startTime).getDate()}
                        </div>
                      </div>
                      <div className="dash-material-meta" style={{ flex: 1 }}>
                        <div className="dash-material-title" style={{ fontWeight: 700, fontSize: "0.88rem" }}>{ev.title}</div>
                        <div className="dash-material-sub" style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {new Date(ev.startTime).toLocaleTimeString(localeStr, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {ev.location && ` • ${ev.location}`}
                          {(ev.courseCode || ev.communityName) && (
                            <span className="dash-accent" style={{ marginLeft: 6, fontWeight: 700, color: "var(--french-blue)" }}>
                              [{ev.courseCode || ev.communityName}]
                            </span>
                          )}
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
                icon="calendar"
                title={t("today.noEvents") || "No upcoming events"}
                action={
                  <Link href="/events">
                    <Button variant="outline" size="sm">
                      {t("emptyStates.explore.browseEvents") || "Browse events"}
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