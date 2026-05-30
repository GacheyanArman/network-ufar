-- Migration 021: Password reset + expanded audit actions + soft delete
-- Part 1: password_resets table
CREATE TABLE IF NOT EXISTS password_reset (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset(user_id);
CREATE INDEX IF NOT EXISTS password_reset_expires_idx ON password_reset(expires_at);

-- Part 2: Add new audit_action enum values
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'delete_event';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'delete_community';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'soft_delete';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'restore';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'password_reset';

-- Part 3: Soft delete — add deleted_at to core tables
ALTER TABLE post ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE comment ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE photo ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE event ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE community ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE study_material ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE lost_found_item ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE academic_calendar ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE story ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Indexes for soft-delete filtering
CREATE INDEX IF NOT EXISTS post_deleted_at_idx ON post(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS photo_deleted_at_idx ON photo(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS study_material_deleted_at_idx ON study_material(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS event_deleted_at_idx ON event(deleted_at) WHERE deleted_at IS NOT NULL;
