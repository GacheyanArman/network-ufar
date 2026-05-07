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
  console.log('Applying migration 008_messages_realtime...\n');

  // ----- Enums -----
  await step('1. message_status enum...', async () => {
    await sql`CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'seen')`;
  });

  // ----- Message enrichment -----
  await step('2. message.attachment_url...', async () => {
    await sql`ALTER TABLE message ADD COLUMN IF NOT EXISTS attachment_url TEXT`;
  });
  await step('3. message.attachment_type...', async () => {
    await sql`ALTER TABLE message ADD COLUMN IF NOT EXISTS attachment_type TEXT`;
  });
  await step('4. message.status...', async () => {
    await sql`ALTER TABLE message ADD COLUMN IF NOT EXISTS status message_status DEFAULT 'sent' NOT NULL`;
  });
  await step('5. message.read_at...', async () => {
    await sql`ALTER TABLE message ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`;
  });
  await step('6. message.edited_at...', async () => {
    await sql`ALTER TABLE message ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP`;
  });
  await step('7. message.deleted_at...', async () => {
    await sql`ALTER TABLE message ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`;
  });
  await step('8. message.deleted_for_everyone...', async () => {
    await sql`ALTER TABLE message ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false NOT NULL`;
  });

  // ----- Indexes on messages -----
  await step('9. message_receiver_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS message_receiver_idx ON message(receiver_id)`;
  });
  await step('10. message_sender_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS message_sender_idx ON message(sender_id)`;
  });
  await step('11. message_group_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS message_group_idx ON message(group_chat_id)`;
  });
  await step('12. message_created_at_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS message_created_at_idx ON message(created_at)`;
  });

  // ----- Presence -----
  await step('13. user.last_seen_at...', async () => {
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP`;
  });

  // ----- Read receipts -----
  await step('14. message_read table...', async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS message_read (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL REFERENCES message(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        read_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step('15. message_read_unique_idx...', async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS message_read_unique_idx ON message_read(message_id, user_id)`;
  });
  await step('16. message_read_user_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS message_read_user_idx ON message_read(user_id)`;
  });

  // ----- Backfill: existing read=true messages get a read_at -----
  await step('17. backfill read_at for is_read messages...', async () => {
    await sql`UPDATE message SET read_at = created_at, status = 'seen' WHERE is_read = true AND read_at IS NULL`;
  });

  console.log('\n✅ Migration 008 completed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  console.error(err);
  process.exit(1);
});
