"use server";

import { and, eq, sql, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { studyGroups, studyGroupMembers } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { createNotification } from "@/features/notifications/server/queries";
import {
  parseFormDataWith,
  createStudyGroupSchema,
  studyGroupIdSchema,
  studyGroupStatusSchema,
} from "@/shared/validations/validations";

async function requireUserId() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId;
}

export async function createStudyGroup(formData) {
  const userId = await requireUserId();

  const data = parseFormDataWith(createStudyGroupSchema, formData);
  // Schema allows 2-500, but UI/business rule caps at 100.
  const maxMembers = Math.max(2, Math.min(100, data.maxMembers || 10));

  const [inserted] = await db
    .insert(studyGroups)
    .values({
      title: data.title,
      subject: data.subject || null,
      faculty: data.faculty || null,
      description: data.description || null,
      meetingDay: data.meetingDay || null,
      meetingTime: data.meetingTime || null,
      location: data.location || null,
      onlineLink: data.onlineLink || null,
      maxMembers,
      communityId: data.communityId || null,
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
  const { groupId } = parseFormDataWith(studyGroupIdSchema, formData);

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
  const { groupId } = parseFormDataWith(studyGroupIdSchema, formData);

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
  const { groupId } = parseFormDataWith(studyGroupIdSchema, formData);

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
  const { groupId, status } = parseFormDataWith(studyGroupStatusSchema, formData);

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
