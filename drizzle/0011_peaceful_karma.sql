CREATE TABLE "schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"course_name" text NOT NULL,
	"course_code" text,
	"instructor" text,
	"room" text,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"faculty" text,
	"semester" text,
	"created_by" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_day_of_week_idx" ON "schedule" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "schedule_created_by_idx" ON "schedule" USING btree ("created_by");