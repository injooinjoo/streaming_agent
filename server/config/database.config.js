/**
 * Database Configuration
 * Supports SQLite (fallback) and PostgreSQL/Supabase (preferred)
 *
 * Priority: DATABASE_URL 환경변수가 있으면 PostgreSQL 사용, 없으면 SQLite 사용
 */

const path = require("path");

const environment = process.env.NODE_ENV || "development";

// DATABASE_URL이 설정되어 있으면 PostgreSQL 사용 (개발/배포 동일)
const usePostgres = !!process.env.DATABASE_URL;

/**
 * Database configuration by environment
 */
const databaseConfig = {
  // SQLite (DATABASE_URL 없을 때 폴백)
  sqlite: {
    client: "sqlite3",
    connection: {
      filename: path.resolve(__dirname, "../unified.db"),
    },
    useNullAsDefault: true,
    isSQLite: true,
    isPostgres: false,
  },

  // PostgreSQL (DATABASE_URL 있을 때 사용)
  postgres: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: environment === "production" ? 20 : 10,
    },
    ssl: process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : false,
    isSQLite: false,
    isPostgres: true,
  },

  // Legacy: environment-based config (backward compatibility)
  development: {
    client: usePostgres ? "pg" : "sqlite3",
    connection: usePostgres ? process.env.DATABASE_URL : { filename: path.resolve(__dirname, "../unified.db") },
    pool: usePostgres ? { min: 2, max: 10 } : undefined,
    ssl: usePostgres && process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : false,
    useNullAsDefault: !usePostgres,
    isSQLite: !usePostgres,
    isPostgres: usePostgres,
  },

  staging: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    ssl: process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : false,
    isSQLite: false,
    isPostgres: true,
  },

  production: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 20 },
    ssl: process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : false,
    isSQLite: false,
    isPostgres: true,
  },
};

// Supabase specific configuration (if using Supabase)
const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_KEY,
  // Direct PostgreSQL connection (recommended for server-side)
  directUrl: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
};

/**
 * Get current database configuration
 */
const getConfig = () => {
  const config = databaseConfig[environment] || databaseConfig.development;

  return {
    ...config,
    environment,
    supabase: supabaseConfig,
  };
};

/**
 * Check if using PostgreSQL
 */
const isPostgres = () => {
  const config = getConfig();
  return config.isPostgres;
};

/**
 * Check if using SQLite
 */
const isSQLite = () => {
  const config = getConfig();
  return config.isSQLite;
};

/**
 * Get SQL dialect helpers for cross-database compatibility
 */
const getSQLHelpers = () => {
  if (isPostgres()) {
    return {
      // Date/Time functions
      now: () => "NOW()",
      interval: (value, unit) => `INTERVAL '${value} ${unit}'`,
      dateSubtract: (value, unit) => `NOW() - INTERVAL '${value} ${unit}'`,
      formatDate: (column, format) => {
        // Convert strftime format to TO_CHAR format
        const pgFormat = format
          .replace("%Y", "YYYY")
          .replace("%m", "MM")
          .replace("%d", "DD")
          .replace("%H", "HH24")
          .replace("%M", "MI")
          .replace("%S", "SS");
        return `TO_CHAR(${column}, '${pgFormat}')`;
      },
      extractHour: (column) => `EXTRACT(HOUR FROM ${column})`,
      extractDow: (column) => `EXTRACT(DOW FROM ${column})`,
      extractDayOfWeek: (column) => `EXTRACT(DOW FROM ${column})::INTEGER`,
      dateOnly: (column) => `${column}::DATE`,
      toDate: (column) => `${column}::DATE`,
      epochDiff: (col1, col2) => `EXTRACT(EPOCH FROM (${col1} - ${col2}))`,
      // Auto-increment
      autoIncrement: "BIGSERIAL",
      // Upsert
      upsertConflict: (columns) => `ON CONFLICT (${columns.join(", ")}) DO UPDATE SET`,
    };
  } else {
    return {
      // SQLite Date/Time functions
      now: () => "datetime('now')",
      interval: (value, unit) => `'-${value} ${unit}'`,
      dateSubtract: (value, unit) => `datetime('now', '-${value} ${unit}')`,
      formatDate: (column, format) => {
        // Convert standard format to SQLite strftime format
        const sqliteFormat = format
          .replace("YYYY", "%Y")
          .replace("MM", "%m")
          .replace("DD", "%d")
          .replace("HH24", "%H")
          .replace("HH", "%H")
          .replace("MI", "%M")
          .replace("SS", "%S");
        return `strftime('${sqliteFormat}', ${column})`;
      },
      extractHour: (column) => `CAST(strftime('%H', ${column}) AS INTEGER)`,
      extractDow: (column) => `CAST(strftime('%w', ${column}) AS INTEGER)`,
      extractDayOfWeek: (column) => `CAST(strftime('%w', ${column}) AS INTEGER)`,
      dateOnly: (column) => `DATE(${column})`,
      toDate: (column) => `DATE(${column})`,
      epochDiff: (col1, col2) => `(julianday(${col1}) - julianday(${col2})) * 86400`,
      // Auto-increment
      autoIncrement: "INTEGER PRIMARY KEY AUTOINCREMENT",
      // Upsert (SQLite uses different syntax)
      upsertConflict: (columns) => `ON CONFLICT (${columns.join(", ")}) DO UPDATE SET`,
    };
  }
};

module.exports = {
  databaseConfig,
  supabaseConfig,
  getConfig,
  isPostgres,
  isSQLite,
  getSQLHelpers,
  environment,
};
