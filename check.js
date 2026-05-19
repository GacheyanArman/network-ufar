require('dotenv/config');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql`SELECT * FROM audit_log LIMIT 1`
  .then(console.log)
  .catch(e => console.error(e.message));
