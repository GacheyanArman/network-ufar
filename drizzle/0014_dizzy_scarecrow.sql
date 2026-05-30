CREATE TYPE "public"."audit_action" AS ENUM('approve_material', 'reject_material', 'approve_photo', 'reject_photo', 'approve_event', 'reject_event', 'approve_community', 'reject_community', 'resolve_report', 'dismiss_report', 'ban_user', 'unban_user', 'change_role', 'delete_post', 'delete_comment', 'delete_photo', 'delete_material', 'delete_event', 'delete_community', 'soft_delete', 'restore', 'password_reset', 'update_book_request');--> statement-breakpoint
CREATE TYPE "public"."community_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lost_found_status" AS ENUM('open', 'returned', 'expired');--> statement-breakpoint
CREATE TYPE "public"."lost_found_type" AS ENUM('lost', 'found');--> statement-breakpoint
CREATE TYPE "public"."study_group_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'friend_accept' BEFORE 'reminder';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'message' BEFORE 'reminder';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'material_approved';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'photo_approved';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'event_new';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'deadline';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'group_join';--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"target_type" text,
	"target_id" text,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_like" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lost_found_item" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" "lost_found_type" NOT NULL,
	"description" text,
	"location" text NOT NULL,
	"item_date" timestamp DEFAULT now() NOT NULL,
	"image_url" text,
	"contact" text,
	"status" "lost_found_status" DEFAULT 'open' NOT NULL,
	"community_id" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preference" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"academic" boolean DEFAULT true NOT NULL,
	"events" boolean DEFAULT true NOT NULL,
	"photos" boolean DEFAULT true NOT NULL,
	"messages" boolean DEFAULT true NOT NULL,
	"materials" boolean DEFAULT true NOT NULL,
	"social" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preference_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "password_reset" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_comment_like" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_group_member" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_group" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject" text,
	"faculty" text,
	"description" text,
	"meeting_day" text,
	"meeting_time" text,
	"location" text,
	"online_link" text,
	"max_members" integer DEFAULT 10,
	"members_count" integer DEFAULT 1 NOT NULL,
	"status" "study_group_status" DEFAULT 'active' NOT NULL,
	"community_id" text,
	"calendar_entry_id" text,
	"group_chat_id" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photo" ALTER COLUMN "moderation_status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "comment" ADD COLUMN "parent_comment_id" text;--> statement-breakpoint
ALTER TABLE "comment" ADD COLUMN "likes_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "community" ADD COLUMN "status" "community_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "community" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "community" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "cover_thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "cover_medium_url" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "status" "event_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "category" text DEFAULT 'social' NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_comment" ADD COLUMN "parent_comment_id" text;--> statement-breakpoint
ALTER TABLE "photo_comment" ADD COLUMN "likes_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "medium_url" text;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "photo_comment_id" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "target_type" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "study_year" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "study_group" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "interests" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "languages" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "looking_for" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarding_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_like" ADD CONSTRAINT "comment_like_comment_id_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_like" ADD CONSTRAINT "comment_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_item" ADD CONSTRAINT "lost_found_item_community_id_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."community"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_item" ADD CONSTRAINT "lost_found_item_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset" ADD CONSTRAINT "password_reset_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_comment_like" ADD CONSTRAINT "photo_comment_like_comment_id_photo_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."photo_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_comment_like" ADD CONSTRAINT "photo_comment_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_group_member" ADD CONSTRAINT "study_group_member_group_id_study_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."study_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_group_member" ADD CONSTRAINT "study_group_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_group" ADD CONSTRAINT "study_group_community_id_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."community"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_group" ADD CONSTRAINT "study_group_calendar_entry_id_academic_calendar_id_fk" FOREIGN KEY ("calendar_entry_id") REFERENCES "public"."academic_calendar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_group" ADD CONSTRAINT "study_group_group_chat_id_group_chat_id_fk" FOREIGN KEY ("group_chat_id") REFERENCES "public"."group_chat"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_group" ADD CONSTRAINT "study_group_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_target_idx" ON "audit_log" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "audit_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_like_comment_user_unique" ON "comment_like" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "comment_like_comment_idx" ON "comment_like" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "lost_found_type_idx" ON "lost_found_item" USING btree ("type");--> statement-breakpoint
CREATE INDEX "lost_found_status_idx" ON "lost_found_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lost_found_owner_idx" ON "lost_found_item" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_reset" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_expires_idx" ON "password_reset" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "photo_comment_like_comment_user_unique" ON "photo_comment_like" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "photo_comment_like_comment_idx" ON "photo_comment_like" USING btree ("comment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "study_group_member_unique_idx" ON "study_group_member" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "study_group_member_group_idx" ON "study_group_member" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "study_group_owner_idx" ON "study_group" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "study_group_subject_idx" ON "study_group" USING btree ("subject");--> statement-breakpoint
CREATE INDEX "study_group_faculty_idx" ON "study_group" USING btree ("faculty");--> statement-breakpoint
CREATE INDEX "study_group_status_idx" ON "study_group" USING btree ("status");--> statement-breakpoint
ALTER TABLE "community" ADD CONSTRAINT "community_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_photo_comment_id_photo_comment_id_fk" FOREIGN KEY ("photo_comment_id") REFERENCES "public"."photo_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_post_idx" ON "comment" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comment_parent_idx" ON "comment" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "community_status_idx" ON "community" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_status_idx" ON "event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "photo_comment_parent_idx" ON "photo_comment" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "report_target_type_idx" ON "report" USING btree ("target_type");