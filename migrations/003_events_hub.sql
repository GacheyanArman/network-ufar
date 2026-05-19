-- Migration: Events hub
-- Adds full student event features: categories, cover image, RSVP waitlist,
-- community events, co-organizers, comments, reminders and QR check-in.

-- Event categories ---------------------------------------------------------
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'club';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'career';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'social';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'exam';

-- RSVP statuses ------------------------------------------------------------
ALTER TYPE "rsvp_status" ADD VALUE IF NOT EXISTS 'waitlisted';

-- Event fields -------------------------------------------------------------
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "enable_waitlist" BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "reminder_offsets" TEXT;
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "last_reminder_sent_minutes" INTEGER;
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "qr_token" TEXT;
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "is_cancelled" BOOLEAN DEFAULT false NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "event_qr_token_unique_idx" ON "event" ("qr_token") WHERE "qr_token" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "event_community_idx" ON "event" ("community_id");

-- RSVP waitlist ------------------------------------------------------------
ALTER TABLE "event_rsvp" ADD COLUMN IF NOT EXISTS "waitlist_position" INTEGER;
CREATE INDEX IF NOT EXISTS "event_rsvp_event_status_idx" ON "event_rsvp" ("event_id", "status");

-- Co-organizers ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "event_co_organizer" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL REFERENCES "event"("id") ON DELETE CASCADE,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_co_organizer_unique_idx" ON "event_co_organizer" ("event_id", "user_id");
CREATE INDEX IF NOT EXISTS "event_co_organizer_event_idx" ON "event_co_organizer" ("event_id");

-- Event comments -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "event_comment" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL REFERENCES "event"("id") ON DELETE CASCADE,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "event_comment_event_idx" ON "event_comment" ("event_id");

-- QR check-ins -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "event_check_in" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL REFERENCES "event"("id") ON DELETE CASCADE,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "checked_in_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_check_in_unique_idx" ON "event_check_in" ("event_id", "user_id");
CREATE INDEX IF NOT EXISTS "event_check_in_event_idx" ON "event_check_in" ("event_id");
