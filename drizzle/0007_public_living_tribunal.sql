CREATE TYPE "public"."privacy_level" AS ENUM('public', 'friends', 'private');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "privacy_level" "privacy_level" DEFAULT 'public' NOT NULL;