const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`CREATE TYPE "study_group_status" AS ENUM ('active', 'completed', 'cancelled')`;
    await sql`CREATE TYPE "lost_found_status" AS ENUM ('open', 'returned', 'expired')`;
    await sql`CREATE TYPE "lost_found_type" AS ENUM ('lost', 'found')`;

    await sql`CREATE TABLE "study_group" (
      "id" text PRIMARY KEY,
      "title" text NOT NULL,
      "subject" text,
      "faculty" text,
      "description" text,
      "meeting_day" text,
      "meeting_time" text,
      "location" text,
      "online_link" text,
      "max_members" integer DEFAULT 10,
      "members_count" integer NOT NULL DEFAULT 1,
      "status" "study_group_status" NOT NULL DEFAULT 'active',
      "community_id" text REFERENCES "community"("id") ON DELETE SET NULL,
      "calendar_entry_id" text REFERENCES "academic_calendar"("id") ON DELETE SET NULL,
      "group_chat_id" text REFERENCES "group_chat"("id") ON DELETE SET NULL,
      "owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )`;
    await sql`CREATE INDEX "study_group_owner_idx" ON "study_group"("owner_id")`;
    await sql`CREATE INDEX "study_group_subject_idx" ON "study_group"("subject")`;
    await sql`CREATE INDEX "study_group_faculty_idx" ON "study_group"("faculty")`;
    await sql`CREATE INDEX "study_group_status_idx" ON "study_group"("status")`;

    await sql`CREATE TABLE "study_group_member" (
      "id" text PRIMARY KEY,
      "group_id" text NOT NULL REFERENCES "study_group"("id") ON DELETE CASCADE,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "role" text NOT NULL DEFAULT 'member',
      "joined_at" timestamp NOT NULL DEFAULT now(),
      UNIQUE("group_id", "user_id")
    )`;
    await sql`CREATE INDEX "study_group_member_group_idx" ON "study_group_member"("group_id")`;

    await sql`CREATE TABLE "lost_found_item" (
      "id" text PRIMARY KEY,
      "title" text NOT NULL,
      "type" "lost_found_type" NOT NULL,
      "description" text,
      "location" text NOT NULL,
      "item_date" timestamp NOT NULL DEFAULT now(),
      "image_url" text,
      "contact" text,
      "status" "lost_found_status" NOT NULL DEFAULT 'open',
      "community_id" text REFERENCES "community"("id") ON DELETE SET NULL,
      "owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )`;
    await sql`CREATE INDEX "lost_found_type_idx" ON "lost_found_item"("type")`;
    await sql`CREATE INDEX "lost_found_status_idx" ON "lost_found_item"("status")`;
    await sql`CREATE INDEX "lost_found_owner_idx" ON "lost_found_item"("owner_id")`;

    console.log("Migration 017 OK");
  } catch (e) {
    console.error(e);
  }
}

run();
