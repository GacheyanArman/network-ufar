"use server";

import { and, eq, desc, asc, ilike, or, sql, count, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import {
  studyMaterials,
  studyMaterialSaves,
  studyMaterialRequests,
  studyMaterialRequestSupporters,
  studyMaterialComments,
  studyMaterialRatings,
  users,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { saveUploadFileWithMeta, MATERIAL_TYPES } from "@/shared/storage/upload";
import { canModerate } from "@/shared/auth/roles";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import {
  materialRatingSchema,
  materialCommentSchema,
} from "@/shared/validations/validations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");
  return session.userId as string;
}

export type MaterialSort =
  | "newest"
  | "oldest"
  | "most_downloaded"
  | "top_rated"
  | "most_viewed"
  | "most_saved"
  | "most_discussed";

export type MaterialFilters = {
  query?: string;
  faculty?: string;
  course?: string;
  semester?: string;
  year?: string;
  subject?: string;
  type?: string;
  professor?: string;
  sort?: MaterialSort;
};

// Maps a sort key to a Drizzle ORDER BY expression. We always tie-break by
// createdAt DESC so listings stay deterministic.
function sortToOrderBy(sort: MaterialSort | undefined) {
  switch (sort) {
    case "oldest":
      return [asc(studyMaterials.createdAt)];
    case "most_downloaded":
      return [desc(studyMaterials.downloadsCount), desc(studyMaterials.createdAt)];
    case "most_viewed":
      return [desc(studyMaterials.viewsCount), desc(studyMaterials.createdAt)];
    case "top_rated":
      // Materials with no ratings should sink below those with ratings.
      // We sort by (sum / count) using a SQL expression that is NULL when
      // count = 0 — Postgres puts NULLs last by default for DESC.
      return [
        desc(
          sql`CASE WHEN ${studyMaterials.ratingCount} = 0 THEN NULL
                   ELSE ${studyMaterials.ratingSum}::float / ${studyMaterials.ratingCount} END`
        ),
        desc(studyMaterials.ratingCount),
        desc(studyMaterials.createdAt),
      ];
    case "most_saved":
      return [
        desc(
          sql`(SELECT COUNT(*) FROM study_material_save WHERE study_material_save.material_id = ${studyMaterials.id})`
        ),
        desc(studyMaterials.createdAt),
      ];
    case "most_discussed":
      return [
        desc(
          sql`(SELECT COUNT(*) FROM study_material_comment WHERE study_material_comment.material_id = ${studyMaterials.id})`
        ),
        desc(studyMaterials.createdAt),
      ];
    case "newest":
    default:
      return [desc(studyMaterials.createdAt)];
  }
}

// ---------------------------------------------------------------------------
// Materials feed
// ---------------------------------------------------------------------------

/**
 * Fetches the public, approved materials list with full filter/sort/search
 * support. Also enriches each row with the average rating, the current
 * user's rating, and whether the user has saved the material.
 */
export async function getMaterials(filters: MaterialFilters = {}) {
  const session = await getSession();
  const userId = (session?.userId as string | undefined) ?? null;

  const { query, faculty, course, semester, year, subject, type, professor, sort } = filters;

  const conditions: SQL[] = [eq(studyMaterials.status, "approved")];

  if (query) {
    const like = `%${query.trim()}%`;
    // Search across title / description / subject / professor.
    const expr = or(
      ilike(studyMaterials.title, like),
      ilike(studyMaterials.description, like),
      ilike(studyMaterials.subject, like),
      ilike(studyMaterials.professorCourse, like)
    );
    if (expr) conditions.push(expr);
  }

  if (faculty) conditions.push(eq(studyMaterials.faculty, faculty));
  if (course) conditions.push(eq(studyMaterials.course, course));
  if (year) conditions.push(eq(studyMaterials.year, year));
  if (semester) conditions.push(eq(studyMaterials.semesterId, semester));
  if (subject) conditions.push(eq(studyMaterials.subject, subject));
  if (type) conditions.push(eq(studyMaterials.type, type as any));
  if (professor) conditions.push(ilike(studyMaterials.professorCourse, `%${professor}%`));

  const rows = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      description: studyMaterials.description,
      fileUrl: studyMaterials.fileUrl,
      type: studyMaterials.type,
      faculty: studyMaterials.faculty,
      course: studyMaterials.course,
      year: studyMaterials.year,
      subject: studyMaterials.subject,
      professorCourse: studyMaterials.professorCourse,
      isVerified: studyMaterials.isVerified,
      viewsCount: studyMaterials.viewsCount,
      downloadsCount: studyMaterials.downloadsCount,
      helpfulCount: studyMaterials.helpfulCount,
      ratingSum: studyMaterials.ratingSum,
      ratingCount: studyMaterials.ratingCount,
      createdAt: studyMaterials.createdAt,
      ownerId: studyMaterials.ownerId,
      ownerName: users.fullName,
      ownerAvatar: users.avatarUrl,
    })
    .from(studyMaterials)
    .innerJoin(users, eq(studyMaterials.ownerId, users.id))
    .where(and(...conditions))
    .orderBy(...sortToOrderBy(sort));

  // Side queries to enrich the rows with per-user state.
  let savedIds = new Set<string>();
  let userRatings = new Map<string, number>();

  if (userId) {
    const [saves, ratings] = await Promise.all([
      db
        .select({ materialId: studyMaterialSaves.materialId })
        .from(studyMaterialSaves)
        .where(eq(studyMaterialSaves.userId, userId)),
      db
        .select({
          materialId: studyMaterialRatings.materialId,
          rating: studyMaterialRatings.rating,
        })
        .from(studyMaterialRatings)
        .where(eq(studyMaterialRatings.userId, userId)),
    ]);
    savedIds = new Set<string>(saves.map((s: any) => s.materialId));
    userRatings = new Map<string, number>(ratings.map((r: any) => [r.materialId, r.rating]));
  }

  return rows.map((m: any) => ({
    ...m,
    averageRating:
      m.ratingCount > 0
        ? Math.round((m.ratingSum / m.ratingCount) * 10) / 10
        : 0,
    isSaved: savedIds.has(m.id),
    myRating: userRatings.get(m.id) ?? 0,
  }));
}

export type MaterialFeedItem = Awaited<ReturnType<typeof getMaterials>>[number];

// ---------------------------------------------------------------------------
// "My materials" — uploaded / saved / requested by current user
// ---------------------------------------------------------------------------

export async function getMyMaterials() {
  const userId = await requireUserId();

  const [uploaded, savedData, requested] = await Promise.all([
    db
      .select({
        id: studyMaterials.id,
        title: studyMaterials.title,
        type: studyMaterials.type,
        subject: studyMaterials.subject,
        status: studyMaterials.status,
        isVerified: studyMaterials.isVerified,
        viewsCount: studyMaterials.viewsCount,
        downloadsCount: studyMaterials.downloadsCount,
        ratingSum: studyMaterials.ratingSum,
        ratingCount: studyMaterials.ratingCount,
        createdAt: studyMaterials.createdAt,
      })
      .from(studyMaterials)
      .where(eq(studyMaterials.ownerId, userId))
      .orderBy(desc(studyMaterials.createdAt)),

    db
      .select({ material: studyMaterials })
      .from(studyMaterialSaves)
      .innerJoin(
        studyMaterials,
        eq(studyMaterialSaves.materialId, studyMaterials.id)
      )
      .where(eq(studyMaterialSaves.userId, userId))
      .orderBy(desc(studyMaterialSaves.createdAt)),

    db
      .select()
      .from(studyMaterialRequests)
      .where(eq(studyMaterialRequests.userId, userId))
      .orderBy(desc(studyMaterialRequests.createdAt)),
  ]);

  return {
    uploaded: uploaded.map((u: any) => ({
      ...u,
      averageRating:
        u.ratingCount > 0
          ? Math.round((u.ratingSum / u.ratingCount) * 10) / 10
          : 0,
    })),
    saved: savedData.map((s: any) => s.material),
    requested,
  };
}

// ---------------------------------------------------------------------------
// Upload / delete
// ---------------------------------------------------------------------------

export async function uploadMaterial(formData: FormData) {
  const userId = await requireUserId();

  const rl = await checkRateLimitAsync(userId, "uploadStudyMaterial");
  if (!rl.allowed) throw new Error(getRateLimitError(rl.resetTime!));

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const faculty = String(formData.get("faculty") || "").trim();
  const course = String(formData.get("course") || "").trim();
  const year = String(formData.get("year") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const type = String(formData.get("type") || "other").trim() as any;
  const professorCourse = String(formData.get("professorCourse") || "").trim();
  const visibility = String(formData.get("visibility") || "all").trim() as any;
  const file = formData.get("file") as File;

  if (!title) throw new Error("Title is required");
  if (!file || file.size === 0) throw new Error("No file provided");

  const fileResult = await saveUploadFileWithMeta(file, {
    subdir: "materials",
    prefix: "mat",
    maxSize: 20 * 1024 * 1024,
    allowedMimeTypes: [...MATERIAL_TYPES],
    processImage: true,
  });
  const fileUrl = fileResult?.url ?? null;

  await db.insert(studyMaterials).values({
    title: title.slice(0, 160),
    description: description.slice(0, 500),
    faculty,
    course,
    year,
    subject,
    type,
    professorCourse,
    visibility,
    fileUrl,
    ownerId: userId,
    status: "pending", // Moderator needs to approve.
  });

  revalidatePath("/study-materials");
  return { ok: true };
}

/**
 * Delete a material. Allowed only for the author or staff (admin/moderator).
 */
export async function deleteMaterial(materialId: string) {
  const userId = await requireUserId();

  const [row] = await db
    .select({ ownerId: studyMaterials.ownerId })
    .from(studyMaterials)
    .where(eq(studyMaterials.id, materialId))
    .limit(1);

  if (!row) throw new Error("Material not found");

  const allowed = await canModerate(userId, row.ownerId);
  if (!allowed) throw new Error("Forbidden");

  await db.delete(studyMaterials).where(eq(studyMaterials.id, materialId));

  revalidatePath("/study-materials");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Save / unsave
// ---------------------------------------------------------------------------

export async function toggleSaveMaterial(materialId: string) {
  const userId = await requireUserId();

  const existing = await db
    .select()
    .from(studyMaterialSaves)
    .where(
      and(
        eq(studyMaterialSaves.userId, userId),
        eq(studyMaterialSaves.materialId, materialId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(studyMaterialSaves)
      .where(eq(studyMaterialSaves.id, existing[0].id));
  } else {
    await db.insert(studyMaterialSaves).values({ userId, materialId });
  }

  revalidatePath("/study-materials");
  return { ok: true, saved: existing.length === 0 };
}

// ---------------------------------------------------------------------------
// Counters: view / download
// ---------------------------------------------------------------------------

/**
 * Increments the view counter. Called when the user opens a material's
 * details panel. Auth is required so anonymous bots can't inflate views.
 */
export async function trackMaterialView(materialId: string) {
  const userId = await requireUserId();
  // Light-weight rate limit reusing the existing toggleLike bucket
  // (60/min/user is plenty for a click).
  const rl = await checkRateLimitAsync(userId, "toggleLike");
  if (!rl.allowed) return { ok: false };

  await db
    .update(studyMaterials)
    .set({ viewsCount: sql`${studyMaterials.viewsCount} + 1` })
    .where(eq(studyMaterials.id, materialId));

  return { ok: true };
}

/**
 * Increments the download counter and returns the file URL so the client can
 * follow it. Returning the URL avoids a separate DB roundtrip on the client.
 */
export async function trackMaterialDownload(materialId: string) {
  const userId = await requireUserId();
  const rl = await checkRateLimitAsync(userId, "toggleLike");
  if (!rl.allowed) return { ok: false, fileUrl: null };

  const [row] = await db
    .select({ fileUrl: studyMaterials.fileUrl })
    .from(studyMaterials)
    .where(eq(studyMaterials.id, materialId))
    .limit(1);

  if (!row) return { ok: false, fileUrl: null };

  await db
    .update(studyMaterials)
    .set({ downloadsCount: sql`${studyMaterials.downloadsCount} + 1` })
    .where(eq(studyMaterials.id, materialId));

  revalidatePath("/study-materials");
  return { ok: true, fileUrl: row.fileUrl };
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

/**
 * Rates a material 1..5. If the user has already rated the material, the
 * rating is updated and the cached aggregates are adjusted by the delta.
 * The unique index on (material_id, user_id) prevents double inserts.
 */
export async function rateMaterial(materialId: string, rating: number) {
  const userId = await requireUserId();

  const parsed = materialRatingSchema.safeParse({ materialId, rating });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid rating");
  }

  // Make sure target material exists and is approved (no rating ghost rows).
  const [target] = await db
    .select({ status: studyMaterials.status })
    .from(studyMaterials)
    .where(eq(studyMaterials.id, materialId))
    .limit(1);
  if (!target) throw new Error("Material not found");
  if (target.status !== "approved") throw new Error("Material is not yet approved");

  const [existing] = await db
    .select({ id: studyMaterialRatings.id, rating: studyMaterialRatings.rating })
    .from(studyMaterialRatings)
    .where(
      and(
        eq(studyMaterialRatings.materialId, materialId),
        eq(studyMaterialRatings.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    const delta = parsed.data.rating - existing.rating;
    await db
      .update(studyMaterialRatings)
      .set({ rating: parsed.data.rating, updatedAt: new Date() })
      .where(eq(studyMaterialRatings.id, existing.id));
    if (delta !== 0) {
      await db
        .update(studyMaterials)
        .set({ ratingSum: sql`${studyMaterials.ratingSum} + ${delta}` })
        .where(eq(studyMaterials.id, materialId));
    }
  } else {
    await db.insert(studyMaterialRatings).values({
      materialId,
      userId,
      rating: parsed.data.rating,
    });
    await db
      .update(studyMaterials)
      .set({
        ratingSum: sql`${studyMaterials.ratingSum} + ${parsed.data.rating}`,
        ratingCount: sql`${studyMaterials.ratingCount} + 1`,
      })
      .where(eq(studyMaterials.id, materialId));
  }

  revalidatePath("/study-materials");
  return { ok: true, rating: parsed.data.rating };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function getMaterialComments(materialId: string) {
  // Public read — no auth required; comments are part of the public material
  // detail view.
  const rows = await db
    .select({
      id: studyMaterialComments.id,
      content: studyMaterialComments.content,
      createdAt: studyMaterialComments.createdAt,
      userId: studyMaterialComments.userId,
      userName: users.fullName,
      userAvatar: users.avatarUrl,
    })
    .from(studyMaterialComments)
    .innerJoin(users, eq(studyMaterialComments.userId, users.id))
    .where(eq(studyMaterialComments.materialId, materialId))
    .orderBy(desc(studyMaterialComments.createdAt));

  return rows;
}

export async function createMaterialComment(
  materialId: string,
  content: string
) {
  const userId = await requireUserId();

  const rl = await checkRateLimitAsync(userId, "createComment");
  if (!rl.allowed) throw new Error(getRateLimitError(rl.resetTime!));

  const parsed = materialCommentSchema.safeParse({ materialId, content });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid comment");
  }

  const [row] = await db
    .insert(studyMaterialComments)
    .values({
      materialId: parsed.data.materialId,
      userId,
      content: parsed.data.content,
    })
    .returning({
      id: studyMaterialComments.id,
      createdAt: studyMaterialComments.createdAt,
    });

  revalidatePath("/study-materials");
  return { ok: true, id: row.id, createdAt: row.createdAt };
}

/**
 * Deletes a comment. Author or staff can delete.
 */
export async function deleteMaterialComment(commentId: string) {
  const userId = await requireUserId();

  const [row] = await db
    .select({
      authorId: studyMaterialComments.userId,
      materialId: studyMaterialComments.materialId,
    })
    .from(studyMaterialComments)
    .where(eq(studyMaterialComments.id, commentId))
    .limit(1);
  if (!row) throw new Error("Comment not found");

  const allowed = await canModerate(userId, row.authorId);
  if (!allowed) throw new Error("Forbidden");

  await db
    .delete(studyMaterialComments)
    .where(eq(studyMaterialComments.id, commentId));

  revalidatePath("/study-materials");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// "I need this material too" / requests
// ---------------------------------------------------------------------------

export async function requestMaterial(formData: FormData) {
  const userId = await requireUserId();

  const rl = await checkRateLimitAsync(userId, "requestStudyMaterial");
  if (!rl.allowed) throw new Error(getRateLimitError(rl.resetTime!));

  await db.insert(studyMaterialRequests).values({
    userId,
    faculty: String(formData.get("faculty") || "").trim(),
    year: String(formData.get("year") || "").trim(),
    subject: String(formData.get("subject") || "").trim(),
    materialType: String(formData.get("materialType") || "").trim(),
    topic: String(formData.get("topic") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    urgency: String(formData.get("urgency") || "medium") as any,
  });

  revalidatePath("/study-materials");
  return { ok: true };
}

export async function getOpenMaterialRequests() {
  const session = await getSession();
  const userId = (session?.userId as string | undefined) ?? null;

  const rows = await db
    .select({
      id: studyMaterialRequests.id,
      userId: studyMaterialRequests.userId,
      faculty: studyMaterialRequests.faculty,
      year: studyMaterialRequests.year,
      subject: studyMaterialRequests.subject,
      materialType: studyMaterialRequests.materialType,
      topic: studyMaterialRequests.topic,
      description: studyMaterialRequests.description,
      urgency: studyMaterialRequests.urgency,
      status: studyMaterialRequests.status,
      supportersCount: studyMaterialRequests.supportersCount,
      createdAt: studyMaterialRequests.createdAt,
      requesterName: users.fullName,
      requesterAvatar: users.avatarUrl,
    })
    .from(studyMaterialRequests)
    .innerJoin(users, eq(studyMaterialRequests.userId, users.id))
    .where(eq(studyMaterialRequests.status, "pending"))
    .orderBy(desc(studyMaterialRequests.createdAt));

  // Mark which requests the current user already supported, so the UI can
  // disable the button instead of erroring.
  let supportedIds = new Set<string>();
  if (userId) {
    const supports = await db
      .select({ requestId: studyMaterialRequestSupporters.requestId })
      .from(studyMaterialRequestSupporters)
      .where(eq(studyMaterialRequestSupporters.userId, userId));
    supportedIds = new Set<string>(supports.map((s: any) => s.requestId));
  }

  return rows.map((r: any) => ({
    ...r,
    isSupportedByMe: supportedIds.has(r.id),
    isMine: r.userId === userId,
  }));
}

/**
 * "I need this material too" — student supports an existing open request.
 * Idempotent: a second click is a no-op (unique index protection).
 */
export async function supportMaterialRequest(requestId: string) {
  const userId = await requireUserId();

  const rl = await checkRateLimitAsync(userId, "toggleLike");
  if (!rl.allowed) throw new Error(getRateLimitError(rl.resetTime!));

  const [target] = await db
    .select({ id: studyMaterialRequests.id, userId: studyMaterialRequests.userId })
    .from(studyMaterialRequests)
    .where(eq(studyMaterialRequests.id, requestId))
    .limit(1);
  if (!target) throw new Error("Request not found");
  // The author of a request shouldn't "support" themselves.
  if (target.userId === userId) {
    return { ok: true, alreadySupported: true };
  }

  const [existing] = await db
    .select({ id: studyMaterialRequestSupporters.id })
    .from(studyMaterialRequestSupporters)
    .where(
      and(
        eq(studyMaterialRequestSupporters.requestId, requestId),
        eq(studyMaterialRequestSupporters.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    return { ok: true, alreadySupported: true };
  }

  await db
    .insert(studyMaterialRequestSupporters)
    .values({ requestId, userId });

  await db
    .update(studyMaterialRequests)
    .set({
      supportersCount: sql`${studyMaterialRequests.supportersCount} + 1`,
    })
    .where(eq(studyMaterialRequests.id, requestId));

  revalidatePath("/study-materials");
  return { ok: true, alreadySupported: false };
}
