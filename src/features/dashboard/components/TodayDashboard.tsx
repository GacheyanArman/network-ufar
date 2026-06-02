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
  getCachedUnreadMessages,
  getCachedUnreadNotifications,
} from "@/shared/cache/cache";
import { PageHeader, PageShell } from "@/shared/ui/Layout";
import { Language } from "@/shared/i18n/i18n";
import { getServerTranslator } from "@/shared/i18n/server";
import {
  CAMPUS_TZ,
  getCampusNow,
  getGreeting,
  getClassStatus,
  validateLanguage,
  langToLocale,
} from "../server/today-utils";
import type {
  ScheduleItem,
  ClassStatus,
  MaterialItem,
  EventItem,
  DeadlineItem,
} from "../server/today-utils";

// ─── Sub-components ─────────────────────────────────────────────────────────
import SummaryBar from "./SummaryBar";
import NowNextCard from "./NowNextCard";
import TodayScheduleList from "./TodayScheduleList";
import DeadlineList from "./DeadlineList";
import MaterialsList from "./MaterialsList";
import EventsList from "./EventsList";
import QuickActions from "./QuickActions";

// ─── Day labels for future-class display ────────────────────────────────────
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Props ──────────────────────────────────────────────────────────────────
type TodayDashboardProps = {
  userId: string;
  currentUser: { fullName: string | null } | null;
};

export default async function TodayDashboard({
  userId,
  currentUser,
}: TodayDashboardProps) {
  // ── Language & locale ──────────────────────────────────────────────────
  const cookieStore = await cookies();
  const lang = validateLanguage(cookieStore.get("language")?.value);
  const t = getServerTranslator(lang as Language);
  const locale = langToLocale(lang);

  // ── Campus time ────────────────────────────────────────────────────────
  const campus = getCampusNow(CAMPUS_TZ);
  const now = campus.date;

  // ── User name ──────────────────────────────────────────────────────────
  const firstName = currentUser?.fullName?.split(" ")[0] ?? "";
  const greeting = getGreeting(campus.hour, lang, firstName);

  // ── Enrolled courses ───────────────────────────────────────────────────
  const enrollments = await db
    .select({ courseId: courseEnrollments.courseId })
    .from(courseEnrollments)
    .where(eq(courseEnrollments.userId, userId));

  const myCourseIds: string[] = enrollments
    .map((e: { courseId: string | null }) => e.courseId)
    .filter((id: string | null): id is string => id != null);

  // ── Schedule ───────────────────────────────────────────────────────────
  const mySchedule = await getCachedUserSchedule(userId);

  // Annotate today's classes with status
  const todayClasses: Array<ScheduleItem & { status: ClassStatus }> = mySchedule
    .filter((c: ScheduleItem) => c.dayOfWeek === campus.dayOfWeek)
    .map((c: ScheduleItem) => ({
      ...c,
      status: getClassStatus(c as ScheduleItem, campus.dayOfWeek, campus.timeStr),
    }));

  // Mark the first "upcoming" class as "next"
  const firstUpcomingIdx = todayClasses.findIndex((c) => c.status === "upcoming");
  if (firstUpcomingIdx !== -1) {
    todayClasses[firstUpcomingIdx].status = "next";
  }

  // Find the next future class (for NowNextCard fallback)
  let nextFutureClass: ScheduleItem | null = null;
  let nextFutureLabel = "";
  let isNextWeek = false;

  // First: look in remaining days this week
  const remainingThisWeek = mySchedule.find(
    (c: ScheduleItem) => c.dayOfWeek > campus.dayOfWeek,
  );
  if (remainingThisWeek) {
    nextFutureClass = remainingThisWeek as ScheduleItem;
    nextFutureLabel = DAY_LABELS[remainingThisWeek.dayOfWeek] ?? "";
  } else if (mySchedule.length > 0) {
    // Wrap to next week
    nextFutureClass = mySchedule[0] as ScheduleItem;
    nextFutureLabel = DAY_LABELS[mySchedule[0].dayOfWeek] ?? "";
    isNextWeek = true;
  }

  // ── Deadlines ──────────────────────────────────────────────────────────
  const cachedDeadlines = await getCachedUpcomingDeadlines(userId);
  const deadlines: DeadlineItem[] = cachedDeadlines.map((d: any) => ({
    id: d.id,
    title: d.title,
    eventType: d.eventType,
    dueDate: d.dueDate,
  }));

  // ── Materials ──────────────────────────────────────────────────────────
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
      .limit(3);
  }

  // ── Events ─────────────────────────────────────────────────────────────
  const upcomingEvents: EventItem[] = await db
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
        eq(events.isCancelled, false),
      ),
    )
    .orderBy(asc(events.startTime))
    .limit(3);

  // ── Unread counts ──────────────────────────────────────────────────────
  const [unreadMessages, unreadNotifications] = await Promise.all([
    getCachedUnreadMessages(userId),
    getCachedUnreadNotifications(userId),
  ]);

  // ── Summary counts ─────────────────────────────────────────────────────
  const classesTodayCount = todayClasses.length;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <PageShell variant="wide" className="dashboard-page">
      <PageHeader
        title={greeting}
        description={now.toLocaleDateString(locale, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      />

      {/* Summary stats bar */}
      <SummaryBar
        classesToday={classesTodayCount}
        deadlinesCount={deadlines.length}
        materialsCount={newMaterials.length}
        unreadMessages={unreadMessages}
        t={t}
      />

      {/* Hero: Now / Next Class */}
      <NowNextCard
        todayClasses={todayClasses}
        nextFutureClass={nextFutureClass}
        nextFutureLabel={nextFutureLabel}
        t={t}
      />

      {/* Quick actions */}
      <QuickActions t={t} />

      <div className="dashboard-grid">
        {/* Today's schedule */}
        <TodayScheduleList classes={todayClasses} t={t} />

        {/* Deadlines & exams */}
        <DeadlineList
          deadlines={deadlines}
          locale={locale}
          lang={lang}
          t={t}
        />

        {/* New study materials */}
        <MaterialsList
          materials={newMaterials}
          hasCourses={myCourseIds.length > 0}
          lang={lang}
          t={t}
        />

        {/* Campus events */}
        <EventsList events={upcomingEvents} locale={locale} t={t} />
      </div>
    </PageShell>
  );
}