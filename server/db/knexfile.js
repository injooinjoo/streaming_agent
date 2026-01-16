/**
 * Knex Configuration
 * Database configuration for SQLite (development) and PostgreSQL (production)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.resolve(__dirname, "../weflab_clone.db"),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, "migrations"),
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
    pool: {
      afterCreate: (conn, cb) => {
        conn.run("PRAGMA foreign_keys = ON", cb);
      },
    },
  },

  staging: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: path.join(__dirname, "migrations"),
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
  },

  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Render PostgreSQL
      },
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
  },
};
