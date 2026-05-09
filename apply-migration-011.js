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
      e.code === "42P16"    // invalid table definition (e.g. column already exists)
    ) {
      console.log("already exists");
    } else {
      console.log("FAIL");
      throw e;
    }
  }
}

async function run() {
  console.log("\nApplying migration 011_study_materials_hub...\n");

  // ---------- study_material new columns ----------
  await step("1. study_material.course...", async () => {
    await sql`ALTER TABLE "study_material" ADD COLUMN IF NOT EXISTS "course" TEXT`;
  });
  await step("2. study_material.views_count...", async () => {
    await sql`ALTER TABLE "study_material" ADD COLUMN IF NOT EXISTS "views_count" INTEGER DEFAULT 0 NOT NULL`;
  });
  await step("3. study_material.rating_sum...", async () => {
    await sql`ALTER TABLE "study_material" ADD COLUMN IF NOT EXISTS "rating_sum" INTEGER DEFAULT 0 NOT NULL`;
  });
  await step("4. study_material.rating_count...", async () => {
    await sql`ALTER TABLE "study_material" ADD COLUMN IF NOT EXISTS "rating_count" INTEGER DEFAULT 0 NOT NULL`;
  });

  // ---------- indexes for filters/sorts ----------
  await step("5. study_material_course_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "study_material_course_idx" ON "study_material" ("course")`;
  });
  await step("6. study_material_status_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "study_material_status_idx" ON "study_material" ("status")`;
  });

  // ---------- ratings ----------
  await step("7. study_material_rating table...", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS "study_material_rating" (
        "id" TEXT PRIMARY KEY,
        "material_id" TEXT NOT NULL REFERENCES "study_material"("id") ON DELETE CASCADE,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "rating" INTEGER NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step("8. study_material_rating_unique_idx...", async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "study_material_rating_unique_idx" ON "study_material_rating" ("material_id", "user_id")`;
  });
  await step("9. study_material_rating_material_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "study_material_rating_material_idx" ON "study_material_rating" ("material_id")`;
  });
  await step("10. study_material_rating range constraint...", async () => {
    await sql`
      ALTER TABLE "study_material_rating"
      ADD CONSTRAINT "study_material_rating_range_chk" CHECK ("rating" BETWEEN 1 AND 5)
    `;
  });

  // ---------- comments index ----------
  await step("11. study_material_comment_material_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "study_material_comment_material_idx" ON "study_material_comment" ("material_id")`;
  });

  // ---------- request supporters ----------
  await step("12. study_material_request.supporters_count...", async () => {
    await sql`ALTER TABLE "study_material_request" ADD COLUMN IF NOT EXISTS "supporters_count" INTEGER DEFAULT 0 NOT NULL`;
  });
  await step("13. study_material_request_supporter table...", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS "study_material_request_supporter" (
        "id" TEXT PRIMARY KEY,
        "request_id" TEXT NOT NULL REFERENCES "study_material_request"("id") ON DELETE CASCADE,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step("14. study_material_request_supporter_unique_idx...", async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "study_material_request_supporter_unique_idx" ON "study_material_request_supporter" ("request_id", "user_id")`;
  });
  await step("15. study_material_request_supporter_request_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "study_material_request_supporter_request_idx" ON "study_material_request_supporter" ("request_id")`;
  });

  console.log("\nMigration 011 completed successfully.\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("\nMigration failed:", err.message);
  console.error(err);
  process.exit(1);
});
