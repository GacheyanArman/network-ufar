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
  console.log('Applying migration 007_campus_moments...\n');

  // ----- Enums -----
  await step('1. user_role enum...', async () => {
    await sql`CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin')`;
  });
  await step('2. photo_tag_status enum...', async () => {
    await sql`CREATE TYPE photo_tag_status AS ENUM ('pending', 'approved', 'rejected')`;
  });

  // ----- User role -----
  await step('3. user.role column...', async () => {
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user' NOT NULL`;
  });

  // ----- Photo enrichment -----
  await step('4. photo.location...', async () => {
    await sql`ALTER TABLE photo ADD COLUMN IF NOT EXISTS location TEXT`;
  });
  await step('5. photo.likes_count...', async () => {
    await sql`ALTER TABLE photo ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL`;
  });
  await step('6. photo.comments_count...', async () => {
    await sql`ALTER TABLE photo ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0 NOT NULL`;
  });
  await step('7. photo.event_id...', async () => {
    await sql`ALTER TABLE photo ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES "event"(id) ON DELETE SET NULL`;
  });
  await step('8. photo_event_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS photo_event_idx ON photo(event_id)`;
  });
  await step('9. photo_created_at_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS photo_created_at_idx ON photo(created_at)`;
  });

  // ----- Album <-> Event -----
  await step('10. photo_album.event_id...', async () => {
    await sql`ALTER TABLE photo_album ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES "event"(id) ON DELETE SET NULL`;
  });
  await step('11. photo_album_event_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS photo_album_event_idx ON photo_album(event_id)`;
  });

  // ----- Tag status -----
  await step('12. photo_tag.status...', async () => {
    await sql`ALTER TABLE photo_tag ADD COLUMN IF NOT EXISTS status photo_tag_status DEFAULT 'pending' NOT NULL`;
  });

  // ----- Hashtags -----
  await step('13. hashtag table...', async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS hashtag (
        id TEXT PRIMARY KEY,
        tag TEXT NOT NULL,
        usage_count INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step('14. hashtag_tag_unique idx...', async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS hashtag_tag_unique ON hashtag(tag)`;
  });
  await step('15. hashtag_usage_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS hashtag_usage_idx ON hashtag(usage_count)`;
  });

  await step('16. photo_hashtag table...', async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS photo_hashtag (
        id TEXT PRIMARY KEY,
        photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
        hashtag_id TEXT NOT NULL REFERENCES hashtag(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step('17. photo_hashtag_unique idx...', async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS photo_hashtag_unique ON photo_hashtag(photo_id, hashtag_id)`;
  });
  await step('18. photo_hashtag_photo_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS photo_hashtag_photo_idx ON photo_hashtag(photo_id)`;
  });
  await step('19. photo_hashtag_hashtag_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS photo_hashtag_hashtag_idx ON photo_hashtag(hashtag_id)`;
  });

  // ----- Stories -----
  await step('20. story table...', async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS story (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption TEXT,
        location TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step('21. story_owner_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS story_owner_idx ON story(owner_id)`;
  });
  await step('22. story_expires_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS story_expires_idx ON story(expires_at)`;
  });

  await step('23. story_view table...', async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS story_view (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL REFERENCES story(id) ON DELETE CASCADE,
        viewer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
  });
  await step('24. story_view_unique idx...', async () => {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS story_view_unique ON story_view(story_id, viewer_id)`;
  });
  await step('25. story_view_story_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS story_view_story_idx ON story_view(story_id)`;
  });
  await step('26. story_view_viewer_idx...', async () => {
    await sql`CREATE INDEX IF NOT EXISTS story_view_viewer_idx ON story_view(viewer_id)`;
  });

  // ----- Backfill counters -----
  await step('27. backfill photo.likes_count...', async () => {
    await sql`
      UPDATE photo p SET likes_count = (
        SELECT COUNT(*)::int FROM photo_like pl WHERE pl.photo_id = p.id
      )
    `;
  });
  await step('28. backfill photo.comments_count...', async () => {
    await sql`
      UPDATE photo p SET comments_count = (
        SELECT COUNT(*)::int FROM photo_comment pc WHERE pc.photo_id = p.id
      )
    `;
  });

  // ----- Promote legacy tags -----
  await step('29. legacy photo_tag -> approved...', async () => {
    await sql`UPDATE photo_tag SET status = 'approved' WHERE status = 'pending'`;
  });

  console.log('\n✅ Migration 007 completed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  console.error(err);
  process.exit(1);
});
