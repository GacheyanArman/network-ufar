CREATE TYPE "audit_action" AS ENUM ('approve_material', 'reject_material', 'approve_photo', 'reject_photo', 'approve_event', 'reject_event', 'approve_community', 'reject_community', 'resolve_report', 'dismiss_report', 'ban_user', 'unban_user', 'change_role', 'delete_post', 'delete_comment', 'delete_photo', 'delete_material', 'update_book_request');

CREATE TABLE "audit_log" (
  "id" text PRIMARY KEY,
  "actor_id" text NOT NULL REFERENCES "user"("id") ON DELETE SET NULL,
  "action" "audit_action" NOT NULL,
  "target_type" text,
  "target_id" text,
  "details" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "audit_actor_idx" ON "audit_log"("actor_id");
CREATE INDEX "audit_action_idx" ON "audit_log"("action");
CREATE INDEX "audit_target_idx" ON "audit_log"("target_id");
CREATE INDEX "audit_created_at_idx" ON "audit_log"("created_at");

ALTER TABLE "user" ADD COLUMN "ban_expires_at" timestamp;
