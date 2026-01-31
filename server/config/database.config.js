/**
 * Database Configuration
 * PostgreSQL only - DB_MODE로 로컬/Supabase 전환
 *
 * DB_MODE=local → DATABASE_URL_LOCAL 사용 (맥미니)
 * DB_MODE=supabase → DATABASE_URL_SUPABASE 사용 (Cloud Run)
 */

const environment = process.env.NODE_ENV || "development";
const dbMode = process.env.DB_MODE || "supabase";

/**
 * DB_MODE에 따라 연결 URL 반환
 */
const getConnectionUrl = () => {
  if (dbMode === "local") {
    return process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL;
  }
  return process.env.DATABASE_URL_SUPABASE || process.env.DATABASE_URL;
};

/**
 * SSL 설정 반환
 * DATABASE_SSL 환경변수로 명시적 제어 가능, 없으면 DB_MODE 기반 기본값 사용
 */
const getSSL = () => {
  if (process.env.DATABASE_SSL === "false") return false;
  if (process.env.DATABASE_SSL === "true") return { rejectUnauthorized: false };
  // 기본값: local이면 꺼짐, supabase면 켜짐
  return dbMode === "local" ? false : { rejectUnauthorized: false };
};

const connectionUrl = getConnectionUrl();
const sslConfig = getSSL();

/**
 * Database configuration (PostgreSQL only)
 */
const databaseConfig = {
  development: {
    client: "pg",
    connection: connectionUrl,
    pool: { min: 2, max: 10 },
    ssl: sslConfig,
  },

  staging: {
    client: "pg",
    connection: connectionUrl,
    pool: { min: 2, max: 10 },
    ssl: sslConfig,
  },

  production: {
    client: "pg",
    connection: connectionUrl,
    pool: { min: 2, max: 20 },
    ssl: sslConfig,
  },
};

// Supabase specific configuration
const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_KEY,
  directUrl: connectionUrl,
};

/**
 * Get current database configuration
 */
const getConfig = () => {
  const config = databaseConfig[environment] || databaseConfig.development;

  if (!config.connection) {
    throw new Error(
      dbMode === "local"
        ? "DATABASE_URL_LOCAL 환경변수가 필요합니다. 로컬 PostgreSQL 연결 문자열을 설정하세요."
        : "DATABASE_URL_SUPABASE 환경변수가 필요합니다. Supabase 연결 문자열을 설정하세요."
    );
  }

  return {
    ...config,
    environment,
    dbMode,
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
