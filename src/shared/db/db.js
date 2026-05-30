import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@/shared/db/schema";

// Use globalThis to prevent HMR from creating multiple connections in dev.
// Same pattern as realtime.ts.
const globalForDb = globalThis;

if (!globalForDb.__ufarDb) {
  const sql = neon(process.env.DATABASE_URL);
  globalForDb.__ufarDb = drizzle(sql, { schema });
}

export const db = globalForDb.__ufarDb;