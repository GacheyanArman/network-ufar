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
  console.log("\nApplying migration 012_calendar_hub...\n");

  // ---------- enums ----------
  await step("1. notification_type += 'reminder'...", async () => {
    await sql`ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'reminder'`;
  });

  // We need to add new values to calendar_event_type. Use IF NOT EXISTS so
  // re-running is idempotent.
  for (const [n, v] of [
    [2, "homework"],
    [3, "project"],
    [4, "event"],
    [5, "personal"],
    [6, "community"],
  ]) {
    await step(`${n}. calendar_event_type += '${v}'...`, async () => {
      await sql.query(
        `ALTER TYPE "calendar_event_type" ADD VALUE IF NOT EXISTS '${v}'`
      );
    });
  }

  await step("7. calendar_recurrence enum...", async () => {
    await sql`CREATE TYPE "calendar_recurrence" AS ENUM ('none', 'daily', 'weekly', 'monthly')`;
  });

  // ---------- academic_calendar new columns ----------
  await step("8. academic_calendar.faculty...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "faculty" TEXT`;
  });
  await step("9. academic_calendar.community_id...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "community_id" TEXT REFERENCES "community"("id") ON DELETE SET NULL`;
  });
  await step("10. academic_calendar.end_date...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP`;
  });
  await step("11. academic_calendar.is_all_day...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "is_all_day" BOOLEAN DEFAULT false NOT NULL`;
  });
  await step("12. academic_calendar.location...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "location" TEXT`;
  });
  await step("13. academic_calendar.online_link...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "online_link" TEXT`;
  });
  await step("14. academic_calendar.recurrence...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "recurrence" calendar_recurrence DEFAULT 'none' NOT NULL`;
  });
  await step("15. academic_calendar.recurrence_until...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "recurrence_until" TIMESTAMP`;
  });
  await step("16. academic_calendar.reminder_offsets...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "reminder_offsets" TEXT`;
  });
  await step("17. academic_calendar.last_reminder_sent_minutes...", async () => {
    await sql`ALTER TABLE "academic_calendar" ADD COLUMN IF NOT EXISTS "last_reminder_sent_minutes" INTEGER`;
  });

  // ---------- indexes ----------
  await step("18. academic_calendar_faculty_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "academic_calendar_faculty_idx" ON "academic_calendar" ("faculty")`;
  });
  await step("19. academic_calendar_community_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "academic_calendar_community_idx" ON "academic_calendar" ("community_id")`;
  });
  await step("20. academic_calendar_event_type_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "academic_calendar_event_type_idx" ON "academic_calendar" ("event_type")`;
  });

  console.log("\nMigration 012 completed successfully.\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("\nMigration failed:", err.message);
  console.error(err);
  process.exit(1);
});
