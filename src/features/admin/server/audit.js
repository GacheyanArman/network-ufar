import { db } from "@/shared/db/db";
import { auditLog } from "@/shared/db/schema";
import { desc } from "drizzle-orm";

export async function logAudit({ actorId, action, targetType, targetId, details }) {
  try {
    await db.insert(auditLog).values({
      actorId,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      details: details || null,
    });
  } catch (e) {
    console.error("Audit log write failed:", e);
  }
}

export async function getAuditLog(limit, offset, actionFilter) {
  let query = db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit || 50)
    .offset(offset || 0);

  if (actionFilter) {
    const { eq } = await import("drizzle-orm");
    return db
      .select({
        id: auditLog.id,
        actorId: auditLog.actorId,
        action: auditLog.action,
        targetType: auditLog.targetType,
        targetId: auditLog.targetId,
        details: auditLog.details,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(eq(auditLog.action, actionFilter))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit || 50)
      .offset(offset || 0);
  }

  return query;
}
