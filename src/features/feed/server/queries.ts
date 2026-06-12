import { and, desc, eq, inArray, notInArray, or, gte, lte } from "drizzle-orm";
import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/shared/db/db";
import {
  blockedUsers,
  comments,
  communities,
  communityMembers,
  events,
  eventRsvps,
  friendships,
  photoLikes,
  photos,
  postLikes,
  postSaves,
  posts,
  studyGroups,
  studyMaterials,
  userFollows,
  users,
} from "@/shared/db/schema";
import { getTodayBirthdays } from "@/features/profile/server/birthdays";

type FeedComment = {
  id: string;
  postId: string;
  content: string;
  createdAt: Date | string | null;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
};

type FeedPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  authorId: string;
  communityId: string | null;
  likesCount: number;
  commentsCount: number;
  authorName: string;
  authorFaculty: string | null;
  authorImage: string | null;
  communityName: string | null;
  likedByMe: boolean;
  savedByMe: boolean;
  comments: FeedComment[];
  feedScore: number;
  feedReason: string;
};

type CurrentUser = {
  id: string;
  fullName: string;
  faculty: string | null;
  image: string | null;
  avatarUrl?: string | null;
};


export type FeedEventItem = {
  type: "event";
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  location: string | null;
  startTime: Date;
  endTime: Date | null;
  coverImageUrl: string | null;
  coverThumbnailUrl: string | null;
  organizerName: string;
  communityName: string | null;
  rsvpCount: number;
  rsvpGoing: boolean;
  feedScore: number;
  feedReason: string;
};

export type FeedPhotoItem = {
  type: "photo";
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  caption: string | null;
  ownerId: string;
  ownerName: string;
  ownerImage: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  feedScore: number;
  feedReason: string;
};

export type FeedStudyGroupItem = {
  type: "study_group";
  id: string;
  title: string;
  subject: string | null;
  faculty: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  location: string | null;
  onlineLink: string | null;
  membersCount: number;
  maxMembers: number | null;
  isMember: boolean;
  feedScore: number;
  feedReason: string;
};

export type FeedMaterialItem = {
  type: "material";
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  typeField: string;
  faculty: string | null;
  course: string | null;
  downloadsCount: number;
  helpfulCount: number;
  ratingAvg: number;
  ownerName: string;
  feedScore: number;
  feedReason: string;
};

export type FeedBirthdayItem = {
  type: "birthday";
  id: string;
  userId: string;
  fullName: string;
  image: string | null;
  feedScore: number;
  feedReason: string;
};

export type FeedAnnouncementItem = {
  type: "announcement";
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  authorId: string;
  communityId: string | null;
  likesCount: number;
  commentsCount: number;
  authorName: string;
  authorFaculty: string | null;
  authorImage: string | null;
  communityName: string | null;
  likedByMe: boolean;
  savedByMe: boolean;
  comments: FeedComment[];
  isPinned: boolean;
  feedScore: number;
  feedReason: string;
};

export type UnifiedFeedItem =
  | (FeedPost & { type: "post" })
  | FeedEventItem
  | FeedPhotoItem
  | FeedStudyGroupItem
  | FeedMaterialItem
  | FeedBirthdayItem
  | FeedAnnouncementItem;

type UnifiedFeedResult = {
  currentUser: CurrentUser | null;
  items: UnifiedFeedItem[];
};

function stableNoise(id: string): number {
  let hash = 0;

  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }

  return Math.abs(hash % 100) / 100;
}

function getAgeHours(createdAt: Date): number {
  const now = Date.now();
  const created = createdAt.getTime();

  return Math.max(0, (now - created) / 1000 / 60 / 60);
}

function getOtherFriendId(
  row: {
    requesterId: string;
    receiverId: string;
  },
  userId: string
): string {
  return row.requesterId === userId ? row.receiverId : row.requesterId;
}

function scorePost(params: {
  post: {
    id: string;
    imageUrl: string | null;
    createdAt: Date;
    authorId: string;
    authorFaculty: string | null;
    communityId: string | null;
    likesCount: number;
    commentsCount: number;
  };
  currentUserId: string;
  currentFaculty: string | null;
  friendIds: Set<string>;
  followingIds: Set<string>;
  communityIds: Set<string>;
}): {
  score: number;
  reason: string;
} {
  const {
    post,
    currentUserId,
    currentFaculty,
    friendIds,
    followingIds,
    communityIds,
  } = params;

  const ageHours = getAgeHours(post.createdAt);
  const isSelf = post.authorId === currentUserId;
  const isFriend = friendIds.has(post.authorId);
  const isFollowing = followingIds.has(post.authorId);
  const sameFaculty =
    Boolean(currentFaculty) && post.authorFaculty === currentFaculty;
  const sameCommunity =
    Boolean(post.communityId) && communityIds.has(post.communityId || "");

  let relationshipScore = 0;
  let reason = "Popular on UFARnet";

  if (isSelf) {
    relationshipScore += 50;
    reason = "Your post";
  }

  if (isFriend) {
    relationshipScore += 180;
    reason = "From your friend";
  }

  if (isFollowing) {
    relationshipScore += 150;
    reason = "From someone you follow";
  }

  if (sameCommunity) {
    relationshipScore += 80;

    if (!isFriend && !isFollowing) {
      reason = "From your group";
    }
  }

  if (sameFaculty) {
    relationshipScore += 35;

    if (!isFriend && !isFollowing && !sameCommunity) {
      reason = "From your faculty";
    }
  }

  if (!isSelf && !isFriend && !isFollowing && !sameCommunity && !sameFaculty) {
    relationshipScore += 15;
    reason = "Recommended for you";
  }

  const engagementScore =
    post.likesCount * 4 +
    post.commentsCount * 9 +
    Math.min(40, post.commentsCount * 3);

  const engagementVelocity =
    engagementScore / Math.max(1, ageHours + 2);

  const freshnessScore = 120 * Math.exp(-ageHours / 36);
  const mediaScore = post.imageUrl ? 10 : 0;
  const discoveryScore = stableNoise(post.id) * 8;

  let score =
    relationshipScore +
    engagementScore +
    engagementVelocity * 12 +
    freshnessScore +
    mediaScore +
    discoveryScore;

  if (ageHours > 24 * 14 && !isFriend && !isFollowing) {
    score -= 80;
  }

  if (ageHours > 24 * 30) {
    score -= 120;
  }

  return {
    score,
    reason,
  };
}


function applyInsertionRules(items: UnifiedFeedItem[]): UnifiedFeedItem[] {
  const sorted = [...items].sort((a, b) => b.feedScore - a.feedScore);

  const pinned: UnifiedFeedItem[] = [];
  const rest: UnifiedFeedItem[] = [];

  for (const item of sorted) {
    if (item.type === "announcement" && item.isPinned) {
      pinned.push(item);
    } else {
      rest.push(item);
    }
  }

  const result: UnifiedFeedItem[] = [...pinned];

  let nonPostCount = 0;
  let windowStart = 0;

  for (const item of rest) {
    if (result.length >= 80) break;

    const positionInWindow = result.length - windowStart;

    if (item.type !== "post" && item.type !== "announcement") {
      if (nonPostCount >= 2 && positionInWindow <= 5) {
        continue;
      }
      nonPostCount++;
    }

    if (positionInWindow >= 5) {
      windowStart = result.length;
      nonPostCount = 0;
    }

    result.push(item);
  }

  return result.slice(0, 80);
}

export const getUnifiedFeed = cache((userId: string, limit = 80) => {
  return unstable_cache(
    async (): Promise<UnifiedFeedResult> => {
      // Batch 1: user info + social graph in a SINGLE parallel round-trip
      const [userRows, friendRows, followRows, communityRows, blockedRows] = await Promise.all([
        db.select({
          id: users.id,
          fullName: users.fullName,
          faculty: users.faculty,
          image: users.image,
          avatarUrl: users.avatarUrl,
        })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),
        db.select({ requesterId: friendships.requesterId, receiverId: friendships.receiverId })
          .from(friendships)
          .where(and(eq(friendships.status, "accepted"), or(eq(friendships.requesterId, userId), eq(friendships.receiverId, userId)))),
        db.select({ followingId: userFollows.followingId }).from(userFollows).where(eq(userFollows.followerId, userId)),
        db.select({ communityId: communityMembers.communityId }).from(communityMembers).where(eq(communityMembers.userId, userId)),
        db.select({ blockedId: blockedUsers.blockedId, blockerId: blockedUsers.blockerId })
          .from(blockedUsers)
          .where(or(eq(blockedUsers.blockerId, userId), eq(blockedUsers.blockedId, userId))),
      ]);

      const currentUser = userRows[0];
      if (!currentUser) {
        return { currentUser: null, items: [] };
      }

      const friendIds = new Set<string>(friendRows.map((r: any) => getOtherFriendId(r, userId)));
      const followingIds = new Set<string>(followRows.map((r: any) => r.followingId));
      const communityIds = new Set<string>(communityRows.map((r: any) => r.communityId));
      const blockedUserIds = new Set<string>();
      for (const r of blockedRows) {
        blockedUserIds.add(r.blockerId === userId ? r.blockedId : r.blockerId);
      }

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    candidatePosts,
    upcomingEvents,
    trendingPhotos,
    activeStudyGroups,
    trendingMaterials,
    birthdayUsers,
    announcementPosts,
  ] = await Promise.all([
    db.select({
      id: posts.id, content: posts.content, imageUrl: posts.imageUrl,
      createdAt: posts.createdAt, authorId: posts.authorId, communityId: posts.communityId,
      likesCount: posts.likesCount, commentsCount: posts.commentsCount,
      postType: posts.postType, isPinned: posts.isPinned,
      authorName: users.fullName, authorFaculty: users.faculty, authorImage: users.image,
      authorPrivacyLevel: users.privacyLevel, communityName: communities.name,
    })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .where(blockedUserIds.size > 0 ? notInArray(posts.authorId, Array.from(blockedUserIds)) : undefined)
      .orderBy(desc(posts.createdAt))
      // 60 candidates is enough for the 80-item feed cap with relevance ranking
      .limit(60),

    db.select({
      id: events.id, title: events.title, description: events.description,
      eventType: events.eventType, location: events.location,
      startTime: events.startTime, endTime: events.endTime,
      coverImageUrl: events.coverImageUrl, coverThumbnailUrl: events.coverThumbnailUrl,
      organizerId: events.organizerId, communityId: events.communityId,
    })
      .from(events)
      .where(and(
        gte(events.startTime, now),
        lte(events.startTime, weekAhead),
        eq(events.status, "approved"),
        eq(events.isCancelled, false),
      ))
      .orderBy(events.startTime)
      .limit(20),

    db.select({
      id: photos.id, imageUrl: photos.imageUrl, thumbnailUrl: photos.thumbnailUrl,
      mediumUrl: photos.mediumUrl, caption: photos.caption,
      ownerId: photos.ownerId, likesCount: photos.likesCount, commentsCount: photos.commentsCount,
      ownerName: users.fullName, ownerImage: users.image,
    })
      .from(photos)
      .innerJoin(users, eq(photos.ownerId, users.id))
      .where(and(eq(photos.moderationStatus, "approved"), eq(photos.isPrivate, false)))
      .orderBy(desc(photos.likesCount))
      .limit(15),

    db.select({
      id: studyGroups.id, title: studyGroups.title, subject: studyGroups.subject,
      faculty: studyGroups.faculty, meetingDay: studyGroups.meetingDay,
      meetingTime: studyGroups.meetingTime, location: studyGroups.location,
      onlineLink: studyGroups.onlineLink, membersCount: studyGroups.membersCount,
      maxMembers: studyGroups.maxMembers, ownerId: studyGroups.ownerId,
    })
      .from(studyGroups)
      .where(eq(studyGroups.status, "active"))
      .orderBy(desc(studyGroups.membersCount))
      .limit(10),

    // JOIN owner name directly — avoids a secondary lookup round-trip
    db.select({
      id: studyMaterials.id, title: studyMaterials.title, description: studyMaterials.description,
      fileUrl: studyMaterials.fileUrl, typeField: studyMaterials.type,
      faculty: studyMaterials.faculty, course: studyMaterials.course,
      downloadsCount: studyMaterials.downloadsCount, helpfulCount: studyMaterials.helpfulCount,
      ratingSum: studyMaterials.ratingSum, ratingCount: studyMaterials.ratingCount,
      ownerId: studyMaterials.ownerId, createdAt: studyMaterials.createdAt,
      ownerName: users.fullName,
    })
      .from(studyMaterials)
      .innerJoin(users, eq(studyMaterials.ownerId, users.id))
      .where(eq(studyMaterials.status, "approved"))
      .orderBy(desc(studyMaterials.helpfulCount))
      .limit(10),

    getTodayBirthdays(userId, 5),

    db.select({
      id: posts.id, content: posts.content, imageUrl: posts.imageUrl,
      createdAt: posts.createdAt, authorId: posts.authorId, communityId: posts.communityId,
      likesCount: posts.likesCount, commentsCount: posts.commentsCount,
      isPinned: posts.isPinned,
      authorName: users.fullName, authorFaculty: users.faculty, authorImage: users.image,
      communityName: communities.name,
    })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .where(and(eq(posts.postType, "announcement"), eq(posts.isPinned, true)))
      .orderBy(desc(posts.pinnedAt))
      .limit(5),
  ]);

  const eventOrganizerIds = upcomingEvents.map((e: any) => e.organizerId);
  const eventCommunityIds = upcomingEvents.filter((e: any) => e.communityId).map((e: any) => e.communityId!);

  const [
    organizerNames,
    eventCommunityNames,
    eventRsvpRows,
    myEventRsvps,
    myPhotoLikes,
  ] = await Promise.all([
    eventOrganizerIds.length > 0
      ? db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, eventOrganizerIds))
      : [],
    eventCommunityIds.length > 0
      ? db.select({ id: communities.id, name: communities.name }).from(communities).where(inArray(communities.id, eventCommunityIds))
      : [],
    upcomingEvents.length > 0
      ? db.select({ eventId: eventRsvps.eventId }).from(eventRsvps)
        .where(and(inArray(eventRsvps.eventId, upcomingEvents.map((e: any) => e.id)), eq(eventRsvps.status, "going")))
      : [],
    upcomingEvents.length > 0
      ? db.select({ eventId: eventRsvps.eventId }).from(eventRsvps)
        .where(and(inArray(eventRsvps.eventId, upcomingEvents.map((e: any) => e.id)), eq(eventRsvps.userId, userId), eq(eventRsvps.status, "going")))
      : [],
    trendingPhotos.length > 0
      ? db.select({ photoId: photoLikes.photoId }).from(photoLikes)
        .where(and(inArray(photoLikes.photoId, trendingPhotos.map((p: any) => p.id)), eq(photoLikes.userId, userId)))
      : [],
  ]);

  const organizerMap = new Map((organizerNames as any[]).map((r) => [r.id, r.fullName]));
  const communityNameMap = new Map((eventCommunityNames as any[]).map((r) => [r.id, r.name]));
  const rsvpCountByEvent = new Map<string, number>();
  for (const r of eventRsvpRows as any[]) {
    rsvpCountByEvent.set(r.eventId, (rsvpCountByEvent.get(r.eventId) || 0) + 1);
  }
  const myRsvpEventIds = new Set((myEventRsvps as any[]).map((r) => r.eventId));
  const myLikedPhotoIds = new Set((myPhotoLikes as any[]).map((r) => r.photoId));

  const allItems: UnifiedFeedItem[] = [];

  const filteredPosts = candidatePosts
    .filter((post: any) => {
      if (post.authorId === userId) return true;
      const privacy = post.authorPrivacyLevel || "public";
      if (privacy === "private") return false;
      if (privacy === "friends") return friendIds.has(post.authorId);
      return true;
    })
    .filter((post: any) => post.postType !== "announcement" || !post.isPinned);

  const postIdsForLikes = filteredPosts.slice(0, limit).map((p: any) => p.id);
  const [likedRows, commentRows, savedRows] = postIdsForLikes.length > 0 ? await Promise.all([
    db.select({ postId: postLikes.postId }).from(postLikes)
      .where(and(inArray(postLikes.postId, postIdsForLikes), eq(postLikes.userId, userId))),
    db.select({
      id: comments.id, postId: comments.postId, content: comments.content,
      createdAt: comments.createdAt, authorId: comments.authorId,
      authorName: users.fullName, authorImage: users.image,
    })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(inArray(comments.postId, postIdsForLikes))
      .orderBy(desc(comments.createdAt)),
    db.select({ postId: postSaves.postId }).from(postSaves)
      .where(and(inArray(postSaves.postId, postIdsForLikes), eq(postSaves.userId, userId))),
  ]) : [[], [], []];

  const likedPostIdsSet = new Set((likedRows as any[]).map((r) => r.postId));
  const savedPostIdsSet = new Set((savedRows as any[]).map((r) => r.postId));
  const commentsByPostMap = new Map<string, FeedComment[]>();
  for (const c of commentRows as any[]) {
    const list = commentsByPostMap.get(c.postId) || [];
    list.push(c);
    commentsByPostMap.set(c.postId, list);
  }

  for (const post of filteredPosts) {
    const result = scorePost({
      post,
      currentUserId: userId,
      currentFaculty: currentUser.faculty,
      friendIds,
      followingIds,
      communityIds,
    });
    allItems.push({
      type: "post",
      ...post,
      feedScore: result.score,
      feedReason: result.reason,
      likedByMe: likedPostIdsSet.has(post.id),
      savedByMe: savedPostIdsSet.has(post.id),
      comments: commentsByPostMap.get(post.id) || [],
    });
  }

  for (const evt of upcomingEvents) {
    const hoursUntil = Math.max(0, (evt.startTime.getTime() - now.getTime()) / 1000 / 60 / 60);
    let score = 100;
    let reason = "Upcoming event";

    if (hoursUntil <= 3) {
      score = 450;
      reason = "Event happening soon";
    } else if (hoursUntil <= 24) {
      score = 380;
      reason = "Event today";
    } else if (hoursUntil <= 48) {
      score = 300;
      reason = "Coming up tomorrow";
    } else {
      score = 200 + Math.max(0, 100 - hoursUntil);
    }

    const rsvpCount = rsvpCountByEvent.get(evt.id) || 0;
    score += Math.min(50, rsvpCount * 5);

    if (evt.communityId && communityIds.has(evt.communityId)) {
      score += 60;
      if (!reason.includes("your")) reason = "Event in your group";
    }

    allItems.push({
      type: "event",
      id: evt.id,
      title: evt.title,
      description: evt.description,
      eventType: evt.eventType,
      location: evt.location,
      startTime: evt.startTime,
      endTime: evt.endTime,
      coverImageUrl: evt.coverImageUrl,
      coverThumbnailUrl: evt.coverThumbnailUrl,
      organizerName: organizerMap.get(evt.organizerId) || "Unknown",
      communityName: evt.communityId ? communityNameMap.get(evt.communityId) || null : null,
      rsvpCount,
      rsvpGoing: myRsvpEventIds.has(evt.id),
      feedScore: score,
      feedReason: reason,
    });
  }

  for (const photo of trendingPhotos) {
    let score = 50;
    let reason = "Popular moment";

    score += Math.min(80, photo.likesCount * 3);
    score += Math.min(40, photo.commentsCount * 2);

    if (friendIds.has(photo.ownerId)) {
      score += 80;
      reason = "Your friend's photo";
    } else if (followingIds.has(photo.ownerId)) {
      score += 60;
      reason = "From someone you follow";
    }

    allItems.push({
      type: "photo",
      id: photo.id,
      imageUrl: photo.imageUrl,
      thumbnailUrl: photo.thumbnailUrl,
      mediumUrl: photo.mediumUrl,
      caption: photo.caption,
      ownerId: photo.ownerId,
      ownerName: photo.ownerName,
      ownerImage: photo.ownerImage,
      likesCount: photo.likesCount,
      commentsCount: photo.commentsCount,
      isLiked: myLikedPhotoIds.has(photo.id),
      feedScore: score,
      feedReason: reason,
    });
  }

  for (const group of activeStudyGroups) {
    let score = 80;
    let reason = "Study room active";

    if (group.faculty && group.faculty === currentUser.faculty) {
      score += 60;
      reason = "Study room in your faculty";
    }

    const fillRatio = group.maxMembers ? group.membersCount / group.maxMembers : 0.5;
    score += Math.min(30, Math.floor(fillRatio * 30));

    allItems.push({
      type: "study_group",
      id: group.id,
      title: group.title,
      subject: group.subject,
      faculty: group.faculty,
      meetingDay: group.meetingDay,
      meetingTime: group.meetingTime,
      location: group.location,
      onlineLink: group.onlineLink,
      membersCount: group.membersCount,
      maxMembers: group.maxMembers,
      isMember: false,
      feedScore: score,
      feedReason: reason,
    });
  }

  for (const mat of trendingMaterials) {
    const ageHours = getAgeHours(mat.createdAt);
    let score = 60;
    let reason = "Trending material";

    score += Math.min(60, mat.helpfulCount * 3);
    score += Math.min(40, mat.downloadsCount);
    const avgRating = mat.ratingCount > 0 ? mat.ratingSum / mat.ratingCount : 0;
    score += Math.min(30, avgRating * 6);
    score += 80 * Math.exp(-ageHours / 72);

    if (mat.faculty && mat.faculty === currentUser.faculty) {
      score += 50;
      reason = "Material from your faculty";
    }

    allItems.push({
      type: "material",
      id: mat.id,
      title: mat.title,
      description: mat.description,
      fileUrl: mat.fileUrl,
      typeField: mat.typeField,
      faculty: mat.faculty,
      course: mat.course,
      downloadsCount: mat.downloadsCount,
      helpfulCount: mat.helpfulCount,
      ratingAvg: Math.round(avgRating * 10) / 10,
      ownerName: (mat as any).ownerName || "Unknown",
      feedScore: score,
      feedReason: reason,
    });
  }

  for (const bday of birthdayUsers) {
    allItems.push({
      type: "birthday",
      id: `birthday-${bday.id}`,
      userId: bday.id,
      fullName: bday.fullName,
      image: bday.image,
      feedScore: 350,
      feedReason: "Birthday today",
    });
  }

  for (const ann of announcementPosts) {
    const ageHours = getAgeHours(ann.createdAt);
    let score = 500;
    score += Math.min(200, Math.max(0, 200 - ageHours * 4));

    allItems.push({
      type: "announcement",
      id: ann.id,
      content: ann.content,
      imageUrl: ann.imageUrl,
      createdAt: ann.createdAt,
      authorId: ann.authorId,
      communityId: ann.communityId,
      likesCount: ann.likesCount,
      commentsCount: ann.commentsCount,
      authorName: ann.authorName,
      authorFaculty: ann.authorFaculty,
      authorImage: ann.authorImage,
      communityName: ann.communityName,
      likedByMe: likedPostIdsSet.has(ann.id),
      savedByMe: savedPostIdsSet.has(ann.id),
      comments: commentsByPostMap.get(ann.id) || [],
      isPinned: ann.isPinned,
      feedScore: score,
      feedReason: "Announced in your network",
    });
  }

  const finalItems = applyInsertionRules(allItems);

  return { currentUser, items: finalItems };
    },
    [`unified-feed-${userId}-${limit}`],
    { revalidate: 120, tags: [`feed-${userId}`, "feed"] },
  )();
});

/** Invalidate the feed cache for a user (call after post/like/comment/follow). */
export function invalidateFeedCache(userId: string) {
  revalidateTag(`feed-${userId}`, {});
}
