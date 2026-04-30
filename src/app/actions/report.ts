"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitError } from "@/lib/rate-limit";

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
  const rateLimitResult = checkRateLimit(userId, "reportContent");
  if (!rateLimitResult.allowed) {
    return { error: getRateLimitError(rateLimitResult.resetTime!) };
  }

  const reportedUserId = formData.get("reportedUserId") as string | null;
  const postId = formData.get("postId") as string | null;
  const commentId = formData.get("commentId") as string | null;
  const reason = formData.get("reason") as string;
  const description = formData.get("description") as string | null;

  if (!reason) {
    return { error: "Reason is required" };
  }

  if (!reportedUserId && !postId && !commentId) {
    return { error: "Must specify what to report" };
  }

  const validReasons = [
    "spam",
    "harassment",
    "inappropriate_content",
    "hate_speech",
    "violence",
    "misinformation",
    "other",
  ];

  if (!validReasons.includes(reason)) {
    return { error: "Invalid reason" };
  }

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
  const reportId = formData.get("reportId") as string;
  const status = formData.get("status") as string;

  if (!reportId || !status) {
    return { error: "Report ID and status are required" };
  }

  const validStatuses = ["pending", "reviewed", "resolved", "dismissed"];
  if (!validStatuses.includes(status)) {
    return { error: "Invalid status" };
  }

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
