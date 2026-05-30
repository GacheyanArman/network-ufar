CREATE TYPE "public"."calendar_event_type" AS ENUM('exam', 'assignment', 'lecture', 'holiday', 'deadline', 'other');--> statement-breakpoint
CREATE TABLE "academic_calendar" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_type" "calendar_event_type" NOT NULL,
	"course" text,
	"due_date" timestamp NOT NULL,
	"created_by" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_calendar" ADD CONSTRAINT "academic_calendar_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_calendar_due_date_idx" ON "academic_calendar" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "academic_calendar_created_by_idx" ON "academic_calendar" USING btree ("created_by");