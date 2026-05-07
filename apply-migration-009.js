import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

async function step(label, fn) {
  process.stdout.write(label + ' ');
  try {
    await fn();
    console.log('✓');
  } catch (e) {
    if (e.code === '42710' || e.code === '42701' || e.code === '42P07') {
      console.log('⚠ already exists');
    } else {
      console.log('✗');
      throw e;
    }
  }
}

async function run() {
  console.log('Applying migration 009_communities...\n');

  // ----- Enums -----
  await step('1. community_join_request_status enum...', async () => {
    await sql`CREATE TYPE community_join_request_status AS ENUM ('pending', 'approved', 'rejected')`;
  });

  // ----- Communities enrichment -----
  await step('2. community.rules...', async () => {
    await sql`ALTER TABLE community ADD COLUMN IF NOT EXISTS rules TEXT`;
  });
  await step('3. community.is_private...', async () => {
    await sql`ALTER TABLE community ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL`;
  });
  await step('4. community.faculty_tag...', async () => {
    await sql`ALTER TABLE community ADD COLUMN IF NOT EXISTS faculty_tag TEXT`;
  });
  await step('5. community.year_tag...', async () => {
    await sql`ALTER TABLE community ADD COLUMN IF NOT EXISTS year_tag TEXT`;
  });
  await step('6. community.interests...', async () => {
    await sql`ALTER TABLE community ADD COLUMN IF NOT EXISTS interests TEXT`;
  });
  await step('7. community_faculty_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS community_faculty_idx ON community(faculty_tag)`;
  });

  // ----- community_member uniqueness -----
  await step('8. community_member_unique_idx...', async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS community_member_unique_idx ON community_member(community_id, user_id)`;
  });

  // ----- community_join_request -----
  await step('9. community_join_request table...', async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS community_join_request (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL REFERENCES community(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        message TEXT,
        status community_join_request_status DEFAULT 'pending' NOT NULL,
        decided_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        decided_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step('10. community_join_request_unique_idx...', async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS community_join_request_unique_idx ON community_join_request(community_id, user_id)`;
  });
  await step('11. community_join_request_status_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS community_join_request_status_idx ON community_join_request(status)`;
  });

  // ----- Post enrichment -----
  await step('12. post.pinned_at...', async () => {
    await sql`ALTER TABLE post ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP`;
  });
  await step('13. post.pinned_by...', async () => {
    await sql`ALTER TABLE post ADD COLUMN IF NOT EXISTS pinned_by TEXT REFERENCES "user"(id) ON DELETE SET NULL`;
  });
  await step('14. post.is_solved...', async () => {
    await sql`ALTER TABLE post ADD COLUMN IF NOT EXISTS is_solved BOOLEAN DEFAULT false NOT NULL`;
  });
  await step('15. post.best_comment_id...', async () => {
    await sql`ALTER TABLE post ADD COLUMN IF NOT EXISTS best_comment_id TEXT`;
  });
  await step('16. post.solved_at...', async () => {
    await sql`ALTER TABLE post ADD COLUMN IF NOT EXISTS solved_at TIMESTAMP`;
  });

  // Migrate role: rename "admin" -> "owner" so the new spec is consistent.
  await step('17. role rename admin -> owner...', async () => {
    await sql`UPDATE community_member SET role = 'owner' WHERE role = 'admin'`;
  });

  // Migrate any "post" / "post_type='post'" rows to the new default "discussion".
  await step('18. legacy post_type "post" -> "discussion"...', async () => {
    await sql`UPDATE post SET post_type = 'discussion' WHERE post_type = 'post'`;
  });

  console.log('\n✅ Migration 009 completed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  console.error(err);
  process.exit(1);
});
