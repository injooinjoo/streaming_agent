/**
 * Knex Database Connection Module
 * Provides Knex-based database connection supporting both SQLite and PostgreSQL
 *
 * Usage:
 * - Development: Uses SQLite (same as before)
 * - Production: Uses PostgreSQL (via DATABASE_URL env var)
 */

const knex = require("knex");
const config = require("./knexfile");
const { db: dbLogger } = require("../services/logger");

// Determine environment
const environment = process.env.NODE_ENV || "development";

// Get configuration for current environment
const knexConfig = config[environment];

if (!knexConfig) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

// Create Knex instance
const db = knex(knexConfig);

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    await db.raw("SELECT 1");
    dbLogger.info("Database connection successful", { environment, client: knexConfig.client });
    return true;
  } catch (error) {
    dbLogger.error("Database connection failed", {
      environment,
      client: knexConfig.client,
      error: error.message,
    });
    return false;
  }
};

/**
 * Run pending migrations
 * @returns {Promise<void>}
 */
const runMigrations = async () => {
  try {
    dbLogger.info("Running database migrations...");
    const [batchNo, log] = await db.migrate.latest();

    if (log.length === 0) {
      dbLogger.info("Database already up to date");
    } else {
      dbLogger.info("Migrations complete", {
        batch: batchNo,
        migrations: log,
      });
    }
  } catch (error) {
    dbLogger.error("Migration failed", { error: error.message });
    throw error;
  }
};

/**
 * Rollback last migration batch
 * @returns {Promise<void>}
 */
const rollbackMigration = async () => {
  try {
    dbLogger.info("Rolling back last migration batch...");
    const [batchNo, log] = await db.migrate.rollback();

    dbLogger.info("Rollback complete", {
      batch: batchNo,
      migrations: log,
    });
  } catch (error) {
    dbLogger.error("Rollback failed", { error: error.message });
    throw error;
  }
};

/**
 * Get migration status
 * @returns {Promise<Object>}
 */
const getMigrationStatus = async () => {
  try {
    const [completed, pending] = await Promise.all([
      db.migrate.list().then(([completed]) => completed),
      db.migrate.list().then(([, pending]) => pending),
    ]);

    return {
      completed,
      pending,
    };
  } catch (error) {
    dbLogger.error("Failed to get migration status", { error: error.message });
    throw error;
  }
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const closeConnection = async () => {
  try {
    await db.destroy();
    dbLogger.info("Database connection closed");
  } catch (error) {
    dbLogger.error("Failed to close database connection", { error: error.message });
    throw error;
  }
};

/**
 * Check if using PostgreSQL
 * @returns {boolean}
 */
const isPostgres = () => {
  return knexConfig.client === "pg";
};

/**
 * Check if using SQLite
 * @returns {boolean}
 */
const isSQLite = () => {
  return knexConfig.client === "sqlite3";
};

module.exports = {
  db,
  testConnection,
  runMigrations,
  rollbackMigration,
  getMigrationStatus,
  closeConnection,
  isPostgres,
  isSQLite,
  environment,
};
