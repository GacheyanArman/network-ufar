CREATE TABLE "group_chat_member" (
	"id" text PRIMARY KEY NOT NULL,
	"group_chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_chat" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"avatar" text,
	"faculty" text,
	"course" text,
	"creator_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message" ALTER COLUMN "receiver_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "group_chat_id" text;--> statement-breakpoint
ALTER TABLE "group_chat_member" ADD CONSTRAINT "group_chat_member_group_chat_id_group_chat_id_fk" FOREIGN KEY ("group_chat_id") REFERENCES "public"."group_chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_chat_member" ADD CONSTRAINT "group_chat_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_chat" ADD CONSTRAINT "group_chat_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_chat_member_unique_idx" ON "group_chat_member" USING btree ("group_chat_id","user_id");--> statement-breakpoint
CREATE INDEX "group_chat_faculty_idx" ON "group_chat" USING btree ("faculty");--> statement-breakpoint
CREATE INDEX "group_chat_course_idx" ON "group_chat" USING btree ("course");--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_group_chat_id_group_chat_id_fk" FOREIGN KEY ("group_chat_id") REFERENCES "public"."group_chat"("id") ON DELETE cascade ON UPDATE no action;