"use server";

import { revalidatePath } from "next/cache";
import { invalidateUserCache } from "@/shared/cache/cache";
import { headers } from "next/headers";
import { db } from "@/shared/db/db";
import {
  users,
  studyMaterials,
  photos,
  reports,
  events,
  libraryResources,
  libraryRequests,
  communities,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { getUserRole, isStaff, isAdmin } from "@/shared/auth/roles";
import { logAudit, getAuditLog } from "@/features/admin/server/audit";
import { eq, desc, count, ilike, or, and, sql } from "drizzle-orm";
import {
  parseFormDataWith,
  idFormSchema,
  adminBookRequestStatusSchema,
  adminBanUserSchema,
  adminUnbanUserSchema,
  adminChangeUserRoleSchema,
} from "@/shared/validations/validations";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function verifyOrigin() {
  if (ALLOWED_ORIGINS.length === 0) return;
  const hdrs = await headers();
  const origin = hdrs.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    throw new Error("Forbidden: invalid origin");
  }
}

async function requireStaff() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  const role = await getUserRole(session.userId);
  if (!isStaff(role)) throw new Error("Forbidden: staff only");
  return { userId: session.userId, role };
}

async function requireAdmin() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  const role = await getUserRole(session.userId);
  if (!isAdmin(role)) throw new Error("Forbidden: admin only");
  return { userId: session.userId, role };
}

export async function getAdminStats() {
  await requireStaff();

  const [mat, pho, rep, evt, bkReq, res, com, usr, banned] = await Promise.all([
    db
      .select({ count: count() })
      .from(studyMaterials)
      .where(eq(studyMaterials.status, "pending")),
    db
      .select({ count: count() })
      .from(photos)
      .where(eq(photos.moderationStatus, "pending")),
    db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.status, "pending")),
    db
      .select({ count: count() })
      .from(events)
      .where(eq(events.status, "pending")),
    db
      .select({ count: count() })
      .from(libraryRequests)
      .where(eq(libraryRequests.status, "pending")),
    db
      .select({ count: count() })
      .from(libraryResources)
      .where(eq(libraryResources.status, "pending")),
    db
      .select({ count: count() })
      .from(communities)
      .where(eq(communities.status, "pending")),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(eq(users.isBanned, true)),
  ]);

  return {
    pendingMaterials: mat[0]?.count ?? 0,
    pendingPhotos: pho[0]?.count ?? 0,
    openReports: rep[0]?.count ?? 0,
    pendingEvents: evt[0]?.count ?? 0,
    pendingBookRequests: bkReq[0]?.count ?? 0,
    pendingResources: res[0]?.count ?? 0,
    pendingCommunities: com[0]?.count ?? 0,
    totalUsers: usr[0]?.count ?? 0,
    bannedUsers: banned[0]?.count ?? 0,
  };
}

export async function getPendingMaterials() {
  await requireStaff();
  return db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      type: studyMaterials.type,
      faculty: studyMaterials.faculty,
      subject: studyMaterials.subject,
      status: studyMaterials.status,
      createdAt: studyMaterials.createdAt,
      ownerId: studyMaterials.ownerId,
      ownerName: users.fullName,
    })
    .from(studyMaterials)
    .leftJoin(users, eq(studyMaterials.ownerId, users.id))
    .where(eq(studyMaterials.status, "pending"))
    .orderBy(desc(studyMaterials.createdAt));
}

export async function approveMaterial(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [mat] = await db
    .select({ ownerId: studyMaterials.ownerId, title: studyMaterials.title })
    .from(studyMaterials)
    .where(eq(studyMaterials.id, id));

  await db
    .update(studyMaterials)
    .set({ status: "approved" })
    .where(eq(studyMaterials.id, id));

  await logAudit({
    actorId: userId,
    action: "approve_material",
    targetType: "material",
    targetId: id,
    details: mat?.title || null,
  });

  if (mat?.ownerId) {
    const { createSystemNotification } =
      await import("@/features/notifications/server/queries");
    await createSystemNotification({
      userId: mat.ownerId,
      type: "material_approved",
      entityId: id,
    });
  }

  revalidatePath("/admin/materials");
  return { success: true };
}

export async function rejectMaterial(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [mat] = await db
    .select({ title: studyMaterials.title })
    .from(studyMaterials)
    .where(eq(studyMaterials.id, id));

  await db
    .update(studyMaterials)
    .set({ status: "rejected" })
    .where(eq(studyMaterials.id, id));

  await logAudit({
    actorId: userId,
    action: "reject_material",
    targetType: "material",
    targetId: id,
    details: mat?.title || null,
  });
  revalidatePath("/admin/materials");
  return { success: true };
}

export async function pinMaterial(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [mat] = await db
    .select({ title: studyMaterials.title })
    .from(studyMaterials)
    .where(eq(studyMaterials.id, id));

  await db
    .update(studyMaterials)
    .set({ isPinned: true })
    .where(eq(studyMaterials.id, id));

  await logAudit({
    actorId: userId,
    action: "approve_material",
    targetType: "material",
    targetId: id,
    details: `Pinned: ${mat?.title || ""}`,
  });
  revalidatePath("/admin/materials");
  return { success: true };
}

export async function unpinMaterial(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [mat] = await db
    .select({ title: studyMaterials.title })
    .from(studyMaterials)
    .where(eq(studyMaterials.id, id));

  await db
    .update(studyMaterials)
    .set({ isPinned: false })
    .where(eq(studyMaterials.id, id));

  await logAudit({
    actorId: userId,
    action: "approve_material",
    targetType: "material",
    targetId: id,
    details: `Unpinned: ${mat?.title || ""}`,
  });
  revalidatePath("/admin/materials");
  return { success: true };
}

export async function getPendingPhotos() {
  await requireStaff();
  return db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      caption: photos.caption,
      moderationStatus: photos.moderationStatus,
      createdAt: photos.createdAt,
      ownerId: photos.ownerId,
      ownerName: users.fullName,
    })
    .from(photos)
    .leftJoin(users, eq(photos.ownerId, users.id))
    .where(eq(photos.moderationStatus, "pending"))
    .orderBy(desc(photos.createdAt));
}

export async function approvePhoto(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [photo] = await db
    .select({ ownerId: photos.ownerId, caption: photos.caption })
    .from(photos)
    .where(eq(photos.id, id));

  await db
    .update(photos)
    .set({
      moderationStatus: "approved",
      moderatedBy: userId,
      moderatedAt: new Date(),
    })
    .where(eq(photos.id, id));

  await logAudit({
    actorId: userId,
    action: "approve_photo",
    targetType: "photo",
    targetId: id,
    details: photo?.caption || null,
  });

  if (photo?.ownerId) {
    const { createSystemNotification } =
      await import("@/features/notifications/server/queries");
    await createSystemNotification({
      userId: photo.ownerId,
      type: "photo_approved",
      entityId: id,
    });
  }

  revalidatePath("/admin/photos");
  return { success: true };
}

export async function rejectPhoto(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [photo] = await db
    .select({ caption: photos.caption })
    .from(photos)
    .where(eq(photos.id, id));

  await db
    .update(photos)
    .set({
      moderationStatus: "rejected",
      moderatedBy: userId,
      moderatedAt: new Date(),
    })
    .where(eq(photos.id, id));

  await logAudit({
    actorId: userId,
    action: "reject_photo",
    targetType: "photo",
    targetId: id,
    details: photo?.caption || null,
  });
  revalidatePath("/admin/photos");
  return { success: true };
}

export async function getAdminReports(status) {
  await requireStaff();
  if (status) {
    return db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        reportedUserId: reports.reportedUserId,
        postId: reports.postId,
        commentId: reports.commentId,
        photoId: reports.photoId,
        photoCommentId: reports.photoCommentId,
        targetType: reports.targetType,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        reviewedBy: reports.reviewedBy,
        reviewedAt: reports.reviewedAt,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(eq(reports.status, status))
      .orderBy(desc(reports.createdAt));
  }

  return db
    .select({
      id: reports.id,
      reporterId: reports.reporterId,
      reportedUserId: reports.reportedUserId,
      postId: reports.postId,
      commentId: reports.commentId,
      photoId: reports.photoId,
      photoCommentId: reports.photoCommentId,
      targetType: reports.targetType,
      reason: reports.reason,
      description: reports.description,
      status: reports.status,
      reviewedBy: reports.reviewedBy,
      reviewedAt: reports.reviewedAt,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .orderBy(desc(reports.createdAt));
}

export async function resolveReport(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  await db
    .update(reports)
    .set({ status: "resolved", reviewedBy: userId, reviewedAt: new Date() })
    .where(eq(reports.id, id));

  await logAudit({
    actorId: userId,
    action: "resolve_report",
    targetType: "report",
    targetId: id,
  });
  revalidatePath("/admin/reports");
  return { success: true };
}

export async function dismissReport(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  await db
    .update(reports)
    .set({ status: "dismissed", reviewedBy: userId, reviewedAt: new Date() })
    .where(eq(reports.id, id));

  await logAudit({
    actorId: userId,
    action: "dismiss_report",
    targetType: "report",
    targetId: id,
  });
  revalidatePath("/admin/reports");
  return { success: true };
}

export async function getPendingEvents() {
  await requireStaff();
  return db
    .select({
      id: events.id,
      title: events.title,
      eventType: events.eventType,
      startTime: events.startTime,
      status: events.status,
      organizerId: events.organizerId,
      organizerName: users.fullName,
    })
    .from(events)
    .leftJoin(users, eq(events.organizerId, users.id))
    .where(eq(events.status, "pending"))
    .orderBy(desc(events.createdAt));
}

export async function approveEvent(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [evt] = await db
    .select({ title: events.title })
    .from(events)
    .where(eq(events.id, id));

  await db
    .update(events)
    .set({ status: "approved", reviewedBy: userId, reviewedAt: new Date() })
    .where(eq(events.id, id));

  await logAudit({
    actorId: userId,
    action: "approve_event",
    targetType: "event",
    targetId: id,
    details: evt?.title || null,
  });
  revalidatePath("/admin/events");
  return { success: true };
}

export async function rejectEvent(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [evt] = await db
    .select({ title: events.title })
    .from(events)
    .where(eq(events.id, id));

  await db
    .update(events)
    .set({ status: "rejected", reviewedBy: userId, reviewedAt: new Date() })
    .where(eq(events.id, id));

  await logAudit({
    actorId: userId,
    action: "reject_event",
    targetType: "event",
    targetId: id,
    details: evt?.title || null,
  });
  revalidatePath("/admin/events");
  return { success: true };
}

export async function getPendingLibraryResources() {
  await requireStaff();
  return db
    .select({
      id: libraryResources.id,
      title: libraryResources.title,
      type: libraryResources.type,
      faculty: libraryResources.faculty,
      subject: libraryResources.subject,
      status: libraryResources.status,
      createdBy: libraryResources.createdBy,
      creatorName: users.fullName,
      createdAt: libraryResources.createdAt,
    })
    .from(libraryResources)
    .leftJoin(users, eq(libraryResources.createdBy, users.id))
    .where(eq(libraryResources.status, "pending"))
    .orderBy(desc(libraryResources.createdAt));
}

export async function approveLibraryResource(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [res] = await db
    .select({ title: libraryResources.title })
    .from(libraryResources)
    .where(eq(libraryResources.id, id));

  await db
    .update(libraryResources)
    .set({ status: "approved" })
    .where(eq(libraryResources.id, id));

  await logAudit({
    actorId: userId,
    action: "approve_material",
    targetType: "library_resource",
    targetId: id,
    details: res?.title || null,
  });
  revalidatePath("/admin/library");
  return { success: true };
}

export async function rejectLibraryResource(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [res] = await db
    .select({ title: libraryResources.title })
    .from(libraryResources)
    .where(eq(libraryResources.id, id));

  await db
    .update(libraryResources)
    .set({ status: "rejected" })
    .where(eq(libraryResources.id, id));

  await logAudit({
    actorId: userId,
    action: "reject_material",
    targetType: "library_resource",
    targetId: id,
    details: res?.title || null,
  });
  revalidatePath("/admin/library");
  return { success: true };
}

export async function getPendingBookRequests() {
  await requireStaff();
  return db
    .select({
      id: libraryRequests.id,
      title: libraryRequests.title,
      author: libraryRequests.author,
      subject: libraryRequests.subject,
      faculty: libraryRequests.faculty,
      urgency: libraryRequests.urgency,
      status: libraryRequests.status,
      userId: libraryRequests.userId,
      requesterName: users.fullName,
      createdAt: libraryRequests.createdAt,
    })
    .from(libraryRequests)
    .leftJoin(users, eq(libraryRequests.userId, users.id))
    .where(eq(libraryRequests.status, "pending"))
    .orderBy(desc(libraryRequests.createdAt));
}

export async function updateBookRequestStatus(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id, status } = parseFormDataWith(
    adminBookRequestStatusSchema,
    formData,
  );

  const [bk] = await db
    .select({ title: libraryRequests.title })
    .from(libraryRequests)
    .where(eq(libraryRequests.id, id));

  await db
    .update(libraryRequests)
    .set({ status })
    .where(eq(libraryRequests.id, id));

  await logAudit({
    actorId: userId,
    action: "update_book_request",
    targetType: "book_request",
    targetId: id,
    details: `${bk?.title || ""} → ${status}`,
  });
  revalidatePath("/admin/library");
  return { success: true };
}

export async function getPendingCommunities() {
  await requireStaff();
  return db
    .select({
      id: communities.id,
      name: communities.name,
      isPrivate: communities.isPrivate,
      facultyTag: communities.facultyTag,
      status: communities.status,
      creatorId: communities.creatorId,
      creatorName: users.fullName,
      createdAt: communities.createdAt,
    })
    .from(communities)
    .leftJoin(users, eq(communities.creatorId, users.id))
    .where(eq(communities.status, "pending"))
    .orderBy(desc(communities.createdAt));
}

export async function approveCommunity(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [com] = await db
    .select({ name: communities.name })
    .from(communities)
    .where(eq(communities.id, id));

  await db
    .update(communities)
    .set({ status: "approved", reviewedBy: userId, reviewedAt: new Date() })
    .where(eq(communities.id, id));

  await logAudit({
    actorId: userId,
    action: "approve_community",
    targetType: "community",
    targetId: id,
    details: com?.name || null,
  });
  revalidatePath("/admin/communities");
  return { success: true };
}

export async function rejectCommunity(formData) {
  await verifyOrigin();
  const { userId } = await requireStaff();
  const { id } = parseFormDataWith(idFormSchema, formData);

  const [com] = await db
    .select({ name: communities.name })
    .from(communities)
    .where(eq(communities.id, id));

  await db
    .update(communities)
    .set({ status: "rejected", reviewedBy: userId, reviewedAt: new Date() })
    .where(eq(communities.id, id));

  await logAudit({
    actorId: userId,
    action: "reject_community",
    targetType: "community",
    targetId: id,
    details: com?.name || null,
  });
  revalidatePath("/admin/communities");
  return { success: true };
}

export async function getUsersForAdmin(search, page) {
  await requireStaff();
  const limit = 25;
  const offset = ((page || 1) - 1) * limit;

  const base = {
    id: users.id,
    fullName: users.fullName,
    email: users.email,
    faculty: users.faculty,
    role: users.role,
    isBanned: users.isBanned,
    bannedAt: users.bannedAt,
    banReason: users.banReason,
    banExpiresAt: users.banExpiresAt,
    createdAt: users.createdAt,
    image: users.image,
  };

  if (search) {
    return db
      .select(base)
      .from(users)
      .where(
        or(
          ilike(users.fullName, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.faculty, `%${search}%`),
        ),
      )
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select(base)
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function banUser(formData) {
  await verifyOrigin();
  const { userId } = await requireAdmin();
  const {
    userId: targetUserId,
    reason,
    durationHours,
  } = parseFormDataWith(adminBanUserSchema, formData);

  const updates = {
    isBanned: true,
    bannedAt: new Date(),
    banReason: reason || null,
  };

  if (durationHours && durationHours > 0 && durationHours <= 8760) {
    const expires = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    updates.banExpiresAt = expires;
  } else {
    updates.banExpiresAt = null;
  }

  await db.update(users).set(updates).where(eq(users.id, targetUserId));

  const [target] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, targetUserId));

  await logAudit({
    actorId: userId,
    action: "ban_user",
    targetType: "user",
    targetId: targetUserId,
    details: durationHours
      ? `${target?.fullName || ""} suspended for ${durationHours}h: ${reason || "no reason"}`
      : `${target?.fullName || ""} banned: ${reason || "no reason"}`,
  });
  invalidateUserCache(targetUserId);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function unbanUser(formData) {
  await verifyOrigin();
  const { userId } = await requireAdmin();
  const { userId: targetUserId } = parseFormDataWith(
    adminUnbanUserSchema,
    formData,
  );

  await db
    .update(users)
    .set({
      isBanned: false,
      bannedAt: null,
      banReason: null,
      banExpiresAt: null,
    })
    .where(eq(users.id, targetUserId));

  const [target] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, targetUserId));

  await logAudit({
    actorId: userId,
    action: "unban_user",
    targetType: "user",
    targetId: targetUserId,
    details: target?.fullName || null,
  });
  invalidateUserCache(targetUserId);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function changeUserRole(formData) {
  await verifyOrigin();
  const { userId } = await requireAdmin();
  const { userId: targetUserId, role: newRole } = parseFormDataWith(
    adminChangeUserRoleSchema,
    formData,
  );

  const [target] = await db
    .select({ fullName: users.fullName, role: users.role })
    .from(users)
    .where(eq(users.id, targetUserId));

  await db
    .update(users)
    .set({ role: newRole })
    .where(eq(users.id, targetUserId));

  await logAudit({
    actorId: userId,
    action: "change_role",
    targetType: "user",
    targetId: targetUserId,
    details: `${target?.fullName || ""}: ${target?.role || "?"} → ${newRole}`,
  });
  // Bust the layout cache so the target user sees the new role immediately
  // (admin nav shows/hides based on cached role).
  invalidateUserCache(targetUserId);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function getAuditLogPage(page, actionFilter) {
  await requireStaff();
  const limit = 50;
  const offset = ((page || 1) - 1) * limit;

  const entries = await getAuditLog(limit, offset, actionFilter || null);

  const actorIds = [...new Set(entries.map((e) => e.actorId).filter(Boolean))];
  const actorMap = {};
  if (actorIds.length > 0) {
    const actors = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(sql`${users.id} IN ${actorIds}`);
    for (const a of actors) actorMap[a.id] = a.fullName;
  }

  return entries.map((e) => ({
    ...e,
    actorName: actorMap[e.actorId] || "Unknown",
  }));
}
