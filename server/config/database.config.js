/**
 * Database Configuration
 * PostgreSQL/Supabase only - SQLite support removed
 *
 * DATABASE_URL 환경변수 필수
 */

const environment = process.env.NODE_ENV || "development";

/**
 * Database configuration (PostgreSQL only)
 */
const databaseConfig = {
  development: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    ssl: process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : false,
  },

  staging: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    ssl: process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : false,
  },

  production: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 20 },
    ssl: process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : false,
  },
};

// Supabase specific configuration
const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_KEY,
  directUrl: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
};

/**
 * Get current database configuration
 */
const getConfig = () => {
  const config = databaseConfig[environment] || databaseConfig.development;

  if (!config.connection) {
    throw new Error("DATABASE_URL 환경변수가 필요합니다. Supabase 또는 PostgreSQL 연결 문자열을 설정하세요.");
  }

  return {
    ...config,
    environment,
    supabase: supabaseConfig,
  };
};

/**
 * Always returns true - PostgreSQL only
 * @deprecated No longer needed, kept for backward compatibility
 */
const isPostgres = () => true;

/**
 * Always returns false - SQLite support removed
 * @deprecated No longer needed, kept for backward compatibility
 */
const isSQLite = () => false;

/**
 * Get SQL dialect helpers (PostgreSQL only)
 */
const getSQLHelpers = () => {
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
