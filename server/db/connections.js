/**
 * Database Connections Manager
 * PostgreSQL/Supabase only - SQLite support removed
 *
 * Usage:
 * - All environments use PostgreSQL via DATABASE_URL
 */

const { getConfig, isPostgres, isSQLite, getSQLHelpers } = require("../config/database.config");
const { db: dbLogger } = require("../services/logger");

// Database instance
let pool = null;

/**
 * Initialize PostgreSQL database (Supabase)
 * @returns {Promise<pg.Pool>}
 */
const initializePostgres = async () => {
  const { Pool } = require("pg");
  const config = getConfig();

  if (!config.connection) {
    throw new Error("DATABASE_URL is required for PostgreSQL connection");
  }

  pool = new Pool({
    connectionString: config.connection,
    ssl: config.ssl,
    max: config.pool?.max || 20,
    min: config.pool?.min || 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Test connection
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();

    dbLogger.info("Connected to PostgreSQL database", {
      timestamp: result.rows[0].now,
      poolSize: config.pool?.max || 20,
    });

    return pool;
  } catch (err) {
    dbLogger.error("Failed to connect to PostgreSQL database", { error: err.message });
    throw err;
  }
};

/**
 * Initialize database
 * @returns {Promise<pg.Pool>}
 */
const initializeDatabase = async () => {
  const config = getConfig();

  dbLogger.info("Initializing database...", {
    environment: config.environment,
    client: config.client,
  });

  return initializePostgres();
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    dbLogger.info("PostgreSQL connection pool closed");
    pool = null;
  }
};

/**
 * Get database instance
 * @returns {pg.Pool|null}
 */
const getDb = () => pool;

/**
 * Get overlay database instance (backward compatibility alias)
 * @deprecated Use getDb() instead
 * @returns {pg.Pool|null}
 */
const getOverlayDb = () => getDb();

/**
 * Get streaming database instance (backward compatibility alias)
 * @deprecated Use getDb() instead
 * @returns {pg.Pool|null}
 */
const getStreamingDb = () => getDb();

/**
 * Initialize both databases (backward compatibility)
 * @deprecated Use initializeDatabase() instead
 * @returns {Promise<{overlayDb: any, streamingDb: any}>}
 */
const initializeDatabases = async () => {
  const database = await initializeDatabase();
  return { overlayDb: database, streamingDb: database };
};

/**
 * Close both databases (backward compatibility)
 * @deprecated Use closeDatabase() instead
 * @returns {Promise<void>}
 */
const closeDatabases = closeDatabase;

// ============================================
// Query Helper Functions (PostgreSQL)
// ============================================

/**
 * Convert SQLite-style ? placeholders to PostgreSQL-style $1, $2, etc.
 * @param {string} sql - SQL query with ? placeholders
 * @returns {string} - SQL query with $1, $2 placeholders
 */
const convertPlaceholders = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

/**
 * Run database query with promise wrapper
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<{lastID?: number, changes?: number, rowCount?: number}>}
 */
const runQuery = async (sql, params = []) => {
  const pgSql = convertPlaceholders(sql);
  const result = await pool.query(pgSql, params);
  return {
    lastID: result.rows[0]?.id,
    changes: result.rowCount,
    rowCount: result.rowCount,
  };
};

/**
 * Get single row from database
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<any>}
 */
const getOne = async (sql, params = []) => {
  const pgSql = convertPlaceholders(sql);
  const result = await pool.query(pgSql, params);
  return result.rows[0] || null;
};

/**
 * Get all rows from database
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>}
 */
const getAll = async (sql, params = []) => {
  const pgSql = convertPlaceholders(sql);
  const result = await pool.query(pgSql, params);
  return result.rows || [];
};

/**
 * Execute query with RETURNING clause
 * @param {string} sql - SQL query (should include RETURNING)
 * @param {Array} params - Query parameters
 * @returns {Promise<any>} - Returns the inserted/updated row
 */
const runReturning = async (sql, params = []) => {
  const pgSql = convertPlaceholders(sql);
  const result = await pool.query(pgSql, params);
  return result.rows[0] || null;
};

/**
 * Begin transaction
 * @returns {Promise<any>} - Transaction client
 */
const beginTransaction = async () => {
  const client = await pool.connect();
  await client.query("BEGIN");
  return client;
};

/**
 * Commit transaction
 * @param {any} client - Transaction client
 * @returns {Promise<void>}
 */
const commitTransaction = async (client) => {
  await client.query("COMMIT");
  client.release();
};

/**
 * Rollback transaction
 * @param {any} client - Transaction client
 * @returns {Promise<void>}
 */
const rollbackTransaction = async (client) => {
  await client.query("ROLLBACK");
  client.release();
};

module.exports = {
  // New unified API
  initializeDatabase,
  closeDatabase,
  getDb,
  runQuery,
  getOne,
  getAll,
  runReturning,

  // Transaction helpers
  beginTransaction,
  commitTransaction,
  rollbackTransaction,

  // SQL helpers for compatibility
  getSQLHelpers,
  isPostgres,
  isSQLite,

  // Backward compatibility
  initializeDatabases,
  closeDatabases,
  getOverlayDb,
  getStreamingDb,
};
