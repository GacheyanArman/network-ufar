import { and, desc, eq, gte, or, asc } from "drizzle-orm";
import { db } from "@/shared/db/db";
import {
  schedule,
  academicCalendar,
  studyMaterials,
  posts,
  events,
  communities,
  communityMembers,
  users,
} from "@/shared/db/schema";

export async function getDashboardData(userId: string) {
  const now = new Date();

  // 1. Schedule Items (User's weekly schedule)
  const mySchedule = await db
    .select()
    .from(schedule)
    .where(eq(schedule.createdBy, userId));

  // 2. Upcoming Deadlines
  const upcomingDeadlines = await db
    .select()
    .from(academicCalendar)
    .where(
      and(
        or(
          eq(academicCalendar.createdBy, userId),
          eq(academicCalendar.isPublic, true)
        ),
        gte(academicCalendar.dueDate, now),
        or(
          eq(academicCalendar.eventType, "deadline"),
          eq(academicCalendar.eventType, "exam"),
          eq(academicCalendar.eventType, "homework"),
          eq(academicCalendar.eventType, "assignment"),
          eq(academicCalendar.eventType, "project")
        )
      )
    )
    .orderBy(asc(academicCalendar.dueDate))
    .limit(5);

  // 3. New Materials
  const newMaterials = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      type: studyMaterials.type,
      course: studyMaterials.course,
      createdAt: studyMaterials.createdAt,
    })
    .from(studyMaterials)
    .where(eq(studyMaterials.status, "approved"))
    .orderBy(desc(studyMaterials.createdAt))
    .limit(5);

  // 4. Pinned Announcements
  const pinnedAnnouncements = await db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      authorName: users.fullName,
      authorImage: users.image,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.postType, "announcement"), eq(posts.isPinned, true)))
    .orderBy(desc(posts.pinnedAt))
    .limit(3);

  // 5. Events This Week
  const eventsThisWeek = await db
    .select({
      id: events.id,
      title: events.title,
      startTime: events.startTime,
      location: events.location,
      coverThumbnailUrl: events.coverThumbnailUrl,
    })
    .from(events)
    .where(
      and(
        gte(events.startTime, now),
        eq(events.status, "approved"),
        eq(events.isCancelled, false)
      )
    )
    .orderBy(asc(events.startTime))
    .limit(5);

  // 6. Active Communities
  const myCommunities = await db
    .select({
      id: communities.id,
      name: communities.name,
      avatar: communities.avatar,
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(eq(communityMembers.userId, userId))
    .limit(5);

  return {
    mySchedule,
    upcomingDeadlines,
    newMaterials,
    pinnedAnnouncements,
    eventsThisWeek,
    myCommunities,
  };
}
