import 'dotenv/config';

/** @type { import("drizzle-kit").Config } */
const config = {
  schema: "./src/shared/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};

export default config;
