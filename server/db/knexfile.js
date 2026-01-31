/**
 * Knex Configuration
 * PostgreSQL only - DB_MODE로 로컬/Supabase 전환
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const dbMode = process.env.DB_MODE || "supabase";
const connectionString = dbMode === "local"
  ? (process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL)
  : (process.env.DATABASE_URL_SUPABASE || process.env.DATABASE_URL);
const ssl = process.env.DATABASE_SSL === "false" ? false
  : process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false }
  : dbMode === "local" ? false : { rejectUnauthorized: false };

const pgConfig = {
  client: "pg",
  connection: {
    connectionString,
    ssl,
  },
  pool: {
    min: 2,
    max: 20,
  },
  migrations: {
    directory: path.join(__dirname, "migrations"),
  },
  seeds: {
    directory: path.join(__dirname, "seeds"),
  },
  acquireConnectionTimeout: 10000,
};

module.exports = {
  development: pgConfig,
  staging: pgConfig,
  production: pgConfig,
};
