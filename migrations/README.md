# Database Migrations

This directory contains SQL migration files for the UFAR Network database.

## Migration Files

- `006_add_photo_features.sql` - Adds photo features (likes, saves, tags, comments, moderation)

## How to Apply Migrations

### Using Drizzle Kit (Recommended)

```bash
npm run db:push
```

### Manual Application

If you need to apply migrations manually:

```bash
# Connect to your database
psql -U your_username -d your_database

# Run the migration
\i migrations/006_add_photo_features.sql
```

## Notes

- Always backup your database before applying migrations
- Migrations should be applied in order
- The photo features migration adds new tables and columns for the enhanced photo section
