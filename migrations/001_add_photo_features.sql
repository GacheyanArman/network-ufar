-- Migration: Add photo features (likes, saves, tags, comments, moderation)
-- Created: 2026-05-06

-- Add new enums
CREATE TYPE album_category AS ENUM (
  'events',
  'clubs',
  'student_life',
  'sports',
  'academic',
  'parties',
  'erasmus',
  'graduation',
  'freshmen',
  'other'
);

CREATE TYPE photo_moderation_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Update photo_album table
ALTER TABLE photo_album
ADD COLUMN category album_category DEFAULT 'other',
ADD COLUMN event_date DATE,
ADD COLUMN cover_photo_url TEXT,
ADD COLUMN is_private BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Update photo table
ALTER TABLE photo
ADD COLUMN moderation_status photo_moderation_status DEFAULT 'approved' NOT NULL,
ADD COLUMN moderated_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
ADD COLUMN moderated_at TIMESTAMP,
ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;

-- Create indexes for photo table
CREATE INDEX photo_owner_idx ON photo(owner_id);
CREATE INDEX photo_album_idx ON photo(album_id);
CREATE INDEX photo_moderation_idx ON photo(moderation_status);

-- Create photo_like table
CREATE TABLE photo_like (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX photo_like_photo_user_unique ON photo_like(photo_id, user_id);
CREATE INDEX photo_like_photo_idx ON photo_like(photo_id);
CREATE INDEX photo_like_user_idx ON photo_like(user_id);

-- Create photo_save table
CREATE TABLE photo_save (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX photo_save_photo_user_unique ON photo_save(photo_id, user_id);
CREATE INDEX photo_save_photo_idx ON photo_save(photo_id);
CREATE INDEX photo_save_user_idx ON photo_save(user_id);

-- Create photo_tag table
CREATE TABLE photo_tag (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  tagged_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX photo_tag_photo_user_unique ON photo_tag(photo_id, user_id);
CREATE INDEX photo_tag_photo_idx ON photo_tag(photo_id);
CREATE INDEX photo_tag_user_idx ON photo_tag(user_id);

-- Create photo_comment table
CREATE TABLE photo_comment (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX photo_comment_photo_idx ON photo_comment(photo_id);
CREATE INDEX photo_comment_user_idx ON photo_comment(user_id);

-- Update report table to support photo reports
ALTER TABLE report
ADD COLUMN photo_id TEXT REFERENCES photo(id) ON DELETE CASCADE;

-- Function to generate CUID-like IDs (if not exists)
CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := TO_CHAR(EXTRACT(EPOCH FROM NOW()) * 1000, 'FM999999999999999');
  random_part := SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 10);
  RETURN 'c' || timestamp_part || random_part;
END;
$$ LANGUAGE plpgsql;
