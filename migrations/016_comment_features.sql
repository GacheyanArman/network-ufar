-- Migration: Instagram-style comment features
-- Adds threading (replies), likes count, and dedicated comment-like tables
-- for both post comments and photo comments.
-- Created: 2026-05-10

-- POST COMMENTS ---------------------------------------------------
ALTER TABLE "comment" ADD COLUMN IF NOT EXISTS parent_comment_id TEXT;
ALTER TABLE "comment" ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS comment_post_idx ON "comment"(post_id);
CREATE INDEX IF NOT EXISTS comment_parent_idx ON "comment"(parent_comment_id);

CREATE TABLE IF NOT EXISTS "comment_like" (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES "comment"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS comment_like_comment_user_unique
  ON "comment_like"(comment_id, user_id);
CREATE INDEX IF NOT EXISTS comment_like_comment_idx
  ON "comment_like"(comment_id);

-- PHOTO COMMENTS --------------------------------------------------
ALTER TABLE "photo_comment" ADD COLUMN IF NOT EXISTS parent_comment_id TEXT;
ALTER TABLE "photo_comment" ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS photo_comment_parent_idx
  ON "photo_comment"(parent_comment_id);

CREATE TABLE IF NOT EXISTS "photo_comment_like" (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES "photo_comment"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS photo_comment_like_comment_user_unique
  ON "photo_comment_like"(comment_id, user_id);
CREATE INDEX IF NOT EXISTS photo_comment_like_comment_idx
  ON "photo_comment_like"(comment_id);

-- REPORTS support for photo comments ------------------------------
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS photo_comment_id TEXT
  REFERENCES "photo_comment"(id) ON DELETE CASCADE;
