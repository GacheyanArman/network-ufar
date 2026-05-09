const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS study_year text`;
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS study_group text`;
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS interests text`;
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS languages text`;
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS looking_for text`;
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false`;
    console.log("Migration OK");
  } catch (e) {
    console.error(e);
  }
}

run();
