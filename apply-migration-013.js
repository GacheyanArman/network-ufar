import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config();

const sql = neon(process.env.DATABASE_URL);

async function step(label, fn) {
  process.stdout.write(label + " ");
  try {
    await fn();
    console.log("OK");
  } catch (e) {
    if (
      e.code === "42710" || // duplicate object
      e.code === "42701" || // duplicate column
      e.code === "42P07" || // duplicate table
      e.code === "42P16"    // invalid table definition
    ) {
      console.log("already exists");
    } else {
      console.log("FAIL");
      throw e;
    }
  }
}

async function run() {
  console.log("\nApplying migration 013_events_hub...\n");

  // ---------- enums ----------
  for (const v of ["club", "career", "social", "exam"]) {
    await step(`event_type += '${v}'...`, async () => {
      await sql.query(`ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS '${v}'`);
    });
  }
  await step("rsvp_status += 'waitlisted'...", async () => {
    await sql.query(`ALTER TYPE "rsvp_status" ADD VALUE IF NOT EXISTS 'waitlisted'`);
  });

  // ---------- event new columns ----------
  await step("event.cover_image_url...", async () => {
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT`;
  });
  await step("event.enable_waitlist...", async () => {
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "enable_waitlist" BOOLEAN DEFAULT true NOT NULL`;
  });
  await step("event.reminder_offsets...", async () => {
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "reminder_offsets" TEXT`;
  });
  await step("event.last_reminder_sent_minutes...", async () => {
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "last_reminder_sent_minutes" INTEGER`;
  });
  await step("event.qr_token...", async () => {
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "qr_token" TEXT UNIQUE`;
  });
  await step("event.is_cancelled...", async () => {
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "is_cancelled" BOOLEAN DEFAULT false NOT NULL`;
  });

  // ---------- event_rsvp new column ----------
  await step("event_rsvp.waitlist_position...", async () => {
    await sql`ALTER TABLE "event_rsvp" ADD COLUMN IF NOT EXISTS "waitlist_position" INTEGER`;
  });

  // ---------- indexes ----------
  await step("event_community_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "event_community_idx" ON "event" ("community_id")`;
  });
  await step("event_rsvp_event_status_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "event_rsvp_event_status_idx" ON "event_rsvp" ("event_id", "status")`;
  });

  // ---------- new tables ----------
  await step("event_co_organizer table...", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS "event_co_organizer" (
        "id" TEXT PRIMARY KEY,
        "event_id" TEXT NOT NULL REFERENCES "event"("id") ON DELETE CASCADE,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step("event_co_organizer_unique_idx...", async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "event_co_organizer_unique_idx" ON "event_co_organizer" ("event_id", "user_id")`;
  });
  await step("event_co_organizer_event_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "event_co_organizer_event_idx" ON "event_co_organizer" ("event_id")`;
  });

  await step("event_comment table...", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS "event_comment" (
        "id" TEXT PRIMARY KEY,
        "event_id" TEXT NOT NULL REFERENCES "event"("id") ON DELETE CASCADE,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "content" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step("event_comment_event_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "event_comment_event_idx" ON "event_comment" ("event_id")`;
  });

  await step("event_check_in table...", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS "event_check_in" (
        "id" TEXT PRIMARY KEY,
        "event_id" TEXT NOT NULL REFERENCES "event"("id") ON DELETE CASCADE,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "checked_in_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step("event_check_in_unique_idx...", async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "event_check_in_unique_idx" ON "event_check_in" ("event_id", "user_id")`;
  });
  await step("event_check_in_event_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "event_check_in_event_idx" ON "event_check_in" ("event_id")`;
  });

  console.log("\nMigration 013 completed successfully.\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("\nMigration failed:", err.message);
  console.error(err);
  process.exit(1);
});
