/**
 * Database Connections Manager
 * Unified database connection for streaming and overlay systems
 *
 * Migration from split DB:
 * - weflab_clone.db + streaming_data.db → unified.db
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { initializeUnifiedDatabase } = require("./unified-init");
const { db: dbLogger } = require("../services/logger");

// Database file paths
const UNIFIED_DB_PATH = path.resolve(__dirname, "../unified.db");

// Legacy paths (for migration reference)
const LEGACY_OVERLAY_DB_PATH = path.resolve(__dirname, "../weflab_clone.db");
const LEGACY_STREAMING_DB_PATH = path.resolve(__dirname, "../streaming_data.db");

// Database instance
let db = null;

/**
 * Initialize unified database
 * @returns {Promise<sqlite3.Database>}
 */
const initializeDatabase = async () => {
  dbLogger.info("Initializing unified database...");

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(UNIFIED_DB_PATH, async (err) => {
      if (err) {
        dbLogger.error("Failed to connect to unified database", { error: err.message });
        reject(err);
        return;
      }

      dbLogger.info("Connected to unified database", { path: UNIFIED_DB_PATH });

      try {
        await initializeUnifiedDatabase(db);
        dbLogger.info("Unified database initialized successfully");
        resolve(db);
      } catch (initErr) {
        dbLogger.error("Failed to initialize unified database tables", { error: initErr.message });
        reject(initErr);
      }
    });
  });
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          dbLogger.error("Error closing database", { error: err.message });
          reject(err);
        } else {
          dbLogger.info("Database connection closed");
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

/**
 * Get database instance
 * @returns {sqlite3.Database|null}
 */
const getDb = () => db;

/**
 * Get overlay database instance (backward compatibility alias)
 * @deprecated Use getDb() instead
 * @returns {sqlite3.Database|null}
 */
const getOverlayDb = () => db;

/**
 * Get streaming database instance (backward compatibility alias)
 * @deprecated Use getDb() instead
 * @returns {sqlite3.Database|null}
 */
const getStreamingDb = () => db;

/**
 * Initialize both databases (backward compatibility)
 * @deprecated Use initializeDatabase() instead
 * @returns {Promise<{overlayDb: sqlite3.Database, streamingDb: sqlite3.Database}>}
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

/**
 * Run database query with promise wrapper
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<any>}
 */
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

/**
 * Get single row from database
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<any>}
 */
const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Get all rows from database
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>}
 */
const getAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

module.exports = {
  // New unified API
  initializeDatabase,
  closeDatabase,
  getDb,
  runQuery,
  getOne,
  getAll,

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
