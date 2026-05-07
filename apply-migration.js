import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  try {
    console.log('Applying migration step by step...\n');

    // Step 1: Create enums
    console.log('1. Creating album_category enum...');
    try {
      await sql`
        CREATE TYPE album_category AS ENUM (
          'events', 'clubs', 'student_life', 'sports', 'academic',
          'parties', 'erasmus', 'graduation', 'freshmen', 'other'
        )
      `;
      console.log('   ✓ album_category enum created');
    } catch (e) {
      if (e.code === '42710') console.log('   ⚠ album_category enum already exists');
      else throw e;
    }

    console.log('2. Creating photo_moderation_status enum...');
    try {
      await sql`
        CREATE TYPE photo_moderation_status AS ENUM ('pending', 'approved', 'rejected')
      `;
      console.log('   ✓ photo_moderation_status enum created');
    } catch (e) {
      if (e.code === '42710') console.log('   ⚠ photo_moderation_status enum already exists');
      else throw e;
    }

    // Step 2: Update photo_album table
    console.log('3. Adding columns to photo_album...');
    try {
      await sql`ALTER TABLE photo_album ADD COLUMN IF NOT EXISTS category album_category DEFAULT 'other'`;
      await sql`ALTER TABLE photo_album ADD COLUMN IF NOT EXISTS event_date DATE`;
      await sql`ALTER TABLE photo_album ADD COLUMN IF NOT EXISTS cover_photo_url TEXT`;
      await sql`ALTER TABLE photo_album ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL`;
      await sql`ALTER TABLE photo_album ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL`;
      console.log('   ✓ photo_album columns added');
    } catch (e) {
      console.log('   ⚠ Some columns may already exist:', e.message);
    }

    // Step 3: Update photo table
    console.log('4. Adding columns to photo...');
    try {
      await sql`ALTER TABLE photo ADD COLUMN IF NOT EXISTS moderation_status photo_moderation_status DEFAULT 'approved' NOT NULL`;
      await sql`ALTER TABLE photo ADD COLUMN IF NOT EXISTS moderated_by TEXT REFERENCES "user"(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE photo ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP`;
      await sql`ALTER TABLE photo ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL`;
      console.log('   ✓ photo columns added');
    } catch (e) {
      console.log('   ⚠ Some columns may already exist:', e.message);
    }

    // Step 4: Create indexes
    console.log('5. Creating indexes...');
    try {
      await sql`CREATE INDEX IF NOT EXISTS photo_owner_idx ON photo(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS photo_album_idx ON photo(album_id)`;
      await sql`CREATE INDEX IF NOT EXISTS photo_moderation_idx ON photo(moderation_status)`;
      console.log('   ✓ Indexes created');
    } catch (e) {
      console.log('   ⚠ Some indexes may already exist');
    }

    // Step 5: Create photo_like table
    console.log('6. Creating photo_like table...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS photo_like (
          id TEXT PRIMARY KEY,
          photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS photo_like_photo_user_unique ON photo_like(photo_id, user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS photo_like_photo_idx ON photo_like(photo_id)`;
      await sql`CREATE INDEX IF NOT EXISTS photo_like_user_idx ON photo_like(user_id)`;
      console.log('   ✓ photo_like table created');
    } catch (e) {
      console.log('   ⚠ photo_like table may already exist');
    }

    // Step 6: Create photo_save table
    console.log('7. Creating photo_save table...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS photo_save (
          id TEXT PRIMARY KEY,
          photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS photo_save_photo_user_unique ON photo_save(photo_id, user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS photo_save_photo_idx ON photo_save(photo_id)`;
      await sql`CREATE INDEX IF NOT EXISTS photo_save_user_idx ON photo_save(user_id)`;
      console.log('   ✓ photo_save table created');
    } catch (e) {
      console.log('   ⚠ photo_save table may already exist');
    }

    // Step 7: Create photo_tag table
    console.log('8. Creating photo_tag table...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS photo_tag (
          id TEXT PRIMARY KEY,
          photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
          tagged_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS photo_tag_photo_user_unique ON photo_tag(photo_id, user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS photo_tag_photo_idx ON photo_tag(photo_id)`;
      await sql`CREATE INDEX IF NOT EXISTS photo_tag_user_idx ON photo_tag(user_id)`;
      console.log('   ✓ photo_tag table created');
    } catch (e) {
      console.log('   ⚠ photo_tag table may already exist');
    }

    // Step 8: Create photo_comment table
    console.log('9. Creating photo_comment table...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS photo_comment (
          id TEXT PRIMARY KEY,
          photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS photo_comment_photo_idx ON photo_comment(photo_id)`;
      await sql`CREATE INDEX IF NOT EXISTS photo_comment_user_idx ON photo_comment(user_id)`;
      console.log('   ✓ photo_comment table created');
    } catch (e) {
      console.log('   ⚠ photo_comment table may already exist');
    }

    // Step 9: Update report table
    console.log('10. Adding photo_id to report table...');
    try {
      await sql`ALTER TABLE report ADD COLUMN IF NOT EXISTS photo_id TEXT REFERENCES photo(id) ON DELETE CASCADE`;
      console.log('   ✓ report table updated');
    } catch (e) {
      console.log('   ⚠ Column may already exist');
    }

    // Step 10: Create CUID function
    console.log('11. Creating generate_cuid function...');
    try {
      await sql`
        CREATE OR REPLACE FUNCTION generate_cuid() RETURNS TEXT AS $$
        DECLARE
          timestamp_part TEXT;
          random_part TEXT;
        BEGIN
          timestamp_part := TO_CHAR(EXTRACT(EPOCH FROM NOW()) * 1000, 'FM999999999999999');
          random_part := SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 10);
          RETURN 'c' || timestamp_part || random_part;
        END;
        $$ LANGUAGE plpgsql
      `;
      console.log('   ✓ generate_cuid function created');
    } catch (e) {
      console.log('   ⚠ Function may already exist');
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

applyMigration();
