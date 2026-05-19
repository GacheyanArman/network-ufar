-- Migration: Add tags, postType, and isPinned to posts table
-- Date: 2026-05-06

ALTER TABLE "post"
ADD COLUMN IF NOT EXISTS "tags" TEXT,
ADD COLUMN IF NOT EXISTS "post_type" TEXT DEFAULT 'post' NOT NULL,
ADD COLUMN IF NOT EXISTS "is_pinned" BOOLEAN DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "post"."tags" IS 'Comma-separated tags like #exam #homework #internship';
COMMENT ON COLUMN "post"."post_type" IS 'Type: post, question, announcement, study_group, poll';
COMMENT ON COLUMN "post"."is_pinned" IS 'Whether post is pinned to top of community';
