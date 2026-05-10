const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'social'`;

    await sql`CREATE TYPE "notification_type_new" AS ENUM (
      'like', 'comment', 'friend_request', 'friend_accept',
      'message', 'reminder', 'material_approved', 'photo_approved',
      'event_new', 'deadline', 'group_join'
    )`;

    await sql`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "notification_type_new" USING "type"::text::"notification_type_new"`;
    await sql`DROP TYPE "notification_type"`;
    await sql`ALTER TYPE "notification_type_new" RENAME TO "notification_type"`;

    await sql`CREATE TABLE IF NOT EXISTS "notification_preference" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE UNIQUE,
      "academic" boolean NOT NULL DEFAULT true,
      "events" boolean NOT NULL DEFAULT true,
      "photos" boolean NOT NULL DEFAULT true,
      "messages" boolean NOT NULL DEFAULT true,
      "materials" boolean NOT NULL DEFAULT true,
      "social" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )`;

    console.log("Migration 016 OK");
  } catch (e) {
    console.error(e);
  }
}

run();
