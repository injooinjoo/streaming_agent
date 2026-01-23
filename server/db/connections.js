/**
 * Database Connections Manager
 * Supports SQLite (development) and PostgreSQL/Supabase (production)
 *
 * Usage:
 * - development: Uses SQLite (unified.db)
 * - staging/production: Uses PostgreSQL via DATABASE_URL
 */

const path = require("path");
const { getConfig, isPostgres, isSQLite, getSQLHelpers } = require("../config/database.config");
const { db: dbLogger } = require("../services/logger");

// Database instances
let db = null;
let pool = null;

// Database file paths (for SQLite)
const UNIFIED_DB_PATH = path.resolve(__dirname, "../unified.db");

// Legacy paths (for migration reference)
const LEGACY_OVERLAY_DB_PATH = path.resolve(__dirname, "../weflab_clone.db");
const LEGACY_STREAMING_DB_PATH = path.resolve(__dirname, "../streaming_data.db");

/**
 * Initialize SQLite database
 * @returns {Promise<sqlite3.Database>}
 */
const initializeSQLite = async () => {
  const sqlite3 = require("sqlite3").verbose();
  const { initializeUnifiedDatabase } = require("./unified-init");

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(UNIFIED_DB_PATH, async (err) => {
      if (err) {
        dbLogger.error("Failed to connect to SQLite database", { error: err.message });
        reject(err);
        return;
      }

      dbLogger.info("Connected to SQLite database", { path: UNIFIED_DB_PATH });

      try {
        await initializeUnifiedDatabase(db);
        dbLogger.info("SQLite database initialized successfully");
        resolve(db);
      } catch (initErr) {
        dbLogger.error("Failed to initialize SQLite tables", { error: initErr.message });
        reject(initErr);
      }
    });
  });
};

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

    // Note: Schema initialization for PostgreSQL is handled via migrations
    // Run: node server/db/migrations/001_initial_schema.sql

    return pool;
  } catch (err) {
    dbLogger.error("Failed to connect to PostgreSQL database", { error: err.message });
    throw err;
  }
};

/**
 * Initialize database based on environment
 * @returns {Promise<sqlite3.Database|pg.Pool>}
 */
const initializeDatabase = async () => {
  const config = getConfig();

  dbLogger.info("Initializing database...", {
    environment: config.environment,
    client: config.client,
  });

  if (isPostgres()) {
    return initializePostgres();
  } else {
    return initializeSQLite();
  }
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const closeDatabase = async () => {
  if (isPostgres() && pool) {
    await pool.end();
    dbLogger.info("PostgreSQL connection pool closed");
    pool = null;
  } else if (db) {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          dbLogger.error("Error closing SQLite database", { error: err.message });
          reject(err);
        } else {
          dbLogger.info("SQLite database connection closed");
          db = null;
          resolve();
        }
      });
    });
  }
};

/**
 * Get database instance
 * @returns {sqlite3.Database|pg.Pool|null}
 */
const getDb = () => (isPostgres() ? pool : db);

/**
 * Get overlay database instance (backward compatibility alias)
 * @deprecated Use getDb() instead
 * @returns {sqlite3.Database|pg.Pool|null}
 */
const getOverlayDb = () => getDb();

/**
 * Get streaming database instance (backward compatibility alias)
 * @deprecated Use getDb() instead
 * @returns {sqlite3.Database|pg.Pool|null}
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
// Query Helper Functions (Cross-DB Compatible)
// ============================================

/**
 * Run database query with promise wrapper
 * Works with both SQLite and PostgreSQL
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<{lastID?: number, changes?: number, rowCount?: number}>}
 */
const runQuery = async (sql, params = []) => {
  if (isPostgres()) {
    const result = await pool.query(sql, params);
    return {
      lastID: result.rows[0]?.id,
      changes: result.rowCount,
      rowCount: result.rowCount,
    };
  } else {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

/**
 * Get single row from database
 * Works with both SQLite and PostgreSQL
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<any>}
 */
const getOne = async (sql, params = []) => {
  if (isPostgres()) {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

/**
 * Get all rows from database
 * Works with both SQLite and PostgreSQL
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>}
 */
const getAll = async (sql, params = []) => {
  if (isPostgres()) {
    const result = await pool.query(sql, params);
    return result.rows || [];
  } else {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
};

/**
 * Execute query with RETURNING clause (PostgreSQL) or get lastID (SQLite)
 * @param {string} sql - SQL query (should include RETURNING for PostgreSQL)
 * @param {Array} params - Query parameters
 * @returns {Promise<any>} - Returns the inserted/updated row
 */
const runReturning = async (sql, params = []) => {
  if (isPostgres()) {
    // PostgreSQL: Use RETURNING clause
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  } else {
    // SQLite: Run query and fetch the row by lastID
    return new Promise((resolve, reject) => {
      db.run(sql.replace(/\s+RETURNING\s+.*/i, ""), params, function (err) {
        if (err) {
          reject(err);
          return;
        }
        const lastID = this.lastID;
        // Extract table name from INSERT statement
        const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
        if (tableMatch && lastID) {
          db.get(`SELECT * FROM ${tableMatch[1]} WHERE id = ?`, [lastID], (err2, row) => {
            if (err2) reject(err2);
            else resolve(row);
          });
        } else {
          resolve({ id: lastID, changes: this.changes });
        }
      });
    });
  }
};

/**
 * Begin transaction
 * @returns {Promise<any>} - Transaction client (PostgreSQL) or void (SQLite)
 */
const beginTransaction = async () => {
  if (isPostgres()) {
    const client = await pool.connect();
    await client.query("BEGIN");
    return client;
  } else {
    return new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });
  }
};

/**
 * Commit transaction
 * @param {any} client - Transaction client
 * @returns {Promise<void>}
 */
const commitTransaction = async (client) => {
  if (isPostgres()) {
    await client.query("COMMIT");
    client.release();
  } else {
    return new Promise((resolve, reject) => {
      db.run("COMMIT", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

/**
 * Rollback transaction
 * @param {any} client - Transaction client
 * @returns {Promise<void>}
 */
const rollbackTransaction = async (client) => {
  if (isPostgres()) {
    await client.query("ROLLBACK");
    client.release();
  } else {
    return new Promise((resolve, reject) => {
      db.run("ROLLBACK", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
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

  // SQL helpers for cross-DB compatibility
  getSQLHelpers,
  isPostgres,
  isSQLite,

  // Backward compatibility
  initializeDatabases,
  closeDatabases,
  getOverlayDb,
  getStreamingDb,

  // Paths
  UNIFIED_DB_PATH,
  LEGACY_OVERLAY_DB_PATH,
  LEGACY_STREAMING_DB_PATH,

  // Legacy path aliases
  OVERLAY_DB_PATH: LEGACY_OVERLAY_DB_PATH,
  STREAMING_DB_PATH: LEGACY_STREAMING_DB_PATH,
};
