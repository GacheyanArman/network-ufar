"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { communities, communityMembers, posts } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { saveUploadFile } from "@/lib/upload";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

function clean(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

async function isMember(communityId, userId) {
  const [membership] = await db
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId)
      )
    )
    .limit(1);

  return Boolean(membership);
}

export async function createCommunity(formData) {
  const userId = await requireUserId();
  const name = clean(formData.get("name"), 80);
  const description = clean(formData.get("description"), 500);
  const avatarFile = formData.get("avatar");

  if (!name) throw new Error("Community name is required");

  const avatar =
    avatarFile && avatarFile.size > 0
      ? await saveUploadFile(avatarFile, {
          subdir: "communities",
          prefix: "community",
          maxSize: 5 * 1024 * 1024,
          allowedMimePrefix: "image/",
        })
      : null;

  const [community] = await db
    .insert(communities)
    .values({
      name,
      description,
      avatar,
      creatorId: userId,
    })
    .returning();

  await db.insert(communityMembers).values({
    communityId: community.id,
    userId,
    role: "admin",
  });

  revalidatePath("/communities");
  return { ok: true, community };
}

export async function joinCommunity(formData) {
  const userId = await requireUserId();
  const communityId = formData.get("communityId")?.toString().trim();

  if (!communityId) throw new Error("Invalid community");

  await db
    .insert(communityMembers)
    .values({ communityId, userId, role: "member" })
    .onConflictDoNothing();

  revalidatePath("/communities");
  return { ok: true };
}

export async function leaveCommunity(formData) {
  const userId = await requireUserId();
  const communityId = formData.get("communityId")?.toString().trim();

  if (!communityId) throw new Error("Invalid community");

  const [community] = await db
    .select({ creatorId: communities.creatorId })
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);

  if (!community) throw new Error("Community not found");
  if (community.creatorId === userId) {
    throw new Error("Creator cannot leave their own community");
  }

  await db
    .delete(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId)
      )
    );

  revalidatePath("/communities");
  return { ok: true };
}

export async function createCommunityPost(formData) {
  const userId = await requireUserId();
  const communityId = formData.get("communityId")?.toString().trim();
  const content = clean(formData.get("content"), 3000);
  const tags = clean(formData.get("tags"), 200);
  const postType = formData.get("postType")?.toString().trim() || "post";
  const image = formData.get("image");

  if (!communityId) throw new Error("Invalid community");
  if (!content && (!image || image.size === 0)) return { ok: false };

  if (!(await isMember(communityId, userId))) {
    throw new Error("Join the community before posting");
  }

  const imageUrl =
    image && image.size > 0
      ? await saveUploadFile(image, {
          subdir: "posts",
          prefix: "post",
          maxSize: 5 * 1024 * 1024,
          allowedMimePrefix: "image/",
        })
      : null;

  await db.insert(posts).values({
    content,
    imageUrl,
    tags: tags || null,
    postType,
    communityId,
    authorId: userId,
  });

  await db
    .update(communities)
    .set({ updatedAt: sql`now()` })
    .where(eq(communities.id, communityId));

  revalidatePath("/communities");
  revalidatePath(`/communities/${communityId}`);
  return { ok: true };
}
