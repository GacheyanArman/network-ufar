-- Onboarding fields for users table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS study_year text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS study_group text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS interests text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS languages text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS looking_for text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;
