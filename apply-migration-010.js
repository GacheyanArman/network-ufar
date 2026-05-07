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
      e.code === "42710" ||
      e.code === "42701" ||
      e.code === "42P07" ||
      e.code === "42P16"
    ) {
      console.log("already exists");
    } else {
      console.log("FAIL");
      throw e;
    }
  }
}

async function run() {
  console.log("\nApplying migration 010_communities_enrichment...\n");

  // --------- Enums ----------
  await step("1. community_join_request_status enum...", async () => {
    await sql`CREATE TYPE community_join_request_status AS ENUM ('pending', 'approved', 'rejected')`;
  });

  // --------- Community table ----------
  await step("2. community.rules...", async () => {
    await sql`ALTER TABLE "community" ADD COLUMN IF NOT EXISTS "rules" TEXT`;
  });
  await step("3. community.is_private...", async () => {
    await sql`ALTER TABLE "community" ADD COLUMN IF NOT EXISTS "is_private" BOOLEAN DEFAULT false NOT NULL`;
  });
  await step("4. community.faculty_tag...", async () => {
    await sql`ALTER TABLE "community" ADD COLUMN IF NOT EXISTS "faculty_tag" TEXT`;
  });
  await step("5. community.year_tag...", async () => {
    await sql`ALTER TABLE "community" ADD COLUMN IF NOT EXISTS "year_tag" TEXT`;
  });
  await step("6. community.interests...", async () => {
    await sql`ALTER TABLE "community" ADD COLUMN IF NOT EXISTS "interests" TEXT`;
  });
  await step("7. community_faculty_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "community_faculty_idx" ON "community" ("faculty_tag")`;
  });
  await step("8. community_name_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "community_name_idx" ON "community" ("name")`;
  });

  // --------- Community members ----------
  await step("9. community_member_unique_idx...", async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "community_member_unique_idx" ON "community_member" ("community_id", "user_id")`;
  });
  await step("10. rename role admin -> owner...", async () => {
    await sql`UPDATE "community_member" SET "role" = 'owner' WHERE "role" = 'admin'`;
  });

  // --------- Join requests ----------
  await step("11. community_join_request table...", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS "community_join_request" (
        "id" TEXT PRIMARY KEY,
        "community_id" TEXT NOT NULL REFERENCES "community"("id") ON DELETE CASCADE,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "message" TEXT,
        "status" community_join_request_status DEFAULT 'pending' NOT NULL,
        "decided_by" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
        "decided_at" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step("12. community_join_request_unique_idx...", async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "community_join_request_unique_idx" ON "community_join_request" ("community_id", "user_id")`;
  });
  await step("13. community_join_request_status_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "community_join_request_status_idx" ON "community_join_request" ("status")`;
  });

  // --------- Posts ----------
  await step("14. post.tags...", async () => {
    await sql`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "tags" TEXT`;
  });
  await step("15. post.post_type...", async () => {
    await sql`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "post_type" TEXT DEFAULT 'discussion' NOT NULL`;
  });
  await step("16. post.is_pinned...", async () => {
    await sql`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "is_pinned" BOOLEAN DEFAULT false NOT NULL`;
  });
  await step("17. post.pinned_at...", async () => {
    await sql`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "pinned_at" TIMESTAMP`;
  });
  await step("18. post.pinned_by...", async () => {
    await sql`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "pinned_by" TEXT REFERENCES "user"("id") ON DELETE SET NULL`;
  });
  await step("19. post.is_solved...", async () => {
    await sql`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "is_solved" BOOLEAN DEFAULT false NOT NULL`;
  });
  await step("20. post.best_comment_id...", async () => {
    await sql`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "best_comment_id" TEXT`;
  });
  await step("21. post.solved_at...", async () => {
    await sql`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "solved_at" TIMESTAMP`;
  });
  await step("22. migrate legacy post_type 'post'...", async () => {
    await sql`UPDATE "post" SET "post_type" = 'discussion' WHERE "post_type" = 'post'`;
  });
  await step("23. post_community_type_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "post_community_type_idx" ON "post" ("community_id", "post_type")`;
  });
  await step("24. post_community_pinned_idx...", async () => {
    await sql`CREATE INDEX IF NOT EXISTS "post_community_pinned_idx" ON "post" ("community_id", "is_pinned")`;
  });

  console.log("\nMigration 010 completed successfully.\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("\nMigration failed:", err.message);
  console.error(err);
  process.exit(1);
});
