import Link from "next/link";
import { db } from "@/shared/db/db";
import {
  users,
  studyMaterials,
  posts,
  events,
  communities,
  communityMembers,
  courseEnrollments,
  courses,
} from "@/shared/db/schema";
import { eq, and, desc, asc, gte, inArray } from "drizzle-orm";
import {
  getCachedUserSchedule,
  getCachedUpcomingDeadlines,
} from "@/shared/cache/cache";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";
import {
  Badge,
  EmptyState,
  PageHeader,
  PageShell,
} from "@/shared/ui/Layout";
import { Button } from "@/shared/ui/Button";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type TodayDashboardProps = {
  userId: string;
  /**
   * Pre-fetched user info (from page.tsx's cached user call).
   * Saves an extra `users.fullName` round-trip.
   */
  currentUser: { fullName: string | null } | null;
};

/**
 * Today Dashboard — server component.
 *
 * Renders six sections: Next Class, Upcoming Deadlines, New Materials,
 * Pinned Announcements, Events This Week, and My Communities.
 */
export default async function TodayDashboard({
  userId,
  currentUser,
}: TodayDashboardProps) {
  const now = new Date();

  // Stage 1: course enrollments only.
  const enrollments = await db
    .select({ courseId: courseEnrollments.courseId })
    .from(courseEnrollments)
    .where(eq(courseEnrollments.userId, userId));

  const resolvedName = currentUser?.fullName;
  const greeting = resolvedName
    ? `Welcome back, ${resolvedName.split(" ")[0]}`
    : "Welcome to Campus Hub";
  const myCourseIds = enrollments
    .map((e) => e.courseId)
    .filter(Boolean) as string[];

  const currentDayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const currentTime = now.toTimeString().slice(0, 5);

  // Stage 2: parallel — six sections.
  //
  // Schedule + deadlines come from shared cached helpers, so the right
  // panel widget on the home page reuses the same SQL within a render.
  const [
    mySchedule,
    cachedDeadlines,
    newMaterials,
    pinnedAnnouncements,
    eventsThisWeek,
    myCommunities,
  ] = await Promise.all([
    getCachedUserSchedule(userId),

    getCachedUpcomingDeadlines(userId),

    myCourseIds.length > 0
      ? db
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
          .limit(4)
      : Promise.resolve([] as any[]),

    db
      .select({
        id: posts.id,
        content: posts.content,
        authorName: users.fullName,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.postType, "announcement"), eq(posts.isPinned, true)))
      .orderBy(desc(posts.pinnedAt))
      .limit(2),

    db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
        location: events.location,
      })
      .from(events)
      .where(and(gte(events.startTime, now), eq(events.status, "approved")))
      .orderBy(asc(events.startTime))
      .limit(3),

    db
      .select({
        id: communities.id,
        name: communities.name,
        avatar: communities.avatar,
        role: communityMembers.role,
      })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(
        and(
          eq(communityMembers.userId, userId),
          eq(communities.status, "approved"),
        ),
      )
      .orderBy(desc(communityMembers.createdAt))
      .limit(4),
  ]);

  // "Next class" = the next entry that hasn't started yet, scanning today
  // (after current time) → following days → wraparound to start of week.
  // Schedule rows are pre-sorted (dayOfWeek, startTime).
  let nextClass = mySchedule.find(
    (s) => s.dayOfWeek === currentDayOfWeek && s.startTime >= currentTime,
  );
  let isNextWeek = false;

  if (!nextClass) {
    nextClass = mySchedule.find((s) => s.dayOfWeek > currentDayOfWeek);
  }
  if (!nextClass && mySchedule.length > 0) {
    nextClass = mySchedule[0];
    isNextWeek = true;
  }

  const upcomingDeadlines = cachedDeadlines.slice(0, 3);

  return (
    <PageShell variant="wide" className="dashboard-page">
      <PageHeader
        title={greeting}
        description={now.toLocaleDateString("en-US", {
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
          label="Upload Material"
        />
        <QuickActionLink
          href="/courses"
          icon="message-circle"
          label="Ask Question"
        />
        <QuickActionLink
          href="/study-groups"
          icon="users"
          label="Create Group"
        />
        <QuickActionLink
          href="/lost-found"
          icon="search"
          label="Report Lost Item"
        />
      </div>

      <div className="dashboard-grid">
        {/* Section 1: Next Class */}
        <section className="dashboard-section">
          <h2 className="dash-section-title">
            <UiIcon name="book-open" size={20} color="var(--french-gold)" /> Next Class
          </h2>
          <Card padding="none">
            {nextClass ? (
              <div className="dash-next-class">
                <div>
                  <div className="dash-next-class-code">
                    {nextClass.courseCode || nextClass.courseName}
                  </div>
                  <div className="dash-next-class-room">
                    Room: {nextClass.room || "TBA"}
                  </div>
                </div>
                <div className="dash-next-class-meta">
                  <div className="dash-next-class-time">{nextClass.startTime}</div>
                  <div className="dash-next-class-day">
                    {nextClass.dayOfWeek === currentDayOfWeek && !isNextWeek
                      ? "Today"
                      : isNextWeek
                        ? `Next ${DAY_LABELS[nextClass.dayOfWeek]}`
                        : DAY_LABELS[nextClass.dayOfWeek]}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon="calendar"
                title="No classes scheduled"
                action={
                  <Link href="/schedule">
                    <Button variant="outline" size="sm">
                      Manage Schedule
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
            <UiIcon name="clock" size={20} color="var(--french-gold)" /> Upcoming Deadlines
          </h2>
          {upcomingDeadlines.length > 0 ? (
            <div className="dash-list">
              {upcomingDeadlines.map((d) => (
                <Card key={d.id} padding="sm" interactive>
                  <div className="dash-deadline-row">
                    <div className="dash-deadline-date">
                      <div className="dash-deadline-month">
                        {new Date(d.dueDate).toLocaleString("en-US", {
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
              <EmptyState icon="check-circle" title="You're all caught up!" />
            </Card>
          )}
        </section>

        {/* Section 3: New Materials */}
        <section className="dashboard-section">
          <h2 className="dash-section-title">
            <UiIcon name="folder" size={20} color="var(--french-gold)" /> New Materials
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
                title="No new materials"
                description={
                  myCourseIds.length > 0
                    ? "No new materials in your courses."
                    : "Enroll in courses to see materials."
                }
                action={
                  <Link
                    href={myCourseIds.length > 0 ? "/study-materials" : "/courses"}
                  >
                    <Button variant="outline" size="sm">
                      {myCourseIds.length > 0
                        ? "Browse Materials"
                        : "View My Courses"}
                    </Button>
                  </Link>
                }
              />
            </Card>
          )}
        </section>

        {/* Section 4: Campus Announcements */}
        {pinnedAnnouncements.length > 0 && (
          <section className="dashboard-section dashboard-section-wide">
            <h2 className="dash-section-title">
              <UiIcon name="bell" size={20} color="var(--french-gold)" /> Campus Announcements
            </h2>
            <div className="dash-announcements-grid">
              {pinnedAnnouncements.map((a) => (
                <Card
                  key={a.id}
                  padding="md"
                  className="dash-announcement-card"
                >
                  <div className="dash-announcement-meta">
                    <strong>{a.authorName}</strong> •{" "}
                    {new Date(a.createdAt).toLocaleDateString()}
                  </div>
                  <p className="dash-announcement-body">{a.content}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Section 5: Events This Week */}
        <section className="dashboard-section">
          <h2 className="dash-section-title">
            <UiIcon name="calendar" size={20} color="var(--french-gold)" /> Events This Week
          </h2>
          {eventsThisWeek.length > 0 ? (
            <div className="dash-list">
              {eventsThisWeek.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="dash-link-reset"
                >
                  <Card padding="sm" interactive>
                    <div className="dash-event-row">
                      <div className="dash-event-title">{e.title}</div>
                      <div className="dash-event-meta">
                        <span>{new Date(e.startTime).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{e.location || "TBA"}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card padding="md">
              <EmptyState
                icon="calendar"
                title="No upcoming events."
                action={
                  <Link href="/events">
                    <Button variant="outline" size="sm">
                      Browse Events
                    </Button>
                  </Link>
                }
              />
            </Card>
          )}
        </section>

        {/* Section 6: My Communities */}
        <section className="dashboard-section">
          <h2 className="dash-section-title">
            <UiIcon name="group" size={20} color="var(--french-gold)" /> My Communities
          </h2>
          {myCommunities.length > 0 ? (
            <div className="dash-list">
              {myCommunities.map((c) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.id}`}
                  className="dash-link-reset"
                >
                  <Card padding="sm" interactive>
                    <div className="dash-community-row">
                      <div className="dash-community-title">{c.name}</div>
                      <Badge variant="gray">{c.role}</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card padding="md">
              <EmptyState
                icon="group"
                title="You're not in any communities yet."
                action={
                  <Link href="/communities">
                    <Button variant="outline" size="sm">
                      Discover Communities
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
