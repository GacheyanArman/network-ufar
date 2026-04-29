CREATE TABLE "email_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follow" (
	"id" text PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "comment_post_idx";--> statement-breakpoint
DROP INDEX "comment_author_idx";--> statement-breakpoint
DROP INDEX "community_member_unique";--> statement-breakpoint
DROP INDEX "community_member_user_idx";--> statement-breakpoint
DROP INDEX "friendship_pair_unique";--> statement-breakpoint
DROP INDEX "friendship_requester_idx";--> statement-breakpoint
DROP INDEX "friendship_receiver_idx";--> statement-breakpoint
DROP INDEX "message_sender_idx";--> statement-breakpoint
DROP INDEX "message_receiver_idx";--> statement-breakpoint
DROP INDEX "message_created_idx";--> statement-breakpoint
DROP INDEX "notification_user_unread_idx";--> statement-breakpoint
DROP INDEX "post_like_unique";--> statement-breakpoint
DROP INDEX "post_like_post_idx";--> statement-breakpoint
DROP INDEX "post_like_user_idx";--> statement-breakpoint
DROP INDEX "post_author_idx";--> statement-breakpoint
DROP INDEX "post_community_idx";--> statement-breakpoint
DROP INDEX "post_created_idx";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_verification" ADD CONSTRAINT "email_verification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_following_id_user_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;