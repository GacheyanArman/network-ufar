"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/db";
import { reports } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq } from "drizzle-orm";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import {
  safeParseFormData,
  reportContentSchema,
  updateReportStatusSchema,
} from "@/shared/validations/validations";

/**
 * Report content (post, comment, or user)
 */
export async function reportContent(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;

  // Check rate limit
  const rateLimitResult = await checkRateLimitAsync(userId, "reportContent");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime ?? Date.now()) };
  }

  const parsed = safeParseFormData(reportContentSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { reportedUserId, postId, commentId, reason, description } = parsed.data;

  try {
    await db.insert(reports).values({
      reporterId: userId,
      reportedUserId: reportedUserId || null,
      postId: postId || null,
      commentId: commentId || null,
      reason: reason as any,
      description: description || null,
      status: "pending",
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error reporting content:", error);
    return { error: "Failed to submit report" };
  }
}

/**
 * Get all reports (admin only)
 */
export async function getReports(status?: string) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  try {
    const query = db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        reportedUserId: reports.reportedUserId,
        postId: reports.postId,
        commentId: reports.commentId,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        createdAt: reports.createdAt,
      })
      .from(reports);

    if (status) {
      query.where(eq(reports.status, status as any));
    }

    const allReports = await query;

    return { reports: allReports };
  } catch (error) {
    console.error("Error fetching reports:", error);
    return { error: "Failed to fetch reports" };
  }
}

/**
 * Update report status (admin only)
 */
export async function updateReportStatus(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const userId = session.userId as string;
  const parsed = safeParseFormData(updateReportStatusSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { reportId, status } = parsed.data;

  try {
    await db
      .update(reports)
      .set({
        status: status as any,
        reviewedBy: userId,
        reviewedAt: new Date(),
      })
      .where(eq(reports.id, reportId));

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error updating report:", error);
    return { error: "Failed to update report" };
  }
}
