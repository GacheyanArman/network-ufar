CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."relationship_status" AS ENUM('single', 'in_relationship', 'complicated', 'prefer_not_to_say');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "relationship_status" "relationship_status";--> statement-breakpoint
CREATE UNIQUE INDEX "user_follow_unique_idx" ON "user_follow" USING btree ("follower_id","following_id");