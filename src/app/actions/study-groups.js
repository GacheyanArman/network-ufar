"use server";

import { and, eq, sql, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { studyGroups, studyGroupMembers } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function createStudyGroup(formData) {
  const userId = await requireUserId();

  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const subject = String(formData.get("subject") || "").trim().slice(0, 120) || null;
  const faculty = String(formData.get("faculty") || "").trim().slice(0, 120) || null;
  const description = String(formData.get("description") || "").trim().slice(0, 1000) || null;
  const meetingDay = String(formData.get("meetingDay") || "").trim().slice(0, 50) || null;
  const meetingTime = String(formData.get("meetingTime") || "").trim().slice(0, 20) || null;
  const location = String(formData.get("location") || "").trim().slice(0, 200) || null;
  const onlineLink = String(formData.get("onlineLink") || "").trim().slice(0, 500) || null;
  const maxMembers = Math.max(2, Math.min(100, Number(formData.get("maxMembers")) || 10));
  const communityId = String(formData.get("communityId") || "").trim() || null;

  if (!title) throw new Error("Title is required");

  const [inserted] = await db
    .insert(studyGroups)
    .values({
      title,
      subject,
      faculty,
      description,
      meetingDay,
      meetingTime,
      location,
      onlineLink,
      maxMembers,
      communityId,
      ownerId: userId,
    })
    .returning({ id: studyGroups.id });

  await db.insert(studyGroupMembers).values({
    groupId: inserted.id,
    userId,
    role: "owner",
  });

  revalidatePath("/study-groups");
  return { ok: true, id: inserted.id };
}

export async function joinStudyGroup(formData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "").trim();
  if (!groupId) throw new Error("Invalid group");

  const [group] = await db
    .select({
      id: studyGroups.id,
      title: studyGroups.title,
      maxMembers: studyGroups.maxMembers,
      membersCount: studyGroups.membersCount,
      ownerId: studyGroups.ownerId,
      status: studyGroups.status,
    })
    .from(studyGroups)
    .where(eq(studyGroups.id, groupId))
    .limit(1);

  if (!group) throw new Error("Group not found");
  if (group.status !== "active") throw new Error("Group is not active");

  const [existing] = await db
    .select({ id: studyGroupMembers.id })
    .from(studyGroupMembers)
    .where(and(eq(studyGroupMembers.groupId, groupId), eq(studyGroupMembers.userId, userId)))
    .limit(1);

  if (existing) throw new Error("Already joined");

  if (group.maxMembers && group.membersCount >= group.maxMembers) {
    throw new Error("Group is full");
  }

  await db.insert(studyGroupMembers).values({
    groupId,
    userId,
  });

  await db
    .update(studyGroups)
    .set({ membersCount: sql`${studyGroups.membersCount} + 1` })
    .where(eq(studyGroups.id, groupId));

  await createNotification({
    userId: group.ownerId,
    actorId: userId,
    type: "group_join",
    entityId: groupId,
  });

  revalidatePath("/study-groups");
  return { ok: true };
}

export async function leaveStudyGroup(formData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "").trim();
  if (!groupId) throw new Error("Invalid group");

  const [group] = await db
    .select({ ownerId: studyGroups.ownerId })
    .from(studyGroups)
    .where(eq(studyGroups.id, groupId))
    .limit(1);

  if (!group) throw new Error("Group not found");
  if (group.ownerId === userId) throw new Error("Owner cannot leave");

  const deleted = await db
    .delete(studyGroupMembers)
    .where(and(eq(studyGroupMembers.groupId, groupId), eq(studyGroupMembers.userId, userId)))
    .returning({ id: studyGroupMembers.id });

  if (deleted.length > 0) {
    await db
      .update(studyGroups)
      .set({ membersCount: sql`GREATEST(${studyGroups.membersCount} - 1, 1)` })
      .where(eq(studyGroups.id, groupId));
  }

  revalidatePath("/study-groups");
  return { ok: true };
}

export async function deleteStudyGroup(formData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "").trim();
  if (!groupId) throw new Error("Invalid group");

  const [group] = await db
    .select({ ownerId: studyGroups.ownerId })
    .from(studyGroups)
    .where(eq(studyGroups.id, groupId))
    .limit(1);

  if (!group) throw new Error("Group not found");
  if (group.ownerId !== userId) throw new Error("Only the owner can delete");

  await db.delete(studyGroups).where(eq(studyGroups.id, groupId));

  revalidatePath("/study-groups");
  return { ok: true };
}

export async function updateStudyGroupStatus(formData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "").trim();
  const status = String(formData.get("status") || "").trim();
  if (!groupId || !["active", "completed", "cancelled"].includes(status)) {
    throw new Error("Invalid data");
  }

  const [group] = await db
    .select({ ownerId: studyGroups.ownerId })
    .from(studyGroups)
    .where(eq(studyGroups.id, groupId))
    .limit(1);

  if (!group) throw new Error("Group not found");
  if (group.ownerId !== userId) throw new Error("Only the owner can update");

  await db
    .update(studyGroups)
    .set({ status, updatedAt: new Date() })
    .where(eq(studyGroups.id, groupId));

  revalidatePath("/study-groups");
  return { ok: true };
}
