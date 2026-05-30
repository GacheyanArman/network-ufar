ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'club';--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'career';--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'social';--> statement-breakpoint
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'exam';--> statement-breakpoint
ALTER TYPE "rsvp_status" ADD VALUE IF NOT EXISTS 'waitlisted';--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "cover_image_url" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "enable_waitlist" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "reminder_offsets" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "last_reminder_sent_minutes" integer;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "qr_token" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "is_cancelled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_qr_token_unique_idx" ON "event" USING btree ("qr_token") WHERE "qr_token" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_community_idx" ON "event" USING btree ("community_id");--> statement-breakpoint
ALTER TABLE "event_rsvp" ADD COLUMN IF NOT EXISTS "waitlist_position" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_rsvp_event_status_idx" ON "event_rsvp" USING btree ("event_id","status");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_co_organizer" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL REFERENCES "public"."event"("id") ON DELETE cascade,
	"user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL REFERENCES "public"."event"("id") ON DELETE cascade,
	"user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_check_in" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL REFERENCES "public"."event"("id") ON DELETE cascade,
	"user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
	"checked_in_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_co_organizer_unique_idx" ON "event_co_organizer" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_co_organizer_event_idx" ON "event_co_organizer" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_comment_event_idx" ON "event_comment" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_check_in_unique_idx" ON "event_check_in" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_check_in_event_idx" ON "event_check_in" USING btree ("event_id");
