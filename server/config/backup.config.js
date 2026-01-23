/**
 * Backup Configuration
 * SQLite/PostgreSQL → GCS 백업 설정
 *
 * Supports both:
 * - SQLite: VACUUM INTO → gzip → GCS
 * - PostgreSQL: pg_dump → gzip → GCS (or Supabase auto-backup)
 */

const path = require("path");

// Detect database type from environment
const DATABASE_TYPE = process.env.DATABASE_TYPE || "sqlite";

const backupConfig = {
  // Database type ('sqlite' or 'postgres')
  databaseType: DATABASE_TYPE,

  // GCS 설정
  gcs: {
    bucketName: process.env.GCS_BACKUP_BUCKET || "streaming-agent-backups",
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GCS_KEY_FILE,
  },

  // PostgreSQL 설정 (Supabase)
  postgres: {
    connectionString: process.env.DATABASE_URL,
    // Supabase 자동 백업 사용 여부 (Pro 플랜)
    useSupabaseBackup: process.env.SUPABASE_AUTO_BACKUP === "true",
    // pg_dump 경로 (Cloud Run에서는 불필요할 수 있음)
    pgDumpPath: process.env.PG_DUMP_PATH || "pg_dump",
  },

  // 백업할 데이터베이스 목록 (SQLite용)
  databases: [
    {
      name: "unified",
      path: path.resolve(__dirname, "../unified.db"),
    },
  ],

  // 로컬 백업 디렉토리
  localBackupDir: path.resolve(__dirname, "../backups"),

  // 압축 설정
  compression: {
    enabled: true,
    level: 9, // gzip 최대 압축
  },

  // 스케줄 설정 (cron 형식)
  schedule: {
    // 매일 04:00 KST (19:00 UTC 전날)
    daily: "0 19 * * *",
    // 매주 일요일 04:00 KST
    weekly: "0 19 * * 0",
    // 매월 1일 04:00 KST
    monthly: "0 19 1 * *",
  },

  // 보관 정책 (일 단위)
  retention: {
    local: 1, // 로컬: 1일
    daily: 30, // 일일 백업: 30일
    weekly: 90, // 주간 백업: 90일
    monthly: 365, // 월간 백업: 365일
  },

  // 알림 설정
  notifications: {
    webhookUrl: process.env.BACKUP_WEBHOOK_URL,
    enabled: !!process.env.BACKUP_WEBHOOK_URL,
  },

  // GCS 경로 형식
  gcsPath: {
    daily: (dbName, date) => `backups/daily/${dbName}/${date}.db.gz`,
    weekly: (dbName, date) => `backups/weekly/${dbName}/${date}.db.gz`,
    monthly: (dbName, date) => `backups/monthly/${dbName}/${date}.db.gz`,
  },
};

module.exports = backupConfig;
