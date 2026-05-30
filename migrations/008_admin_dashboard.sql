ALTER TABLE "user" ADD COLUMN "is_banned" boolean NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "banned_at" timestamp;
ALTER TABLE "user" ADD COLUMN "ban_reason" text;
CREATE INDEX "user_banned_idx" ON "user"("is_banned");

CREATE TYPE "event_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
ALTER TABLE "event" ADD COLUMN "status" "event_status" NOT NULL DEFAULT 'approved';
ALTER TABLE "event" ADD COLUMN "reviewed_by" text REFERENCES "user"("id") ON DELETE SET NULL;
ALTER TABLE "event" ADD COLUMN "reviewed_at" timestamp;
CREATE INDEX "event_status_idx" ON "event"("status");

CREATE TYPE "community_status" AS ENUM ('pending', 'approved', 'rejected');
ALTER TABLE "community" ADD COLUMN "status" "community_status" NOT NULL DEFAULT 'approved';
ALTER TABLE "community" ADD COLUMN "reviewed_by" text REFERENCES "user"("id") ON DELETE SET NULL;
ALTER TABLE "community" ADD COLUMN "reviewed_at" timestamp;
CREATE INDEX "community_status_idx" ON "community"("status");

ALTER TABLE "photo" ALTER COLUMN "moderation_status" SET DEFAULT 'pending';

ALTER TABLE "report" ADD COLUMN "target_type" text;
CREATE INDEX "report_target_type_idx" ON "report"("target_type");
