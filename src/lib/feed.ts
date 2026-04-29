import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  comments,
  communities,
  communityMembers,
  friendships,
  postLikes,
  posts,
  userFollows,
  users,
} from "@/lib/schema";

type FeedComment = {
  id: string;
  postId: string;
  content: string;
  createdAt: Date;
  authorId: string;
  authorName: string;
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

type FeedResult = {
  currentUser: CurrentUser | null;
  posts: FeedPost[];
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
      reason = "From your community";
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

export async function getRankedFeedPosts(
  userId: string,
  limit = 80
): Promise<FeedResult> {
  const [currentUser] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      faculty: users.faculty,
      image: users.image,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!currentUser) {
    return {
      currentUser: null,
      posts: [],
    };
  }

  const [friendRows, followRows, communityRows] = await Promise.all([
    db
      .select({
        requesterId: friendships.requesterId,
        receiverId: friendships.receiverId,
      })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.receiverId, userId)
          )
        )
      ),

    db
      .select({
        followingId: userFollows.followingId,
      })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId)),

    db
      .select({
        communityId: communityMembers.communityId,
      })
      .from(communityMembers)
      .where(eq(communityMembers.userId, userId)),
  ]);

  const friendIds = new Set(
    friendRows.map((row) => getOtherFriendId(row, userId))
  );

  const followingIds = new Set(followRows.map((row) => row.followingId));
  const communityIds = new Set(communityRows.map((row) => row.communityId));

  const candidatePosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      communityId: posts.communityId,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      authorName: users.fullName,
      authorFaculty: users.faculty,
      authorImage: users.image,
      communityName: communities.name,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(communities, eq(posts.communityId, communities.id))
    .orderBy(desc(posts.createdAt))
    .limit(400);

  const rankedPosts = candidatePosts
    .map((post) => {
      const result = scorePost({
        post,
        currentUserId: userId,
        currentFaculty: currentUser.faculty,
        friendIds,
        followingIds,
        communityIds,
      });

      return {
        ...post,
        feedScore: result.score,
        feedReason: result.reason,
      };
    })
    .sort((a, b) => b.feedScore - a.feedScore)
    .slice(0, limit);

  const postIds = rankedPosts.map((post) => post.id);

  if (postIds.length === 0) {
    return {
      currentUser,
      posts: [],
    };
  }

  const [likedRows, commentRows] = await Promise.all([
    db
      .select({
        postId: postLikes.postId,
      })
      .from(postLikes)
      .where(and(inArray(postLikes.postId, postIds), eq(postLikes.userId, userId))),

    db
      .select({
        id: comments.id,
        postId: comments.postId,
        content: comments.content,
        createdAt: comments.createdAt,
        authorId: comments.authorId,
        authorName: users.fullName,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(inArray(comments.postId, postIds))
      .orderBy(comments.createdAt),
  ]);

  const likedPostIds = new Set(likedRows.map((row) => row.postId));

  const commentsByPost = new Map<string, FeedComment[]>();

  for (const comment of commentRows) {
    const list = commentsByPost.get(comment.postId) || [];
    list.push(comment);
    commentsByPost.set(comment.postId, list);
  }

  return {
    currentUser,
    posts: rankedPosts.map((post) => ({
      ...post,
      likedByMe: likedPostIds.has(post.id),
      comments: commentsByPost.get(post.id) || [],
    })),
  };
}