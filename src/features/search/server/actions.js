"use server";

import { and, ilike, ne, notInArray, or, sql, eq, desc } from "drizzle-orm";
import { db } from "@/shared/db/db";
import { getSession } from "@/shared/auth/session";
import {
  users,
  communities,
  posts,
  events,
  studyMaterials,
  libraryResources,
  photos,
  photoAlbums,
  academicCalendar,
  blockedUsers,
} from "@/shared/db/schema";

export async function unifiedSearch(query) {
  const session = await getSession();
  if (!session?.userId) return { users: [], posts: [], communities: [], events: [], materials: [], library: [], photos: [], albums: [], calendar: [] };

  const q = (query || "").trim();
  if (q.length < 2) return { users: [], posts: [], communities: [], events: [], materials: [], library: [], photos: [], albums: [], calendar: [] };

  const pattern = `%${q}%`;

  const blockedIds = await getBlockedIds(session.userId);
  const excludeBlocked = blockedIds.length > 0
    ? notInArray(users.id, blockedIds)
    : undefined;

  const [
    userRows,
    postRows,
    communityRows,
    eventRows,
    materialRows,
    libraryRows,
    photoRows,
    albumRows,
    calendarRows,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        faculty: users.faculty,
        image: users.image,
      })
      .from(users)
      .where(
        and(
          ne(users.id, session.userId),
          excludeBlocked,
          or(
            ilike(users.fullName, pattern),
            ilike(users.username, pattern),
            ilike(users.email, pattern),
            ilike(users.faculty, pattern)
          )
        )
      )
      .orderBy(users.fullName)
      .limit(15),

    db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        authorName: users.fullName,
        authorImage: users.image,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          ilike(posts.content, pattern),
          blockedIds.length > 0 ? notInArray(posts.authorId, blockedIds) : undefined
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(10),

    db
      .select({
        id: communities.id,
        name: communities.name,
        description: communities.description,
        avatar: communities.avatar,
      })
      .from(communities)
      .where(
        or(
          ilike(communities.name, pattern),
          ilike(communities.description, pattern)
        )
      )
      .orderBy(communities.name)
      .limit(10),

    db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        eventType: events.eventType,
        location: events.location,
        startTime: events.startTime,
        coverImageUrl: events.coverImageUrl,
        isCancelled: events.isCancelled,
      })
      .from(events)
      .where(
        or(
          ilike(events.title, pattern),
          ilike(events.description, pattern),
          ilike(events.location, pattern)
        )
      )
      .orderBy(desc(events.startTime))
      .limit(10),

    db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        description: studyMaterials.description,
        type: studyMaterials.type,
        faculty: studyMaterials.faculty,
        course: studyMaterials.course,
        subject: studyMaterials.subject,
        downloadsCount: studyMaterials.downloadsCount,
      })
      .from(studyMaterials)
      .where(
        and(
          eq(studyMaterials.status, "approved"),
          or(
            ilike(studyMaterials.title, pattern),
            ilike(studyMaterials.description, pattern),
            ilike(studyMaterials.subject, pattern),
            ilike(studyMaterials.professorCourse, pattern),
            ilike(studyMaterials.course, pattern)
          )
        )
      )
      .orderBy(desc(studyMaterials.downloadsCount))
      .limit(10),

    db
      .select({
        id: libraryResources.id,
        title: libraryResources.title,
        author: libraryResources.author,
        type: libraryResources.type,
        faculty: libraryResources.faculty,
        subject: libraryResources.subject,
        availability: libraryResources.availability,
      })
      .from(libraryResources)
      .where(
        or(
          ilike(libraryResources.title, pattern),
          ilike(libraryResources.author, pattern),
          ilike(libraryResources.description, pattern),
          ilike(libraryResources.subject, pattern)
        )
      )
      .orderBy(libraryResources.title)
      .limit(10),

    db
      .select({
        id: photos.id,
        imageUrl: photos.imageUrl,
        thumbnailUrl: photos.thumbnailUrl,
        mediumUrl: photos.mediumUrl,
        width: photos.width,
        height: photos.height,
        caption: photos.caption,
        location: photos.location,
        likesCount: photos.likesCount,
        ownerId: photos.ownerId,
        ownerName: users.fullName,
      })
      .from(photos)
      .innerJoin(users, eq(photos.ownerId, users.id))
      .where(
        and(
          eq(photos.isPrivate, false),
          or(
            ilike(photos.caption, pattern),
            ilike(photos.location, pattern)
          )
        )
      )
      .orderBy(desc(photos.createdAt))
      .limit(10),

    db
      .select({
        id: photoAlbums.id,
        title: photoAlbums.title,
        description: photoAlbums.description,
        category: photoAlbums.category,
        coverPhotoUrl: photoAlbums.coverPhotoUrl,
      })
      .from(photoAlbums)
      .where(
        or(
          ilike(photoAlbums.title, pattern),
          ilike(photoAlbums.description, pattern)
        )
      )
      .orderBy(photoAlbums.title)
      .limit(10),

    db
      .select({
        id: academicCalendar.id,
        title: academicCalendar.title,
        description: academicCalendar.description,
        eventType: academicCalendar.eventType,
        course: academicCalendar.course,
        dueDate: academicCalendar.dueDate,
      })
      .from(academicCalendar)
      .where(
        and(
          eq(academicCalendar.isPublic, true),
          or(
            ilike(academicCalendar.title, pattern),
            ilike(academicCalendar.description, pattern),
            ilike(academicCalendar.course, pattern)
          )
        )
      )
      .orderBy(academicCalendar.dueDate)
      .limit(10),
  ]);

  return {
    users: userRows,
    posts: postRows,
    communities: communityRows,
    events: eventRows,
    materials: materialRows,
    library: libraryRows,
    photos: photoRows,
    albums: albumRows,
    calendar: calendarRows,
  };
}

async function getBlockedIds(userId) {
  const rows = await db
    .select({
      blockedId: blockedUsers.blockedId,
      blockerId: blockedUsers.blockerId,
    })
    .from(blockedUsers)
    .where(
      or(
        sql`${blockedUsers.blockerId} = ${userId}`,
        sql`${blockedUsers.blockedId} = ${userId}`
      )
    );

  const ids = new Set();
  for (const row of rows) {
    if (row.blockerId === userId) ids.add(row.blockedId);
    else ids.add(row.blockerId);
  }
  return Array.from(ids);
}
