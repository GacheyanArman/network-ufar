-- Gender & relationship status enums + birth date for onboarding
CREATE TYPE IF NOT EXISTS "gender" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE IF NOT EXISTS "relationship_status" AS ENUM ('single', 'in_relationship', 'complicated', 'prefer_not_to_say');
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "gender" "gender";
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "relationship_status" "relationship_status";
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "birth_date" timestamp;
