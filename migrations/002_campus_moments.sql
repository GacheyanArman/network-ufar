-- Migration: Campus Moments (Instagram-style photo feed + stories + hashtags + tag status)
-- Created: 2026-05-07

-- Enums --------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE photo_tag_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- User role ----------------------------------------------------------------
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user' NOT NULL;

-- Photo enrichment ---------------------------------------------------------
ALTER TABLE photo ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE photo ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE photo ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE photo ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES "event"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS photo_event_idx ON photo(event_id);
CREATE INDEX IF NOT EXISTS photo_created_at_idx ON photo(created_at);

-- Album <-> Event link -----------------------------------------------------
ALTER TABLE photo_album ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES "event"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS photo_album_event_idx ON photo_album(event_id);

-- Photo tag pending/approved -----------------------------------------------
ALTER TABLE photo_tag ADD COLUMN IF NOT EXISTS status photo_tag_status DEFAULT 'pending' NOT NULL;

-- Hashtags -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hashtag (
  id TEXT PRIMARY KEY,
  tag TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS hashtag_tag_unique ON hashtag(tag);
CREATE INDEX IF NOT EXISTS hashtag_usage_idx ON hashtag(usage_count);

CREATE TABLE IF NOT EXISTS photo_hashtag (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  hashtag_id TEXT NOT NULL REFERENCES hashtag(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS photo_hashtag_unique ON photo_hashtag(photo_id, hashtag_id);
CREATE INDEX IF NOT EXISTS photo_hashtag_photo_idx ON photo_hashtag(photo_id);
CREATE INDEX IF NOT EXISTS photo_hashtag_hashtag_idx ON photo_hashtag(hashtag_id);

-- Stories ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  location TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS story_owner_idx ON story(owner_id);
CREATE INDEX IF NOT EXISTS story_expires_idx ON story(expires_at);

CREATE TABLE IF NOT EXISTS story_view (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS story_view_unique ON story_view(story_id, viewer_id);
CREATE INDEX IF NOT EXISTS story_view_story_idx ON story_view(story_id);
CREATE INDEX IF NOT EXISTS story_view_viewer_idx ON story_view(viewer_id);

-- Backfill counters for existing photos ------------------------------------
UPDATE photo p SET likes_count = (
  SELECT COUNT(*)::int FROM photo_like pl WHERE pl.photo_id = p.id
);
UPDATE photo p SET comments_count = (
  SELECT COUNT(*)::int FROM photo_comment pc WHERE pc.photo_id = p.id
);

-- Existing photo tags become approved (legacy data) ------------------------
UPDATE photo_tag SET status = 'approved' WHERE status = 'pending';
