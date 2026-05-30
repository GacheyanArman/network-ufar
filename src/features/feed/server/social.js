import { and, count, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/shared/db/db";
import {
  communityMembers,
  friendships,
  userFollows,
  users,
} from "@/shared/db/schema";

const PUBLIC_USER_COLUMNS = {
  id: users.id,
  fullName: users.fullName,
  username: users.username,
  faculty: users.faculty,
  image: users.image,
  avatarUrl: users.avatarUrl,
  createdAt: users.createdAt,
};

function getOtherFriendId(row, userId) {
  return row.requesterId === userId ? row.receiverId : row.requesterId;
}

function addScore(map, userId, value) {
  map.set(userId, (map.get(userId) || 0) + value);
}

function addReason(map, userId, reason) {
  const list = map.get(userId) || [];
  if (!list.includes(reason)) list.push(reason);
  map.set(userId, list);
}

export async function getFollowingIdSet(userId) {
  if (!userId) return new Set();

  const rows = await db
    .select({ followingId: userFollows.followingId })
    .from(userFollows)
    .where(eq(userFollows.followerId, userId));

  return new Set(rows.map((row) => row.followingId));
}

export async function getFollowingSummary(userId, limit = 6) {
  if (!userId) {
    return { count: 0, users: [] };
  }

  const [countRow] = await db
    .select({ value: count() })
    .from(userFollows)
    .where(eq(userFollows.followerId, userId));

  const followRows = await db
    .select({
      followingId: userFollows.followingId,
      createdAt: userFollows.createdAt,
    })
    .from(userFollows)
    .where(eq(userFollows.followerId, userId))
    .orderBy(desc(userFollows.createdAt))
    .limit(limit);

  const ids = followRows.map((row) => row.followingId);

  if (ids.length === 0) {
    return { count: Number(countRow?.value || 0), users: [] };
  }

  const rows = await db
    .select(PUBLIC_USER_COLUMNS)
    .from(users)
    .where(inArray(users.id, ids));

  const byId = new Map(rows.map((user) => [user.id, user]));

  return {
    count: Number(countRow?.value || 0),
    users: ids.map((id) => byId.get(id)).filter(Boolean),
  };
}

export async function getPeopleYouMayKnow(userId, limit = 6) {
  if (!userId) return [];

  const [currentUser] = await db
    .select({
      id: users.id,
      faculty: users.faculty,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!currentUser) return [];

  const score = new Map();
  const reasons = new Map();

  const followingIds = await getFollowingIdSet(userId);

  const relationships = await db
    .select()
    .from(friendships)
    .where(
      or(
        eq(friendships.requesterId, userId),
        eq(friendships.receiverId, userId)
      )
    );

  const acceptedFriendIds = new Set(
    relationships
      .filter((item) => item.status === "accepted")
      .map((item) => getOtherFriendId(item, userId))
  );

  for (const friendId of acceptedFriendIds) {
    addScore(score, friendId, 20);
    addReason(reasons, friendId, "Your friend");
  }

  const followerRows = await db
    .select({ followerId: userFollows.followerId })
    .from(userFollows)
    .where(eq(userFollows.followingId, userId))
    .limit(100);

  for (const row of followerRows) {
    addScore(score, row.followerId, 35);
    addReason(reasons, row.followerId, "Follows you");
  }

  if (acceptedFriendIds.size > 0) {
    const friendIds = Array.from(acceptedFriendIds);

    const friendNetworkRows = await db
      .select({
        requesterId: friendships.requesterId,
        receiverId: friendships.receiverId,
      })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            inArray(friendships.requesterId, friendIds),
            inArray(friendships.receiverId, friendIds)
          )
        )
      );

    for (const row of friendNetworkRows) {
      let candidateId = null;

      if (acceptedFriendIds.has(row.requesterId)) {
        candidateId = row.receiverId;
      }

      if (acceptedFriendIds.has(row.receiverId)) {
        candidateId = row.requesterId;
      }

      if (!candidateId || candidateId === userId) continue;

      addScore(score, candidateId, 40);
      addReason(reasons, candidateId, "Mutual friends");
    }
  }

  const currentCommunityRows = await db
    .select({ communityId: communityMembers.communityId })
    .from(communityMembers)
    .where(eq(communityMembers.userId, userId));

  const communityIds = currentCommunityRows.map((row) => row.communityId);

  if (communityIds.length > 0) {
    const sharedCommunityRows = await db
      .select({
        userId: communityMembers.userId,
        communityId: communityMembers.communityId,
      })
      .from(communityMembers)
      .where(inArray(communityMembers.communityId, communityIds));

    const sharedCount = new Map();

    for (const row of sharedCommunityRows) {
      if (row.userId === userId) continue;
      sharedCount.set(row.userId, (sharedCount.get(row.userId) || 0) + 1);
    }

    for (const [candidateId, amount] of sharedCount.entries()) {
      addScore(score, candidateId, amount * 30);
      addReason(reasons, candidateId, "Same communities");
    }
  }

  const candidates = await db
    .select(PUBLIC_USER_COLUMNS)
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(250);

  const blockedIds = new Set([userId, ...followingIds]);

  const ranked = candidates
    .filter((user) => !blockedIds.has(user.id))
    .map((user) => {
      let userScore = score.get(user.id) || 0;
      const userReasons = reasons.get(user.id) || [];

      if (currentUser.faculty && user.faculty === currentUser.faculty) {
        userScore += 25;
        userReasons.push("Same faculty");
      }

      if (user.image || user.avatarUrl) {
        userScore += 6;
      }

      if (user.username) {
        userScore += 4;
      }

      return {
        ...user,
        score: userScore,
        reason:
          userReasons.slice(0, 2).join(" • ") ||
          "New account",
      };
    })
    .filter((user) => user.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length < limit) {
    const existing = new Set(ranked.map((user) => user.id));

    for (const user of candidates) {
      if (ranked.length >= limit) break;
      if (blockedIds.has(user.id) || existing.has(user.id)) continue;

      ranked.push({
        ...user,
        score: 1,
        reason: "New on UFARnet",
      });
    }
  }

  return ranked.slice(0, limit);
}