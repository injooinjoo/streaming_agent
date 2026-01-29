/**
 * Knex Configuration
 * PostgreSQL only - SQLite support removed
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pgConfig = {
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : false,
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
