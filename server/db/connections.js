/**
 * Database Connections Manager
 * Manages connections to both overlay and streaming databases
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { initializeDatabase } = require("./init");
const { initializeStreamingDatabase } = require("./streaming-init");
const { db: dbLogger } = require("../services/logger");

// Database file paths
const OVERLAY_DB_PATH = path.resolve(__dirname, "../weflab_clone.db");
const STREAMING_DB_PATH = path.resolve(__dirname, "../streaming_data.db");

// Database instances
let overlayDb = null;
let streamingDb = null;

/**
 * Initialize both databases
 * @returns {Promise<{overlayDb: sqlite3.Database, streamingDb: sqlite3.Database}>}
 */
const initializeDatabases = async () => {
  dbLogger.info("Initializing databases...");

  // Create overlay database connection
  overlayDb = new sqlite3.Database(OVERLAY_DB_PATH, (err) => {
    if (err) {
      dbLogger.error("Failed to connect to overlay database", { error: err.message });
      throw err;
    }
    dbLogger.info("Connected to overlay database", { path: OVERLAY_DB_PATH });
  });

  // Create streaming database connection
  streamingDb = new sqlite3.Database(STREAMING_DB_PATH, (err) => {
    if (err) {
      dbLogger.error("Failed to connect to streaming database", { error: err.message });
      throw err;
    }
    dbLogger.info("Connected to streaming database", { path: STREAMING_DB_PATH });
  });

  // Initialize tables in both databases
  await Promise.all([
    initializeDatabase(overlayDb),
    initializeStreamingDatabase(streamingDb),
  ]);

  dbLogger.info("Both databases initialized successfully");

  return { overlayDb, streamingDb };
};

/**
 * Close both database connections
 * @returns {Promise<void>}
 */
const closeDatabases = () => {
  return new Promise((resolve, reject) => {
    let closed = 0;
    const total = 2;

    const checkComplete = () => {
      closed++;
      if (closed === total) {
        dbLogger.info("All database connections closed");
        resolve();
      }
    };

    if (overlayDb) {
      overlayDb.close((err) => {
        if (err) {
          dbLogger.error("Error closing overlay database", { error: err.message });
        } else {
          dbLogger.info("Overlay database connection closed");
        }
        overlayDb = null;
        checkComplete();
      });
    } else {
      checkComplete();
    }

    if (streamingDb) {
      streamingDb.close((err) => {
        if (err) {
          dbLogger.error("Error closing streaming database", { error: err.message });
        } else {
          dbLogger.info("Streaming database connection closed");
        }
        streamingDb = null;
        checkComplete();
      });
    } else {
      checkComplete();
    }
  });
};

/**
 * Get overlay database instance
 * @returns {sqlite3.Database|null}
 */
const getOverlayDb = () => overlayDb;

/**
 * Get streaming database instance
 * @returns {sqlite3.Database|null}
 */
const getStreamingDb = () => streamingDb;

module.exports = {
  initializeDatabases,
  closeDatabases,
  getOverlayDb,
  getStreamingDb,
  OVERLAY_DB_PATH,
  STREAMING_DB_PATH,
};
