import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/shared/db/db";
import {
  studyMaterials,
  courseEnrollments,
  courses,
  events,
  communities,
  posts,
  photos,
  users,
} from "@/shared/db/schema";
import { eq, and, desc, inArray, asc, gte } from "drizzle-orm";
import {
  getCachedUserSchedule,
  getCachedUpcomingDeadlines,
  getCachedUnreadNotifications,
  getCachedPeopleYouMayKnow,
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

  // ── Social club snapshots ──────────────────────────────────────────────
  const [unreadNotifications, activeDiscussions, popularGroups, campusMoments, suggestedFriends] = await Promise.all([
    getCachedUnreadNotifications(userId),
    db
      .select({
        id: posts.id,
        content: posts.content,
        commentsCount: posts.commentsCount,
        likesCount: posts.likesCount,
        authorName: users.fullName,
        communityName: communities.name,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .orderBy(desc(posts.createdAt))
      .limit(4),
    db
      .select({
        id: communities.id,
        name: communities.name,
        description: communities.description,
        avatar: communities.avatar,
        facultyTag: communities.facultyTag,
      })
      .from(communities)
      .where(eq(communities.status, "approved"))
      .orderBy(desc(communities.createdAt))
      .limit(4),
    db
      .select({
        id: photos.id,
        imageUrl: photos.thumbnailUrl,
        mediumUrl: photos.mediumUrl,
        originalUrl: photos.imageUrl,
        caption: photos.caption,
        ownerName: users.fullName,
      })
      .from(photos)
      .innerJoin(users, eq(photos.ownerId, users.id))
      .where(and(eq(photos.isPrivate, false), eq(photos.moderationStatus, "approved")))
      .orderBy(desc(photos.createdAt))
      .limit(6),
    getCachedPeopleYouMayKnow(userId, 4),
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
        notificationsCount={unreadNotifications}
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

      <div className="dashboard-grid" style={{ marginTop: 18 }}>
        <section className="card" style={{ padding: 18 }}>
          <div className="old-widget-head">
            <h3 className="widget-title">Active discussions</h3>
            <Link href="/feed" className="old-widget-link">Open feed</Link>
          </div>
          <div className="mini-user-list">
            {activeDiscussions.length === 0 ? (
              <div className="empty-state-mini"><p>No discussions yet. Start the first one in Feed.</p></div>
            ) : activeDiscussions.map((post: { id: string; content: string; commentsCount: number; likesCount: number; authorName: string | null; communityName: string | null }) => (
              <Link key={post.id} href="/feed" className="mini-user-row mini-user-row-link">
                <div className="mini-user-avatar">💬</div>
                <div className="mini-user-main">
                  <strong>{post.content.slice(0, 72)}{post.content.length > 72 ? "…" : ""}</strong>
                  <span>{post.authorName || "Student"}{post.communityName ? ` · ${post.communityName}` : ""} · {post.commentsCount} comments</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card" style={{ padding: 18 }}>
          <div className="old-widget-head">
            <h3 className="widget-title">Popular groups</h3>
            <Link href="/communities" className="old-widget-link">See groups</Link>
          </div>
          <div className="mini-user-list">
            {popularGroups.length === 0 ? (
              <div className="empty-state-mini"><p>No groups yet.</p></div>
            ) : popularGroups.map((group: { id: string; name: string; description: string | null; avatar: string | null; facultyTag: string | null }) => (
              <Link key={group.id} href={`/communities/${group.id}`} className="mini-user-row mini-user-row-link">
                <div className="mini-user-avatar">{group.avatar ? "★" : "#"}</div>
                <div className="mini-user-main">
                  <strong>{group.name}</strong>
                  <span>{group.description || group.facultyTag || "Student group"}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card" style={{ padding: 18 }}>
          <div className="old-widget-head">
            <h3 className="widget-title">Campus moments</h3>
            <Link href="/feed" className="old-widget-link">Share photo</Link>
          </div>
          {campusMoments.length === 0 ? (
            <div className="empty-state-mini"><p>No campus moments yet.</p></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {campusMoments.map((photo: { id: string; imageUrl: string | null; mediumUrl: string | null; originalUrl: string; caption: string | null; ownerName: string | null }) => (
                <Link key={photo.id} href="/feed" title={photo.caption || "Campus moment"} style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "1", background: "#e2e8f0" }}>
                  <img src={photo.imageUrl || photo.mediumUrl || photo.originalUrl} alt={photo.caption || `Photo by ${photo.ownerName || "student"}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card" style={{ padding: 18 }}>
          <div className="old-widget-head">
            <h3 className="widget-title">Students to follow</h3>
            <Link href="/profile?tab=friends" className="old-widget-link">Friends</Link>
          </div>
          <div className="mini-user-list">
            {suggestedFriends.length === 0 ? (
              <div className="empty-state-mini"><p>No suggestions right now.</p></div>
            ) : suggestedFriends.map((student: { id: string; fullName: string | null; reason?: string | null }) => (
              <Link key={student.id} href={`/profile/${student.id}`} className="mini-user-row mini-user-row-link">
                <div className="mini-user-avatar">{student.fullName?.[0] || "U"}</div>
                <div className="mini-user-main">
                  <strong>{student.fullName}</strong>
                  <span>{student.reason || "Student you may know"}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}