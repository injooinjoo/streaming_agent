/**
 * Database Connection Module
 * SQLite3 connection management (Phase 3에서 PostgreSQL로 마이그레이션 예정)
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "../weflab_clone.db");

// Singleton database instance
let db = null;

/**
 * Get database instance
 * @returns {sqlite3.Database}
 */
const getDb = () => {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Database connection error:", err.message);
        throw err;
      }
      console.log("Connected to SQLite database.");
    });
  }
  return db;
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const closeDb = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
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
 * Run a query with promise wrapper
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<any>}
 */
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

/**
 * Get a single row with promise wrapper
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<any>}
 */
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Get all rows with promise wrapper
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>}
 */
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = {
  getDb,
  closeDb,
  run,
  get,
  all,
};
