# Database Migrations

This project uses **Drizzle ORM** for database schema management and migrations.

## Migration Systems Overview

Historically, this project had a mix of manual SQL scripts and Drizzle-generated migrations. We have now consolidated the workflow:
1. **`src/shared/db/schema.js`** is the absolute source of truth.
2. **`drizzle/`** contains the official Drizzle-tracked migrations and the meta journal.
3. **`migrations/`** contains legacy manual SQL migrations, which have been renumbered sequentially (`001` to `013`) for historical reference and seeding.

## How to Apply Migrations

### 1. The Drizzle Way (Recommended)

Since the database is actively synced with `schema.js`, the primary method for deploying schema changes is using Drizzle Kit's push command:

```bash
npx drizzle-kit push
```
This command introspects the database and applies all necessary changes to match `schema.js` safely.

If you prefer explicit migration files (for CI/CD):
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 2. Manual SQL Scripts (Legacy & Seeding)

If you are setting up a fresh database and want to apply the legacy manual scripts (e.g., for seed data), apply them in order:

```bash
psql -U your_username -d your_database -f migrations/001_add_photo_features.sql
psql -U your_username -d your_database -f migrations/002_campus_moments.sql
# ... continue through 013_seed_communities.sql
```

**Note**: Do NOT manually apply these scripts if you are using `drizzle-kit push`, as `schema.js` already contains all schema definitions (including features introduced in these manual migrations). Applying them may cause "relation already exists" errors.
